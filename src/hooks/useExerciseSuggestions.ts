import { useQuery } from '@tanstack/react-query';
import { getExerciseSuggestions } from '../services/workoutService';

export const useExerciseSuggestions = () => {
  return useQuery({
    queryKey: ['exerciseSuggestions'],
    queryFn: getExerciseSuggestions,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 48,
  });
};