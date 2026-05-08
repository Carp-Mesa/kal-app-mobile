import { useQuery } from '@tanstack/react-query';
import { getDailySummary, SummaryRange } from '../services/historyService';

export const useNutritionHistory = (range: SummaryRange) => {
  return useQuery({
    queryKey: ['nutritionHistory', range],
    queryFn: () => getDailySummary(range),
    staleTime: 2 * 60 * 1000,
  });
};
