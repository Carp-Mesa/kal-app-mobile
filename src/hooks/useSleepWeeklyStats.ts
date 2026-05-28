import api from '@/src/services/apiClient';
import { useSleepStore } from '@/src/store/useSleepStore';
import { getLocalDateString } from '@/src/store/types';
import { useAppDateStore } from '@/src/store/useAppDateStore';
import { getWeeklyAnalytics } from '@/src/services/sleepService';
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

const fetchSleepWeeklyStats = async (date: string): Promise<SleepWeeklyStatsResponse> => {
  return getWeeklyAnalytics(date);
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
  const today = useAppDateStore((state) => state.currentLocalDate);

  const query = useQuery({
    queryKey: ['sleepWeeklyStats', today],
    queryFn: () => fetchSleepWeeklyStats(today),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Subscribe to local sleep logs — this makes the hook reactive to
  // local mutations (addSleep) BEFORE the server responds.
  const sleepLogs = useSleepStore((state) => state.logs);

  const data = useMemo(() => {
    // ── LOCAL-FIRST CALCULATOR: Generate 100% correct local analysis as fallback ──
    const parts = today.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const dayVal = parseInt(parts[2], 10);
    const baseDate = new Date(year, month, dayVal);

    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + diffToMonday);

    const datesOfWeek: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      datesOfWeek.push(dateString);
    }

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dayNamesShort = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

    const localDays: SleepDayStat[] = datesOfWeek.map((dateStr, idx) => {
      const log = sleepLogs.find((l) => {
        if (l.date === dateStr) return true;
        const d = new Date(l.start_time);
        if (isNaN(d.getTime())) return false;
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return localDate === dateStr;
      });

      if (log) {
        const diffMs = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
        const total_minutes = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
        const hours = Math.floor(total_minutes / 60);
        const minutes = total_minutes % 60;
        return {
          date: dateStr,
          day_name: dayNames[idx],
          day_name_short: dayNamesShort[idx],
          has_sleep_log: true,
          total_minutes,
          hours,
          minutes,
          quality_score: log.quality_score,
          start_time: log.start_time,
          end_time: log.end_time,
          is_goal_met: total_minutes >= 480,
        };
      } else {
        return {
          date: dateStr,
          day_name: dayNames[idx],
          day_name_short: dayNamesShort[idx],
          has_sleep_log: false,
          total_minutes: 0,
          hours: 0,
          minutes: 0,
          quality_score: null,
          start_time: null,
          end_time: null,
          is_goal_met: false,
        };
      }
    });

    const loggedDays = localDays.filter((d) => d.has_sleep_log);
    const totalDaysWithSleep = loggedDays.length;
    const avgMinutes = totalDaysWithSleep > 0
      ? Math.round(loggedDays.reduce((s, d) => s + d.total_minutes, 0) / totalDaysWithSleep)
      : 0;
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;
    const avgQuality = totalDaysWithSleep > 0
      ? Math.round(
          (loggedDays.reduce((s, d) => s + (d.quality_score ?? 0), 0) / totalDaysWithSleep) * 10
        ) / 10
      : 0;
    const daysMeetingGoal = localDays.filter((d) => d.is_goal_met).length;

    const bestQualityDayLog = loggedDays.length > 0
      ? loggedDays.reduce((best, curr) => {
          const bestQ = best.quality_score ?? 0;
          const currQ = curr.quality_score ?? 0;
          return currQ >= bestQ ? curr : best;
        }, loggedDays[0])
      : null;

    const consistency_score = Math.round((totalDaysWithSleep / 7) * 100);

    const localCalculatedData: SleepWeeklyStatsResponse = {
      weekly_summary: {
        total_days_with_sleep: totalDaysWithSleep,
        total_days_in_week: 7,
        average_duration_minutes: avgMinutes,
        average_duration_formatted: `${avgHours}h ${avgMins}m`,
        average_quality_score: avgQuality,
        days_meeting_goal: daysMeetingGoal,
        sleep_goal_minutes: 480,
        sleep_goal_hours: 8,
      },
      days: localDays,
      insights: {
        best_quality_day: bestQualityDayLog
          ? {
              date: bestQualityDayLog.date,
              day_name: bestQualityDayLog.day_name,
              quality_score: bestQualityDayLog.quality_score ?? 0,
            }
          : null,
        longest_sleep_day: null,
        shortest_sleep_day: null,
        consistency_score,
      },
    };

    // If query succeeded and has data, we can overlay today's local log on it (like original logic).
    if (query.data) {
      const todayLog = sleepLogs.find((l) => {
        if (l.date === today) return true;
        const d = new Date(l.start_time);
        if (isNaN(d.getTime())) return false;
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return localDate === today;
      });

      if (!todayLog) return query.data;

      const diffMs = new Date(todayLog.end_time).getTime() - new Date(todayLog.start_time).getTime();
      const total_minutes = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
      const hours = Math.floor(total_minutes / 60);
      const minutes = total_minutes % 60;

      const updatedDays = query.data.days.map((day) => {
        if (day.date === today) {
          if (day.has_sleep_log) return day;
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

      const todayInDays = updatedDays.some((d) => d.date === today);
      if (!todayInDays) return query.data;

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
    }

    // Fallback: fully local calculation
    return localCalculatedData;
  }, [query.data, sleepLogs, today]);

  return { ...query, data };
};
