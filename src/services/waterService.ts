import apiClient from './apiClient';
import { getLocalDateString } from '../utils/date';

export interface WaterProgressResponse {
  total_ml: number;
  goal_ml: number;
  percentage: number;
}

export const getTodayWaterProgress = async (date: string = getLocalDateString()): Promise<WaterProgressResponse> => {
  const response = await apiClient.get<WaterProgressResponse>(`/water/progress/today?date=${date}`);
  return response.data;
};
