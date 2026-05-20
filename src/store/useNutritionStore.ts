import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId, getLocalDateString, isLocalDate, NutritionLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Nutrition Store — Local-First
// ═══════════════════════════════════════════════════════════════════════════════
//
// Architecture rules:
//   1. NEVER mutate state — always create new arrays via spread.
//   2. ALWAYS coerce numeric fields via Number() at write time.
//   3. Sync notification is handled by the hooks layer (useLogs.ts) to
//      avoid circular dependencies with useShadowSyncStore.
// ═══════════════════════════════════════════════════════════════════════════════

export interface DailyNutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface NutritionState {
  logs: NutritionLog[];

  // ── Mutations ──────────────────────────────────────────────────────────────
  addNutrition: (data: {
    meal_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    is_cheat_meal?: boolean;
  }) => void;
  removeNutrition: (id: string) => void;
  clearLogs: () => void;

  // ── Sync helpers ───────────────────────────────────────────────────────────
  markSynced: (id: string) => void;
  getUnsynced: () => NutritionLog[];
  mergeFromServer: (serverLogs: NutritionLog[]) => void;

  // ── Computed ───────────────────────────────────────────────────────────────
  getTodayTotals: () => DailyNutritionTotals;
  getTodayLogs: () => NutritionLog[];

  // ── Hydration ──────────────────────────────────────────────────────────────
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      logs: [],
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      addNutrition: (data) => {
        const now = new Date().toISOString();
        const entry: NutritionLog = {
          id: generateId(),
          meal_name: data.meal_name,
          calories: Number(data.calories) || 0,
          protein: Number(data.protein) || 0,
          carbs: Number(data.carbs) || 0,
          fats: Number(data.fats) || 0,
          is_cheat_meal: data.is_cheat_meal ?? false,
          created_at: now,
          synced: false,
          updated_at: now,
        };

        set((state) => ({ logs: [entry, ...state.logs] }));
      },

      removeNutrition: (id) => {
        set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));
      },

      clearLogs: () => set({ logs: [] }),

      markSynced: (id) => {
        set((state) => ({
          logs: state.logs.map((l) => (l.id === id ? { ...l, synced: true } : l)),
        }));
      },

      getUnsynced: () => get().logs.filter((l) => !l.synced),

      mergeFromServer: (serverLogs) => {
        set((state) => {
          const mergedMap = new Map(state.logs.map((l) => [l.id, l]));

          for (const remote of serverLogs) {
            const local = mergedMap.get(remote.id);
            if (!local) {
              mergedMap.set(remote.id, { ...remote, synced: true });
            } else if (local.synced) {
              const localUpdated = local.updated_at || '';
              const remoteUpdated = remote.updated_at || '';
              if (remoteUpdated > localUpdated) {
                mergedMap.set(remote.id, { ...remote, synced: true });
              }
            }
          }

          return { logs: Array.from(mergedMap.values()) };
        });
      },

      getTodayTotals: () => {
        const today = getLocalDateString();
        const todayLogs = get().logs.filter((l) => isLocalDate(l.created_at, today));
        return todayLogs.reduce<DailyNutritionTotals>(
          (acc, l) => ({
            calories: acc.calories + (Number(l.calories) || 0),
            protein: acc.protein + (Number(l.protein) || 0),
            carbs: acc.carbs + (Number(l.carbs) || 0),
            fats: acc.fats + (Number(l.fats) || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 },
        );
      },

      getTodayLogs: () => {
        const today = getLocalDateString();
        return get().logs.filter((l) => isLocalDate(l.created_at, today));
      },
    }),
    {
      name: 'gains-nutrition-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ logs: state.logs }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);