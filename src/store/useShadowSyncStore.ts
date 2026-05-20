import { create } from 'zustand';
import apiClient from '../services/apiClient';
import type { NutritionLog, SleepLog, WaterLog, WorkoutLog } from './types';
import { generateId, getLocalDateString } from './types';
import { useAuthStore } from './useAuthStore';
import { useNutritionStore } from './useNutritionStore';
import { mapApiProfileToStore, useProfileStore } from './useProfileStore';
import { useSleepStore } from './useSleepStore';
import { useWaterStore } from './useWaterStore';
import { useWorkoutStore } from './useWorkoutStore';

// ═══════════════════════════════════════════════════════════════════════════════
// Shadow Sync Engine — Silent background synchronization + Cold Start bootstrap
// ═══════════════════════════════════════════════════════════════════════════════
//
// Two responsibilities:
//
// 1. PUSH  — syncAll()        → Sends unsynced local records to the server.
// 2. PULL  — fetchAndMerge()  → Bootstraps empty stores from the server on
//                               first login (Cold Start) and merges on subsequent
//                               sessions (warm start with smart merge).
//
// Visibility: 100% silent. No loading states, no toasts, no UI involvement.
// ═══════════════════════════════════════════════════════════════════════════════

interface SyncLogEntry {
  timestamp: string;
  domain: string;
  recordId: string;
  status: 'success' | 'client_error' | 'network_error';
  message?: string;
}

interface ShadowSyncState {
  isSyncing: boolean;
  isFetching: boolean;
  pendingResync: boolean;
  lastSyncAt: string | null;
  lastFetchAt: string | null;
  debugLog: SyncLogEntry[];

  // ── Core ───────────────────────────────────────────────────────────────────
  syncAll: () => Promise<void>;
  fetchAndMerge: (force?: boolean) => Promise<void>;
  enqueueSync: () => void;

