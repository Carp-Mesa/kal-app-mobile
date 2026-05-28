import apiClient from './apiClient';
import { getLocalDateString } from '../utils/date';

export interface NutritionProgressResponse {
  total_calories: number;
  calorie_goal: number;
  percentage: number;
  protein_total: number;
  protein_goal: number;
  carbs_total: number;
  carbs_goal: number;
  fats_total: number;
  fats_goal: number;
}

export const getTodayNutritionProgress = async (date: string = getLocalDateString()): Promise<NutritionProgressResponse> => {
  const response = await apiClient.get<NutritionProgressResponse>(`/nutrition/progress/today?date=${date}`);
  return response.data;
};
