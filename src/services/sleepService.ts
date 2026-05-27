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

export const getTodaySleep = async (): Promise<SleepProgressResponse> => {
  const response = await apiClient.get<SleepProgressResponse>(`/sleep/progress/today?date=${getLocalDateString()}`);
  return response.data;
};
