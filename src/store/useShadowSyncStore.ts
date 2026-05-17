import { create } from 'zustand';
import apiClient from '../services/apiClient';
import { useAuthStore } from './useAuthStore';
import { useWaterStore } from './useWaterStore';
import { useNutritionStore } from './useNutritionStore';
import { useSleepStore } from './useSleepStore';
import { useWorkoutStore } from './useWorkoutStore';
import { useProfileStore } from './useProfileStore';
import type { WaterLog, NutritionLog, SleepLog, WorkoutLog } from './types';
import { generateId } from './types';

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
  lastSyncAt: string | null;
  lastFetchAt: string | null;
  debugLog: SyncLogEntry[];

  // ── Core ───────────────────────────────────────────────────────────────────
  syncAll: () => Promise<void>;
  fetchAndMerge: (force?: boolean) => Promise<void>;

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
    duration_mins: item.duration_mins || 0,
    notes: item.notes,
    exercises,
    synced: true,
    updated_at: item.updated_at || new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════

export const useShadowSyncStore = create<ShadowSyncState>()((set, get) => ({
  isSyncing: false,
  isFetching: false,
  lastSyncAt: null,
  lastFetchAt: null,
  debugLog: [],

  getDebugLog: () => get().debugLog,
  clearDebugLog: () => set({ debugLog: [] }),

  // ═══════════════════════════════════════════════════════════════════════════
  // syncAll — Pushes all unsynced local records to the server sequentially
  // ═══════════════════════════════════════════════════════════════════════════
  syncAll: async () => {
    if (get().isSyncing) return;

    // ── Auth Guard: no authenticated user → skip entirely ─────────────────
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      console.log('🛑 [ShadowSync] syncAll cancelled: no authenticated user.');
      return;
    }

    set({ isSyncing: true });

    try {
      // ── 0. PROFILE GOALS (if locally modified) ────────────────────────────
      const profileState = useProfileStore.getState();
      if (!profileState.synced && profileState.profile) {
        const p = profileState.profile;
        try {
          await apiClient.put('/profile/goals', {
            calorie_goal: p.calorie_goal,
            protein_goal: p.protein_goal,
            carbs_goal: p.carbs_goal,
            fats_goal: p.fats_goal,
            water_goal: p.water_goal,
            weight_goal: p.weight_goal,
            full_name: p.full_name,
          });
          useProfileStore.getState().markProfileSynced();
          set((s) => ({
            debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'profile', recordId: 'goals', status: 'success' }, s.debugLog),
          }));
        } catch (err: any) {
          const status = err?.response?.status;
          if (status && isClientError(status)) {
            useProfileStore.getState().markProfileSynced();
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'profile', recordId: 'goals', status: 'client_error', message: `HTTP ${status}` }, s.debugLog) }));
          } else {
            set((s) => ({ debugLog: addLog({ timestamp: new Date().toISOString(), domain: 'profile', recordId: 'goals', status: 'network_error', message: err.message }, s.debugLog) }));
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
      console.log('[ShadowSync] syncAll unexpected error:', err);
    } finally {
      set({ isSyncing: false });
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
      console.log('🛑 [ShadowSync] fetchAndMerge cancelled: no authenticated user.');
      return;
    }

    // Cooldown: max once per 60s unless forced (e.g., post-login)
    if (!force && get().lastFetchAt) {
      const elapsed = Date.now() - new Date(get().lastFetchAt!).getTime();
      if (elapsed < 60_000) return;
    }

    set({ isFetching: true });

    try {
      // ── Fetch profile + workout history in parallel ──────────────────────
      const [profileRes, workoutsRes] = await Promise.allSettled([
        apiClient.get('/profile'),
        apiClient.get('/workout/history?limit=100&offset=0'),
      ]);

      // ── Profile (Cold Start → overwrite; Warm → keep local) ─────────────
      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        useProfileStore.getState().setProfile(profileRes.value.data);
      }

      // ── Workouts — Cold Start vs Warm Merge ──────────────────────────────
      if (workoutsRes.status === 'fulfilled') {
        const serverItems: any[] = workoutsRes.value.data?.data ?? [];
        const serverWorkouts: WorkoutLog[] = serverItems.map(normalizeWorkout);

        const localLogs = useWorkoutStore.getState().logs;

        if (localLogs.length === 0) {
          // ── COLD START: store is empty → overwrite directly ─────────────
          useWorkoutStore.setState({ logs: serverWorkouts });
        } else {
          // ── WARM MERGE: store already has data ───────────────────────────
          const localIds = new Set(localLogs.map((l) => l.id));
          const newFromServer = serverWorkouts.filter((w) => !localIds.has(w.id));

          if (newFromServer.length > 0) {
            useWorkoutStore.setState((state) => ({
              logs: [...state.logs, ...newFromServer],
            }));
          }
        }
      }

      set({ lastFetchAt: new Date().toISOString() });
    } catch (err) {
      // Swallow — this is a best-effort background operation
      console.log('[ShadowSync] fetchAndMerge error (silent):', err);
    } finally {
      set({ isFetching: false });
    }
  },
}));