import { useQuery } from '@tanstack/react-query';
import { getWorkoutDetail } from '../services/workoutService';

export const useWorkoutDetail = (id: string) => {
  return useQuery({
    queryKey: ['workoutDetail', id],
    queryFn: () => getWorkoutDetail(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};