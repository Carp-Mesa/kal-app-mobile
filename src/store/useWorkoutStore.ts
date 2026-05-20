import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId, getLocalDateString, WorkoutLog, ExerciseLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Workout Store — Local-First
// ═══════════════════════════════════════════════════════════════════════════════

interface WorkoutState {
  logs: WorkoutLog[];

  // ── Mutations ──────────────────────────────────────────────────────────────
  addWorkout: (data: {
    name: string;
    date: string;
    duration_mins: number;
    notes?: string;
    exercises: {
      name: string;
      sets: { reps: number; weight_kg: number }[];
      rpe?: number;
    }[];
  }) => void;
  removeWorkout: (id: string) => void;
  clearLogs: () => void;

  // ── Sync helpers ───────────────────────────────────────────────────────────
  markSynced: (id: string) => void;
  getUnsynced: () => WorkoutLog[];
  mergeFromServer: (serverLogs: WorkoutLog[]) => void;

  // ── Computed ───────────────────────────────────────────────────────────────
  getTodayWorkouts: () => WorkoutLog[];
  getWorkoutHistory: (limit?: number) => WorkoutLog[];
  getWorkoutById: (id: string) => WorkoutLog | undefined;

  // ── Hydration ──────────────────────────────────────────────────────────────
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      logs: [],
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      addWorkout: (data) => {
        const now = new Date().toISOString();
        const exercises: ExerciseLog[] = data.exercises.map((ex) => ({
          id: generateId(),
          name: ex.name,
          sets: ex.sets,
          rpe: ex.rpe,
        }));

        const entry: WorkoutLog = {
          id: generateId(),
          name: data.name,
          date: data.date,
          duration_mins: data.duration_mins,
          notes: data.notes,
          exercises,
          synced: false,
          updated_at: now,
        };
        set((state) => ({ logs: [entry, ...state.logs] }));
      },

      removeWorkout: (id) => {
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
              mergedMap.set(remote.id, { ...remote, synced: true });
            }
          }

          return { logs: Array.from(mergedMap.values()) };
        });
      },

      getTodayWorkouts: () => {
        const today = getLocalDateString();
        return get().logs.filter((l) => l.date === today);
      },

      getWorkoutHistory: (limit = 50) => {
        return get()
          .logs.sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);
      },

      getWorkoutById: (id) => {
        return get().logs.find((l) => l.id === id);
      },
    }),
    {
      name: 'gains-workout-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ logs: state.logs }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
