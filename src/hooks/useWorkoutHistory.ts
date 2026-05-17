import { useMemo } from 'react';
import { useWorkoutStore } from '../store/useWorkoutStore';

// ═══════════════════════════════════════════════════════════════════════════════
// Local-First Workout History Hook
// ═══════════════════════════════════════════════════════════════════════════════
// Reads directly from the persisted local store — no pagination needed,
// no HTTP calls, no loading states.

export const useWorkoutHistory = () => {
  const logs = useWorkoutStore((state) => state.logs);

  const pages = useMemo(() => {
    const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    return [{ data: sorted, pagination: { total: sorted.length, limit: sorted.length, offset: 0, has_more: false } }];
  }, [logs]);

  return {
    data: { pages },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => {},
  };
};