  // ── Debug ──────────────────────────────────────────────────────────────────
  getDebugLog: () => SyncLogEntry[];
  clearDebugLog: () => void;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

function addLog(entry: SyncLogEntry, state: SyncLogEntry[]): SyncLogEntry[] {
  return [entry, ...state].slice(0, 100);
}

// ─── Normalizers: convert server shapes → local SyncMeta shapes ──────────────

function normalizeWorkout(item: any): WorkoutLog {
  const exercises = (item.exercises || []).map((ex: any) => ({
    id: ex.id || generateId(),
    name: ex.name,
    sets: ex.sets || ex.exercise_sets || [],
    rpe: ex.rpe,
  }));

  return {
    id: item.id,
    name: item.name,
    date: item.date,
    duration_mins: Number(item.duration_mins) || 0,
    notes: item.notes,
    exercises,
    synced: true,
    updated_at: item.updated_at || new Date().toISOString(),
  };
}

function normalizeWater(item: any): WaterLog {
  return {
    id: item.id,
    amount_ml: Number(item.amount_ml) || 0,
    created_at: item.created_at || new Date().toISOString(),
    synced: true,
    updated_at: item.updated_at || new Date().toISOString(),
  };
}

function normalizeNutrition(item: any): NutritionLog {
  return {
    id: item.id,
    meal_name: item.meal_name || '',
    calories: Number(item.calories) || 0,
    protein: Number(item.protein) || 0,
    carbs: Number(item.carbs) || 0,
    fats: Number(item.fats) || 0,
    is_cheat_meal: item.is_cheat_meal ?? false,
    created_at: item.created_at || new Date().toISOString(),
    synced: true,
    updated_at: item.updated_at || new Date().toISOString(),
  };
}

function normalizeSleep(item: any): SleepLog {
  return {
    id: item.id,
    start_time: item.start_time,
    end_time: item.end_time,
    date: item.date,
    quality_score: Number(item.quality_score) || 3,
    synced: true,
    updated_at: item.updated_at || new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════

export const useShadowSyncStore = create<ShadowSyncState>()((set, get) => ({
  isSyncing: false,
  isFetching: false,
  pendingResync: false,
  lastSyncAt: null,
  lastFetchAt: null,
  debugLog: [],

  getDebugLog: () => get().debugLog,
  clearDebugLog: () => set({ debugLog: [] }),

  // ═══════════════════════════════════════════════════════════════════════════
  // enqueueSync — Immediately push unsynced data to the server
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Called from store mutations (addWater, addNutrition, etc.) right AFTER
  // the local state update via set(). This bridges the gap between local-only
  // writes and the sync engine, ensuring server push happens without waiting
  // for a lifecycle event (network change, app foreground, etc.).
  //
  // If a sync is already running, we set pendingResync=true and the running
  // sync will re-run itself upon completion.
  // ═══════════════════════════════════════════════════════════════════════════
  enqueueSync: () => {
    if (!useAuthStore.getState().accessToken) return;
    if (!get().isSyncing) {
      get().syncAll();
    } else {
      set({ pendingResync: true });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // syncAll — Pushes all unsynced local records to the server sequentially
  // ═══════════════════════════════════════════════════════════════════════════
  syncAll: async () => {
    if (get().isSyncing) return;

    // ── Auth Guard: no authenticated user → skip entirely ─────────────────
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      return;
    }

    set({ isSyncing: true });

    try {
      // ── 0. UPDATE_PROFILE (consolidated — if locally modified) ─────────────
      const profileState = useProfileStore.getState();
      if (!profileState.synced && profileState.profile) {
        const p = profileState.profile;
        try {
          await apiClient.put('/profile', {
            full_name: p.full_name,
            age: p.age != null ? Number(p.age) : undefined,
            height: p.height != null ? Number(p.height) : undefined,
            current_weight: p.current_weight != null ? Number(p.current_weight) : undefined,
            body_fat_percentage: p.body_fat_percentage != null ? Number(p.body_fat_percentage) : undefined,
            weight_goal: p.weight_goal != null ? Number(p.weight_goal) : undefined,
            calorie_goal: p.calorie_goal != null ? Number(p.calorie_goal) : undefined,
            protein_goal: p.protein_goal != null ? Number(p.protein_goal) : undefined,
            carbs_goal: p.carbs_goal != null ? Number(p.carbs_goal) : undefined,
            fats_goal: p.fats_goal != null ? Number(p.fats_goal) : undefined,
            water_goal: p.water_goal != null ? Number(p.water_goal) : undefined,
            sleep_goal: p.sleep_goal != null ? Number(p.sleep_goal) : undefined,
          });
          useProfileStore.getState().markProfileSynced();
          set((s) => ({
            debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'profile', recordId: 'UPDATE_PROFILE', status: 'success' }, s.debugLog),
          }));
        } catch (err: any) {
          const status = err?.response?.status;
          if (status && isClientError(status)) {
            useProfileStore.getState().markProfileSynced();
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'profile', recordId: 'UPDATE_PROFILE', status: 'client_error', message: `HTTP ${status}` }, s.debugLog) }));
          } else {
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'profile', recordId: 'UPDATE_PROFILE', status: 'network_error', message: err.message }, s.debugLog) }));
          }
        }
      }

      // ── 1. WATER ─────────────────────────────────────────────────────────
      const unsyncedWater = useWaterStore.getState().getUnsynced();
      for (const record of unsyncedWater) {
        try {
          await apiClient.post('/water', {
            id: record.id,
            amount_ml: record.amount_ml,
            created_at: record.created_at,
          });
          useWaterStore.getState().markSynced(record.id);
          set((s) => ({
            debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'water', recordId: record.id, status: 'success' }, s.debugLog),
          }));
        } catch (err: any) {
          const status = err?.response?.status;
          if (status && isClientError(status)) {
            useWaterStore.getState().markSynced(record.id);
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'water', recordId: record.id, status: 'client_error', message: `HTTP ${status}` }, s.debugLog) }));
          } else {
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'water', recordId: record.id, status: 'network_error', message: err.message }, s.debugLog) }));
            set({ isSyncing: false });
            return;
          }
        }
      }

      // ── 2. NUTRITION ─────────────────────────────────────────────────────
      const unsyncedNutrition = useNutritionStore.getState().getUnsynced();
      for (const record of unsyncedNutrition) {
        try {
          await apiClient.post('/nutrition', {
            id: record.id,
            meal_name: record.meal_name,
            calories: record.calories,
            protein: record.protein,
            carbs: record.carbs,
            fats: record.fats,
            is_cheat_meal: record.is_cheat_meal,
            created_at: record.created_at,
          });
          useNutritionStore.getState().markSynced(record.id);
          set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'nutrition', recordId: record.id, status: 'success' }, s.debugLog) }));
        } catch (err: any) {
          const status = err?.response?.status;
          if (status && isClientError(status)) {
            useNutritionStore.getState().markSynced(record.id);
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'nutrition', recordId: record.id, status: 'client_error', message: `HTTP ${status}` }, s.debugLog) }));
          } else {
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'nutrition', recordId: record.id, status: 'network_error', message: err.message }, s.debugLog) }));
            set({ isSyncing: false });
            return;
          }
        }
      }

      // ── 3. SLEEP ─────────────────────────────────────────────────────────
      const unsyncedSleep = useSleepStore.getState().getUnsynced();
      for (const record of unsyncedSleep) {
        try {
          await apiClient.post('/sleep', {
            id: record.id,
            start_time: record.start_time,
            end_time: record.end_time,
            date: record.date,
            quality_score: record.quality_score,
          });
          useSleepStore.getState().markSynced(record.id);
          set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'sleep', recordId: record.id, status: 'success' }, s.debugLog) }));
        } catch (err: any) {
          const status = err?.response?.status;
          if (status && isClientError(status)) {
            useSleepStore.getState().markSynced(record.id);
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'sleep', recordId: record.id, status: 'client_error', message: `HTTP ${status}` }, s.debugLog) }));
          } else {
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'sleep', recordId: record.id, status: 'network_error', message: err.message }, s.debugLog) }));
            set({ isSyncing: false });
            return;
          }
        }
      }

      // ── 4. WORKOUTS ──────────────────────────────────────────────────────
      const unsyncedWorkouts = useWorkoutStore.getState().getUnsynced();
      for (const record of unsyncedWorkouts) {
        try {
          await apiClient.post('/workout', {
            id: record.id,
            name: record.name,
            date: record.date,
            duration_mins: record.duration_mins,
            notes: record.notes,
            exercises: record.exercises.map((ex) => ({
              id: ex.id,
              name: ex.name,
              sets: ex.sets,
              rpe: ex.rpe,
            })),
          });
          useWorkoutStore.getState().markSynced(record.id);
          set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'workout', recordId: record.id, status: 'success' }, s.debugLog) }));
        } catch (err: any) {
          const status = err?.response?.status;
          if (status && isClientError(status)) {
            useWorkoutStore.getState().markSynced(record.id);
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'workout', recordId: record.id, status: 'client_error', message: `HTTP ${status}` }, s.debugLog) }));
          } else {
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'workout', recordId: record.id, status: 'network_error', message: err.message }, s.debugLog) }));
            set({ isSyncing: false });
            return;
          }
        }
      }

      set({ lastSyncAt: new Date().toISOString() });
    } catch (err) {
      console.error('[ShadowSync] syncAll unexpected error:', err);
    } finally {
      const shouldResync = get().pendingResync;
      set({ isSyncing: false, pendingResync: false });
      if (shouldResync) {
        get().syncAll();
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // fetchAndMerge — Pull server data and populate local stores
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // COLD START  (local store empty):   overwrite with server data → synced: true
  // WARM START  (local store has data): smart merge — keep unsynced local records,
  //                                     add server records missing locally (by id).
  //
  // `force = true` bypasses the 60s cooldown (used immediately post-login).
  // ═══════════════════════════════════════════════════════════════════════════
  fetchAndMerge: async (force = false) => {
    if (get().isFetching) return;

    // ── Auth Guard: no authenticated user → skip entirely ─────────────────
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      return;
    }

    // Cooldown: max once per 60s unless forced (e.g., post-login)
    if (!force && get().lastFetchAt) {
      const elapsed = Date.now() - new Date(get().lastFetchAt!).getTime();
      if (elapsed < 60_000) return;
    }

    set({ isFetching: true });

    try {
      // ── Fetch profile + workout history + today's logs in parallel ──────
      const today = getLocalDateString();
      const [profileRes, workoutsRes, waterRes, nutritionRes, sleepRes] = await Promise.allSettled([
        apiClient.get('/profile'),
        apiClient.get('/workout/history?limit=100&offset=0'),
        apiClient.get(`/water?date=${today}`),
        apiClient.get(`/nutrition?date=${today}`),
        apiClient.get(`/sleep?date=${today}`),
      ]);

      // ── Profile (Cold Start → overwrite; Warm → keep local) ─────────────
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const payload = profileRes.value.data?.data ?? profileRes.value.data;
        const mappedProfile = mapApiProfileToStore(payload);
        if (Object.keys(mappedProfile).length > 0) {
          useProfileStore.getState().setProfile(mappedProfile);
        }
      } else if (profileRes.status === 'rejected') {
        console.warn('[ShadowSync] fetchAndMerge: profile REJECTED', profileRes.reason?.message);
      }

      // ── Workouts — merge via idempotent store method ────────────────────────
      if (workoutsRes.status === 'fulfilled') {
        const raw = workoutsRes.value.data;
        const serverItems: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        const serverWorkouts: WorkoutLog[] = serverItems.map(normalizeWorkout);
        useWorkoutStore.getState().mergeFromServer(serverWorkouts);
      } else if (workoutsRes.status === 'rejected') {
        console.warn('[ShadowSync] fetchAndMerge: workouts REJECTED', workoutsRes.reason?.message);
      }

      // ── Water — merge today's logs ──────────────────────────────────────────
      if (waterRes.status === 'fulfilled') {
        const raw = waterRes.value.data;
        const serverItems: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        if (serverItems.length > 0) {
          const serverWater: WaterLog[] = serverItems.map(normalizeWater);
          useWaterStore.getState().mergeFromServer(serverWater);
        }
      } else if (waterRes.status === 'rejected') {
        console.warn('[ShadowSync] fetchAndMerge: water REJECTED', waterRes.reason?.message);
      }

      // ── Nutrition — merge today's logs ──────────────────────────────────────
      if (nutritionRes.status === 'fulfilled') {
        const raw = nutritionRes.value.data;
        const serverItems: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        if (serverItems.length > 0) {
          const serverNutrition: NutritionLog[] = serverItems.map(normalizeNutrition);
          useNutritionStore.getState().mergeFromServer(serverNutrition);
        }
      } else if (nutritionRes.status === 'rejected') {
        console.warn('[ShadowSync] fetchAndMerge: nutrition REJECTED', nutritionRes.reason?.message);
      }

      // ── Sleep — merge today's logs ──────────────────────────────────────────
      if (sleepRes.status === 'fulfilled') {
        const raw = sleepRes.value.data;
        const serverItems: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        if (serverItems.length > 0) {
          const serverSleep: SleepLog[] = serverItems.map(normalizeSleep);
          useSleepStore.getState().mergeFromServer(serverSleep);
        }
      } else if (sleepRes.status === 'rejected') {
        console.warn('[ShadowSync] fetchAndMerge: sleep REJECTED', sleepRes.reason?.message);
      }

      set({ lastFetchAt: new Date().toISOString() });
    } catch (err) {
      // Swallow — this is a best-effort background operation
      console.error('[ShadowSync] fetchAndMerge error (silent):', err);
    } finally {
      set({ isFetching: false });
    }
  },
}));