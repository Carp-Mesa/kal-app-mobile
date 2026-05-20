import { useMemo } from 'react';
import { getLocalDateString, isLocalDate } from '../store/types';
import { useSleepStore } from '../store/useSleepStore';

// ═══════════════════════════════════════════════════════════════════════════════
// Local-First Sleep Hook
// ═══════════════════════════════════════════════════════════════════════════════
// Reads directly from the persisted local store — no HTTP, no loading states.
// IMPORTANT: Never call store methods (getTodaySleep) inside a selector —
// they create new object references every render, causing infinite loops.
// Instead, select the raw array and derive values with useMemo.
// ═══════════════════════════════════════════════════════════════════════════════

export const useTodaySleep = () => {
  const sleepLogs = useSleepStore((state) => state.logs);
  const today = getLocalDateString();

  const sleepData = useMemo(() => {
    const log = sleepLogs.find((l) => l.date === today || isLocalDate(l.start_time, today));
    if (!log) return null;
    const diffMs = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
    const total_minutes = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
    return {
      ...log,
      duration: {
        hours: Math.floor(total_minutes / 60),
        minutes: total_minutes % 60,
        total_minutes,
      },
    };
  }, [sleepLogs, today]);

  return { data: sleepData };
};
