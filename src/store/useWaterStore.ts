import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId, getLocalDateString, WaterLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Water Store — Local-First
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
        const entry: WaterLog = {
          id: generateId(),
          amount_ml,
          created_at: now,
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
          const mergedMap = new Map(state.logs.map((l) => [l.id, l]));

          for (const remote of serverLogs) {
            const local = mergedMap.get(remote.id);
            if (!local) {
              mergedMap.set(remote.id, { ...remote, synced: true });
            } else if (local.synced) {
              mergedMap.set(remote.id, { ...remote, synced: true });
            }
          }

          return { logs: Array.from(mergedMap.values()) };
        });
      },

      // ── getTodayTotal ──────────────────────────────────────────────────────
      getTodayTotal: () => {
        const today = getLocalDateString();
        return get()
          .logs.filter((l) => l.created_at.startsWith(today))
          .reduce((sum, l) => sum + l.amount_ml, 0);
      },

      // ── getTodayLogs ───────────────────────────────────────────────────────
      getTodayLogs: () => {
        const today = getLocalDateString();
        return get().logs.filter((l) => l.created_at.startsWith(today));
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
