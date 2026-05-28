import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Live Workout Store — Local-First Active Tracker
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiveSet {
  id: string;
  reps: string;
  weight_kg: string;
  completed: boolean;
  completedAt?: string; // ISO string
  restSecondsBefore?: number; // rest duration before this set was started
}

export interface LiveExercise {
  id: string;
  name: string;
  sets: LiveSet[];
  rpe: string;
}

interface RestTimerState {
  isActive: boolean;
  duration: number; // config duration in seconds
  remaining: number; // remaining seconds
  endTime?: string | null;
}

interface LiveWorkoutState {
  isActive: boolean;
  name: string;
  startTime: string | null;
  elapsedSeconds: number;
  exercises: LiveExercise[];
  notes: string;
  restTimer: RestTimerState;

  // Actions
  startWorkout: (defaultName?: string) => void;
  updateName: (name: string) => void;
  addExercise: () => void;
  updateExerciseField: (id: string, field: 'name' | 'rpe', value: string) => void;
  removeExercise: (id: string) => void;
  addSet: (exerciseId: string) => void;
  updateSetField: (exerciseId: string, setId: string, field: 'reps' | 'weight_kg', value: string) => void;
  toggleSetCompleted: (exerciseId: string, setId: string, restConfigSeconds: number) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateNotes: (notes: string) => void;
  tickSecond: () => void;
  tickRestTimer: () => void;
  startRestTimer: (duration: number) => void;
  stopRestTimer: () => void;
  generateReportNotes: () => string;
  finishWorkout: () => void;
  cancelWorkout: () => void;
}

const createEmptyLiveSet = (): LiveSet => ({
  id: generateId(),
  reps: '',
  weight_kg: '',
  completed: false,
});

const createInheritedLiveSet = (previous?: LiveSet): LiveSet => ({
  id: generateId(),
  reps: previous?.reps ?? '',
  weight_kg: previous?.weight_kg ?? '',
  completed: false,
});

const createEmptyLiveExercise = (): LiveExercise => ({
  id: generateId(),
  name: '',
  sets: [createEmptyLiveSet()],
  rpe: '',
});

