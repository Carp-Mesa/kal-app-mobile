import { useInfiniteQuery } from '@tanstack/react-query';
import { getWorkoutHistory } from '../services/workoutService';

const PAGE_LIMIT = 10;

export const useWorkoutHistory = () => {
  return useInfiniteQuery({
    queryKey: ['workoutHistory'],
    queryFn: ({ pageParam = 0 }) => getWorkoutHistory(PAGE_LIMIT, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.has_more) return undefined;
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    staleTime: 2 * 60 * 1000,
  });
};
