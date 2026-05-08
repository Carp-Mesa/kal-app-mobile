import apiClient from './apiClient';

export interface DailySummary {
  date: string;
  total_calories: number;
  calorie_goal: number;
  total_water: number;
  water_goal: number;
}

export type SummaryRange = '7d' | '30d';

export const getDailySummary = async (
  range: SummaryRange = '7d'
): Promise<DailySummary[]> => {
  const response = await apiClient.get<DailySummary[]>(
    `/history/summary?range=${range}`
  );
  return response.data;
};
