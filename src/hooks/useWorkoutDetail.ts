import { useWorkoutStore } from '../store/useWorkoutStore';

// ═══════════════════════════════════════════════════════════════════════════════
// Local-First Workout Detail Hook
// ═══════════════════════════════════════════════════════════════════════════════
// Reads directly from the persisted local store — instant.

export const useWorkoutDetail = (id: string) => {
  const workout = useWorkoutStore((state) => state.getWorkoutById(id));
  return {
    data: workout ?? null,
    isLoading: false,
  };
};