import apiClient from './apiClient';

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
  const response = await apiClient.get<SleepProgressResponse>('/sleep/progress/today');
  return response.data;
};
