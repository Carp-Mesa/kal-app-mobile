import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId, getLocalDateString, isLocalDate, WorkoutLog, ExerciseLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Workout Store — Local-First
// ═══════════════════════════════════════════════════════════════════════════════
//
// Architecture rules:
//   1. NEVER mutate state — always create new arrays via spread.
//   2. ALWAYS coerce numeric fields via Number() at write time.
//   3. Sync notification is handled by the caller (new.tsx) to
//      avoid circular dependencies with useShadowSyncStore.
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
          duration_mins: Number(data.duration_mins) || 0,
          notes: data.notes,
          exercises,
          synced: false,
          updated_at: now,
        };

        // 1. Immutable update: new array reference → guaranteed re-render
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
          const currentLogs = [...state.logs];

          for (const remote of serverLogs) {
            let localIdx = currentLogs.findIndex((l) => l.id === remote.id);

            if (localIdx === -1) {
              // Search by duplicate content: same name, date, and duration_mins
              localIdx = currentLogs.findIndex((l) => 
                l.name === remote.name &&
                l.date === remote.date &&
                l.duration_mins === remote.duration_mins
              );
              
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
          const uniqueLogs: WorkoutLog[] = [];
          for (const log of currentLogs) {
            const existingIdx = uniqueLogs.findIndex((u) => 
              u.name === log.name &&
              u.date === log.date &&
              u.duration_mins === log.duration_mins
            );

            if (existingIdx === -1) {
              uniqueLogs.push(log);
            } else {
              if (log.synced && !uniqueLogs[existingIdx].synced) {
                uniqueLogs[existingIdx] = log;
              }
            }
          }

          uniqueLogs.sort((a, b) => b.date.localeCompare(a.date));

          return { logs: uniqueLogs };
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