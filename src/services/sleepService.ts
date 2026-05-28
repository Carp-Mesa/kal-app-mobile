import apiClient from './apiClient';
import { getLocalDateString } from '../utils/date';

export interface SleepProgressResponse {
  id?: string;
  start_time?: string;
  end_time?: string;
  duration?: {
    hours: number;
    minutes: number;
    total_minutes: number;
  };
}

export const getTodaySleep = async (date: string = getLocalDateString()): Promise<SleepProgressResponse> => {
  const response = await apiClient.get<SleepProgressResponse>(`/sleep/progress/today?date=${date}`);
  return response.data;
};

export const getWeeklyAnalytics = async (date: string = getLocalDateString()): Promise<any> => {
  const response = await apiClient.get(`/sleep/analytics/weekly?date=${date}&mode=week`);
  return response.data;
};
