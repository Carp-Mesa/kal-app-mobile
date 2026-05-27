import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId, getLocalDateString, isLocalDate, WaterLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Water Store — Local-First
// ═══════════════════════════════════════════════════════════════════════════════
//
// Architecture rules:
//   1. NEVER mutate state — always create new arrays via spread.
//   2. ALWAYS coerce numeric fields via Number() at write time.
//   3. Sync notification is handled by the hooks layer (useLogs.ts) to
//      avoid circular dependencies with useShadowSyncStore.
// ═══════════════════════════════════════════════════════════════════════════════

interface WaterState {
  logs: WaterLog[];

  // ── Mutations (synchronous, instant) ───────────────────────────────────────
  addWater: (amount_ml: number) => void;
  removeWater: (id: string) => void;
  clearLogs: () => void;

  // ── Sync helpers ───────────────────────────────────────────────────────────
  markSynced: (id: string) => void;
  getUnsynced: () => WaterLog[];
  mergeFromServer: (serverLogs: WaterLog[]) => void;

  // ── Computed ───────────────────────────────────────────────────────────────
  getTodayTotal: () => number;
  getTodayLogs: () => WaterLog[];

  // ── Hydration ──────────────────────────────────────────────────────────────
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set, get) => ({
      logs: [],
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // ── addWater ───────────────────────────────────────────────────────────
      addWater: (amount_ml) => {
        const now = new Date().toISOString();
        const safeAmount = Number(amount_ml) || 0;
        const entry: WaterLog = {
          id: generateId(),
          amount_ml: safeAmount,
          created_at: now,
          local_date: getLocalDateString(),
          synced: false,
          updated_at: now,
        };

        set((state) => ({ logs: [entry, ...state.logs] }));
      },

      removeWater: (id) => {
        set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));
      },

      clearLogs: () => set({ logs: [] }),

      // ── markSynced ─────────────────────────────────────────────────────────
      markSynced: (id) => {
        set((state) => ({
          logs: state.logs.map((l) => (l.id === id ? { ...l, synced: true } : l)),
        }));
      },

      // ── getUnsynced ────────────────────────────────────────────────────────
      getUnsynced: () => get().logs.filter((l) => !l.synced),

      // ── mergeFromServer ────────────────────────────────────────────────────
      mergeFromServer: (serverLogs) => {
        set((state) => {
          const currentLogs = [...state.logs];

          for (const remote of serverLogs) {
            let localIdx = currentLogs.findIndex((l) => l.id === remote.id);

            if (localIdx === -1) {
              const remoteTime = new Date(remote.created_at).getTime();
              localIdx = currentLogs.findIndex((l) => {
                const localTime = new Date(l.created_at).getTime();
                return l.amount_ml === remote.amount_ml && Math.abs(localTime - remoteTime) < 2000;
              });
              
              if (localIdx !== -1) {
                currentLogs[localIdx] = {
                  ...currentLogs[localIdx],
                  id: remote.id,
                  synced: true,
                };
              }
            }

            if (localIdx === -1) {
              currentLogs.push({ ...remote, synced: true });
            } else {
              const local = currentLogs[localIdx];
              if (local.synced) {
                const localUpdated = local.updated_at || '';
                const remoteUpdated = remote.updated_at || '';
                if (remoteUpdated > localUpdated) {
                  currentLogs[localIdx] = { ...remote, synced: true };
                }
              }
            }
          }

          // Self-healing: Deduplicate the entire array to clean up any past legacy duplicates
          const uniqueLogs: WaterLog[] = [];
          for (const log of currentLogs) {
            const time = new Date(log.created_at).getTime();
            const existingIdx = uniqueLogs.findIndex((u) => 
              u.amount_ml === log.amount_ml && 
              Math.abs(new Date(u.created_at).getTime() - time) < 2000
            );

            if (existingIdx === -1) {
              uniqueLogs.push(log);
            } else {
              if (log.synced && !uniqueLogs[existingIdx].synced) {
                uniqueLogs[existingIdx] = log;
              }
            }
          }

          uniqueLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          return { logs: uniqueLogs };
        });
      },

      // ── getTodayTotal ──────────────────────────────────────────────────────
      getTodayTotal: () => {
        const today = getLocalDateString();
        return get()
          .logs.filter((l) => isLocalDate(l.created_at, today))
          .reduce((sum, l) => sum + (Number(l.amount_ml) || 0), 0);
      },

      // ── getTodayLogs ───────────────────────────────────────────────────────
      getTodayLogs: () => {
        const today = getLocalDateString();
        return get().logs.filter((l) => isLocalDate(l.created_at, today));
      },
    }),
    {
      name: 'gains-water-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ logs: state.logs }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);