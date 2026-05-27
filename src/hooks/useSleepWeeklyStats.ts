import api from '@/src/services/apiClient';
import { useSleepStore } from '@/src/store/useSleepStore';
import { getLocalDateString } from '@/src/store/types';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

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

/**
 * Returns weekly sleep analytics.
 *
 * The hook fetches data from the server but also subscribes to the local
 * sleep store.  When the user registers today's sleep, the local logs
 * array changes immediately.  We overlay any local-only today entry on
 * top of the server data so the Dashboard chart updates INSTANTLY,
 * without waiting for the server round-trip.
 */
export const useSleepWeeklyStats = () => {
  const query = useQuery({
    queryKey: ['sleepWeeklyStats'],
    queryFn: fetchSleepWeeklyStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Subscribe to local sleep logs — this makes the hook reactive to
  // local mutations (addSleep) BEFORE the server responds.
  const sleepLogs = useSleepStore((state) => state.logs);

  const data = useMemo(() => {
    if (!query.data) return query.data;

    const today = getLocalDateString();
    const todayLog = sleepLogs.find((l) => {
      if (l.date === today) return true;
      // Also check if start_time falls on today (timezone-safe)
      const d = new Date(l.start_time);
      if (isNaN(d.getTime())) return false;
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return localDate === today;
    });

    // If there's no local sleep for today, or the server already has it, return server data as-is
    if (!todayLog) return query.data;

    // Calculate duration from local log
    const diffMs = new Date(todayLog.end_time).getTime() - new Date(todayLog.start_time).getTime();
    const total_minutes = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
    const hours = Math.floor(total_minutes / 60);
    const minutes = total_minutes % 60;

    // Find today's slot in the server days array and overlay local data
    const updatedDays = query.data.days.map((day) => {
      if (day.date === today) {
        // Server already has data for today and it matches — skip overlay
        if (day.has_sleep_log) return day;
        // Overlay local data onto the empty server slot
        return {
          ...day,
          has_sleep_log: true,
          total_minutes,
          hours,
          minutes,
          quality_score: todayLog.quality_score,
          start_time: todayLog.start_time,
          end_time: todayLog.end_time,
          is_goal_met: total_minutes >= (query.data.weekly_summary.sleep_goal_minutes || 480),
        };
      }
      return day;
    });

    // Check if today was already present in the days array
    const todayInDays = updatedDays.some((d) => d.date === today);

    // If today wasn't in the server's days array at all, we can't reliably
    // merge (different week ranges), so just return server data as-is.
    if (!todayInDays) return query.data;

    // Recompute summary values with the overlay
    const daysWithSleep = updatedDays.filter((d) => d.has_sleep_log);
    const totalDaysWithSleep = daysWithSleep.length;
    const avgMinutes = totalDaysWithSleep > 0
      ? Math.round(daysWithSleep.reduce((s, d) => s + d.total_minutes, 0) / totalDaysWithSleep)
      : 0;
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;
    const avgQuality = totalDaysWithSleep > 0
      ? Math.round(
          (daysWithSleep.reduce((s, d) => s + (d.quality_score ?? 0), 0) / totalDaysWithSleep) * 10
        ) / 10
      : 0;
    const daysMeetingGoal = updatedDays.filter((d) => d.is_goal_met).length;

    return {
      ...query.data,
      weekly_summary: {
        ...query.data.weekly_summary,
        total_days_with_sleep: totalDaysWithSleep,
        average_duration_minutes: avgMinutes,
        average_duration_formatted: `${avgHours}h ${avgMins}m`,
        average_quality_score: avgQuality,
        days_meeting_goal: daysMeetingGoal,
      },
      days: updatedDays,
    };
  }, [query.data, sleepLogs]);

  return { ...query, data };
};
