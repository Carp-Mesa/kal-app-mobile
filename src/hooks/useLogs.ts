import api from '@/src/services/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useLogWater = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount_ml: number) => api.post('/water', { amount_ml }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progressToday'] });
    },
  });
};

export const useLogNutrition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { meal_name: string; calories: number; protein: number; carbs: number; fats: number; is_cheat_meal?: boolean }) => 
      api.post('/nutrition', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progressToday'] });
    },
  });
};

export const useLogSleep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { start_time: string; end_time: string; quality_score: number; date: string }) => 
      api.post('/sleep', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progressToday'] });
    },
  });
};