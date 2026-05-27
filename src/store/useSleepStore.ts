import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId, getLocalDateString, isLocalDate, SleepLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Sleep Store — Local-First
// ═══════════════════════════════════════════════════════════════════════════════
//
// Architecture rules:
//   1. NEVER mutate state — always create new arrays via spread.
//   2. ALWAYS coerce numeric fields via Number() at write time.
//   3. Sync notification is handled by the hooks layer (useLogs.ts) to
//      avoid circular dependencies with useShadowSyncStore.
// ═══════════════════════════════════════════════════════════════════════════════

export interface SleepDuration {
  hours: number;
  minutes: number;
  total_minutes: number;
}

interface SleepState {
  logs: SleepLog[];

  // ── Mutations ──────────────────────────────────────────────────────────────
  addSleep: (data: {
    start_time: string;
    end_time: string;
    date: string;
    quality_score: number;
  }) => void;
  removeSleep: (id: string) => void;
  clearLogs: () => void;

  // ── Sync helpers ───────────────────────────────────────────────────────────
  markSynced: (id: string) => void;
  getUnsynced: () => SleepLog[];
  mergeFromServer: (serverLogs: SleepLog[]) => void;

  // ── Computed ───────────────────────────────────────────────────────────────
  getTodaySleep: () => (SleepLog & { duration: SleepDuration }) | null;

  // ── Hydration ──────────────────────────────────────────────────────────────
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

function calculateSleepDuration(start: string, end: string): SleepDuration {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return { hours: 0, minutes: 0, total_minutes: 0 };
  const total_minutes = Math.round(diffMs / 60000);
  return {
    hours: Math.floor(total_minutes / 60),
    minutes: total_minutes % 60,
    total_minutes,
  };
}

export const useSleepStore = create<SleepState>()(
  persist(
    (set, get) => ({
      logs: [],
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      addSleep: (data) => {
        const now = new Date().toISOString();
        const entry: SleepLog = {
          id: generateId(),
          start_time: data.start_time,
          end_time: data.end_time,
          date: data.date,
          quality_score: Number(data.quality_score) || 3,
          local_date: getLocalDateString(),
          synced: false,
          updated_at: now,
        };

        set((state) => ({ logs: [entry, ...state.logs] }));
      },

      removeSleep: (id) => {
        set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));
      },

      clearLogs: () => set({ logs: [] }),

      markSynced: (id) => {
        set((state) => ({
          logs: state.logs.map((l) => (l.id === id ? { ...l, synced: true } : l)),
        }));
      },

      getUnsynced: () => get().logs.filter((l) => !l.synced),

      mergeFromServer: (serverLogs) => {
        set((state) => {
          const mergedMap = new Map(state.logs.map((l) => [l.id, l]));

          for (const remote of serverLogs) {
            const local = mergedMap.get(remote.id);
            if (!local) {
              mergedMap.set(remote.id, { ...remote, synced: true });
            } else if (local.synced) {
              const localUpdated = local.updated_at || '';
              const remoteUpdated = remote.updated_at || '';
              if (remoteUpdated > localUpdated) {
                mergedMap.set(remote.id, { ...remote, synced: true });
              }
            }
          }

          return { logs: Array.from(mergedMap.values()) };
        });
      },

      getTodaySleep: () => {
        const today = getLocalDateString();
        const todayLog = get().logs.find((l) => l.date === today || isLocalDate(l.start_time, today));
        if (!todayLog) return null;
        return {
          ...todayLog,
          duration: calculateSleepDuration(todayLog.start_time, todayLog.end_time),
        };
      },
    }),
    {
      name: 'gains-sleep-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ logs: state.logs }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);