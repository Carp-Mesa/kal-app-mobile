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
          local_date: getLocalDateString(),
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
          const currentLogs = [...state.logs];

          for (const remote of serverLogs) {
            let localIdx = currentLogs.findIndex((l) => l.id === remote.id);

            if (localIdx === -1) {
              const remoteTime = new Date(remote.created_at).getTime();
              localIdx = currentLogs.findIndex((l) => {
                const localTime = new Date(l.created_at).getTime();
                return (
                  l.meal_name === remote.meal_name &&
                  l.calories === remote.calories &&
                  Math.abs(localTime - remoteTime) < 2000
                );
              });
              
              if (localIdx !== -1) {
                currentLogs[localIdx] = {
                  ...currentLogs[localIdx],
                  id: remote.id,
                  synced: true,
                };
              }
            }

            if (localIdx === -1) {
              currentLogs.push({ ...remote, synced: true });
            } else {
              const local = currentLogs[localIdx];
              if (local.synced) {
                const localUpdated = local.updated_at || '';
                const remoteUpdated = remote.updated_at || '';
                if (remoteUpdated > localUpdated) {
                  currentLogs[localIdx] = { ...remote, synced: true };
                }
              }
            }
          }

          // Self-healing: Deduplicate the entire array to clean up any past legacy duplicates
          const uniqueLogs: NutritionLog[] = [];
          for (const log of currentLogs) {
            const time = new Date(log.created_at).getTime();
            const existingIdx = uniqueLogs.findIndex((u) => 
              u.meal_name === log.meal_name &&
              u.calories === log.calories &&
              Math.abs(new Date(u.created_at).getTime() - time) < 2000
            );

            if (existingIdx === -1) {
              uniqueLogs.push(log);
            } else {
              if (log.synced && !uniqueLogs[existingIdx].synced) {
                uniqueLogs[existingIdx] = log;
              }
            }
          }

          uniqueLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          return { logs: uniqueLogs };
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