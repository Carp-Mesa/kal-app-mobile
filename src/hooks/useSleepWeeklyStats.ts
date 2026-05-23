import api from '@/src/services/apiClient';
import { useQuery } from '@tanstack/react-query';

export interface SleepDayStat {
  date: string;
  day_name: string;
  day_name_short: string;
  has_sleep_log: boolean;
  total_minutes: number;
  hours: number;
  minutes: number;
  quality_score: number | null;
  start_time: string | null;
  end_time: string | null;
  is_goal_met: boolean;
}

export interface SleepWeeklyStatsResponse {
  weekly_summary: {
    total_days_with_sleep: number;
    total_days_in_week: number;
    average_duration_minutes: number;
    average_duration_formatted: string;
    average_quality_score: number;
    days_meeting_goal: number;
    sleep_goal_minutes: number;
    sleep_goal_hours: number;
  };
  days: SleepDayStat[];
  insights: {
    best_quality_day: {
      date: string;
      day_name: string;
      quality_score: number;
    } | null;
    longest_sleep_day: {
      date: string;
      day_name: string;
      total_minutes: number;
      formatted: string;
    } | null;
    shortest_sleep_day: {
      date: string;
      day_name: string;
      total_minutes: number;
      formatted: string;
    } | null;
    consistency_score: number;
  };
}

const fetchSleepWeeklyStats = async (): Promise<SleepWeeklyStatsResponse> => {
  const response = await api.get<SleepWeeklyStatsResponse>('/sleep/analytics/weekly');
  return response.data;
};

export const useSleepWeeklyStats = () => {
  return useQuery({
    queryKey: ['sleepWeeklyStats'],
    queryFn: fetchSleepWeeklyStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};
