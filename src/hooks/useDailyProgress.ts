import { useQuery } from '@tanstack/react-query';
import { useAppDateStore } from '../store/useAppDateStore';
import { getTodayWaterProgress } from '../services/waterService';
import { getTodayNutritionProgress } from '../services/nutritionService';
import { getTodaySleep } from '../services/sleepService';

export const useWaterProgressQuery = () => {
  const date = useAppDateStore((state) => state.currentLocalDate);
  return useQuery({
    queryKey: ['waterProgress', date],
    queryFn: () => getTodayWaterProgress(date),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useNutritionProgressQuery = () => {
  const date = useAppDateStore((state) => state.currentLocalDate);
  return useQuery({
    queryKey: ['nutritionProgress', date],
    queryFn: () => getTodayNutritionProgress(date),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useSleepProgressQuery = () => {
  const date = useAppDateStore((state) => state.currentLocalDate);
  return useQuery({
    queryKey: ['sleepProgress', date],
    queryFn: () => getTodaySleep(date),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