export const useLiveWorkoutStore = create<LiveWorkoutState>()(
  persist(
    (set, get) => ({
      isActive: false,
      name: '',
      startTime: null,
      elapsedSeconds: 0,
      exercises: [],
      notes: '',
      restTimer: {
        isActive: false,
        duration: 90,
        remaining: 0,
        endTime: null,
      },

      startWorkout: (defaultName) => {
        set({
          isActive: true,
          name: '',
          startTime: new Date().toISOString(),
          elapsedSeconds: 0,
          exercises: [createEmptyLiveExercise()],
          notes: '',
          restTimer: {
            isActive: false,
            duration: 90,
            remaining: 0,
            endTime: null,
          },
        });
      },

      updateName: (name) => set({ name }),

      addExercise: () => {
        set((state) => ({
          exercises: [...state.exercises, createEmptyLiveExercise()],
        }));
      },

      updateExerciseField: (id, field, value) => {
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === id ? { ...ex, [field]: value } : ex
          ),
        }));
      },

      removeExercise: (id) => {
        set((state) => ({
          exercises: state.exercises.filter((ex) => ex.id !== id),
        }));
      },

      addSet: (exerciseId) => {
        set((state) => ({
          exercises: state.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            const lastSet = ex.sets[ex.sets.length - 1];
            return {
              ...ex,
              sets: [...ex.sets, createInheritedLiveSet(lastSet)],
            };
          }),
        }));
      },

      updateSetField: (exerciseId, setId, field, value) => {
        set((state) => ({
          exercises: state.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
            };
          }),
        }));
      },

      toggleSetCompleted: (exerciseId, setId, restConfigSeconds) => {
        const now = new Date();
        
        // Find completion timing to calculate resting period
        let completedSetTime: Date | null = null;
        const currentExercises = get().exercises;
        
        // Find last completed set in the entire workout to measure rest interval
        let lastCompletedAt: string | undefined;
        for (const ex of currentExercises) {
          for (const s of ex.sets) {
            if (s.completed && s.completedAt) {
              if (!lastCompletedAt || s.completedAt > lastCompletedAt) {
                lastCompletedAt = s.completedAt;
              }
            }
          }
        }

        set((state) => {
          let shouldTriggerRest = false;

          const updatedExercises = state.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            
            return {
              ...ex,
              sets: ex.sets.map((s) => {
                if (s.id !== setId) return s;
                const willBeCompleted = !s.completed;
                
                let restSec: number | undefined;
                if (willBeCompleted) {
                  shouldTriggerRest = true;
                  if (lastCompletedAt) {
                    const diffMs = now.getTime() - new Date(lastCompletedAt).getTime();
                    restSec = Math.max(0, Math.round(diffMs / 1000));
                  }
                }

                return {
                  ...s,
                  completed: willBeCompleted,
                  completedAt: willBeCompleted ? now.toISOString() : undefined,
                  restSecondsBefore: restSec,
                };
              }),
            };
          });

          // If a set was newly completed, trigger rest timer
          if (shouldTriggerRest) {
            setTimeout(() => get().startRestTimer(restConfigSeconds), 50);
          }

          return { exercises: updatedExercises };
        });
      },

      removeSet: (exerciseId, setId) => {
        set((state) => ({
          exercises: state.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              sets: ex.sets.filter((s) => s.id !== setId),
            };
          }),
        }));
      },

      updateNotes: (notes) => set({ notes }),

      tickSecond: () => {
        set((state) => {
          if (!state.isActive || !state.startTime) return {};
          const diffMs = new Date().getTime() - new Date(state.startTime).getTime();
          return { elapsedSeconds: Math.max(0, Math.round(diffMs / 1000)) };
        });
      },

      tickRestTimer: () => {
        set((state) => {
          if (!state.restTimer.isActive || !state.restTimer.endTime) return {};
          const now = Date.now();
          const end = new Date(state.restTimer.endTime).getTime();
          const remaining = Math.max(0, Math.round((end - now) / 1000));
          
          if (remaining <= 0) {
            return {
              restTimer: {
                ...state.restTimer,
                isActive: false,
                remaining: 0,
                endTime: null,
              },
            };
          }
          return {
            restTimer: {
              ...state.restTimer,
              remaining,
            },
          };
        });
      },

      startRestTimer: (duration) => {
        const endTime = new Date(Date.now() + duration * 1000).toISOString();
        set({
          restTimer: {
            isActive: true,
            duration,
            remaining: duration,
            endTime,
          },
        });
      },

      stopRestTimer: () => {
        set((state) => ({
          restTimer: {
            ...state.restTimer,
            isActive: false,
            remaining: 0,
            endTime: null,
          },
        }));
      },

      generateReportNotes: () => {
        const state = get();
        const lines: string[] = [];
        
        lines.push('REPORTE DE ENTRENAMIENTO EN VIVO');
        
        const totalMinutes = Math.round(state.elapsedSeconds / 60);
        lines.push(`⏱️ Duración total: ${totalMinutes} min`);
        if (state.startTime) {
          const start = new Date(state.startTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
          lines.push(`📅 Hora inicio: ${start}`);
        }
        lines.push('');

        for (const ex of state.exercises) {
          const exName = ex.name.trim() || 'Ejercicio sin nombre';
          const validSets = ex.sets.filter(s => Number(s.reps) > 0);
          if (validSets.length === 0) continue;

          lines.push(`🏋️ ${exName.toUpperCase()}`);
          if (ex.rpe) {
            lines.push(`   Esfuerzo Percibido: RPE ${ex.rpe}`);
          }

          validSets.forEach((s, idx) => {
            const reps = s.reps || '0';
            const weight = s.weight_kg || '0';
            lines.push(`   • Serie ${idx + 1}: ${reps} reps x ${weight} kg`);
          });
          lines.push('');
        }

        return lines.join('\n');
      },

      finishWorkout: () => {
        set({
          isActive: false,
          startTime: null,
          elapsedSeconds: 0,
          exercises: [],
          notes: '',
          restTimer: { isActive: false, duration: 90, remaining: 0, endTime: null },
        });
      },

      cancelWorkout: () => {
        set({
          isActive: false,
          startTime: null,
          elapsedSeconds: 0,
          exercises: [],
          notes: '',
          restTimer: { isActive: false, duration: 90, remaining: 0, endTime: null },
        });
      },
    }),
    {
      name: 'gains-live-workout-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isActive: state.isActive,
        name: state.name,
        startTime: state.startTime,
        elapsedSeconds: state.elapsedSeconds,
        exercises: state.exercises,
        notes: state.notes,
        restTimer: state.restTimer,
      }),
    }
  )
);
