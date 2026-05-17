import { useSleepStore } from '../store/useSleepStore';

// ═══════════════════════════════════════════════════════════════════════════════
// Local-First Sleep Hook
// ═══════════════════════════════════════════════════════════════════════════════
// Reads directly from the persisted local store — no HTTP, no loading states.

export const useTodaySleep = () => {
  const sleepData = useSleepStore((state) => state.getTodaySleep());
  return { data: sleepData };
};
