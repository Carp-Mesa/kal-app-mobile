import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId, getLocalDateString, NutritionLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Nutrition Store — Local-First
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
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats,
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
          const localById = new Map(state.logs.map((l) => [l.id, l]));
          const merged = [...state.logs];

          for (const remote of serverLogs) {
            const local = localById.get(remote.id);
            if (!local) {
              merged.push({ ...remote, synced: true });
            } else if (local.synced) {
              const idx = merged.findIndex((l) => l.id === remote.id);
              if (idx !== -1) merged[idx] = { ...remote, synced: true };
            }
          }

          return { logs: merged };
        });
      },

      getTodayTotals: () => {
        const today = getLocalDateString();
        const todayLogs = get().logs.filter((l) => l.created_at.startsWith(today));
        return todayLogs.reduce<DailyNutritionTotals>(
          (acc, l) => ({
            calories: acc.calories + l.calories,
            protein: acc.protein + l.protein,
            carbs: acc.carbs + l.carbs,
            fats: acc.fats + l.fats,
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 },
        );
      },

      getTodayLogs: () => {
        const today = getLocalDateString();
        return get().logs.filter((l) => l.created_at.startsWith(today));
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
