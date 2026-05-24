import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ProfileData } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Profile Store — Local-First
// ═══════════════════════════════════════════════════════════════════════════════
// The profile is fetched once from the server and cached locally.
// Subsequent reads always come from this store — no spinners.
//
// synced: false when local changes haven't been pushed to the server yet.
// synced: true  after fetchAndMerge (Cold Start) or after a successful PUT.
//
// `synced` is NOT persisted — it always starts as false on app launch and
// transitions to true once fetchAndMerge or syncAll confirms the server match.
// ═══════════════════════════════════════════════════════════════════════════════

interface ProfileState {
  profile: ProfileData | null;
  synced: boolean;

  // ── Mutations ──────────────────────────────────────────────────────────────
  setProfile: (data: Partial<ProfileData>) => void;
  updateProfile: (data: Partial<ProfileData>) => void;
  clearProfile: () => void;
  markProfileSynced: () => void;

  // ── Hydration ──────────────────────────────────────────────────────────────
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// mapApiProfileToStore — Explicit manual mapper from backend → local store
// ═══════════════════════════════════════════════════════════════════════════════
// The backend sends snake_case keys. Although they match our local naming,
// this mapper documents the contract explicitly and guards against
// unexpected extra keys or missing values.
// ═══════════════════════════════════════════════════════════════════════════════
function toNumber(val: unknown): number | undefined {
  if (val == null) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

export function mapApiProfileToStore(apiData: any): Partial<ProfileData> {
  if (!apiData || typeof apiData !== 'object') return {};

  return {
    id: apiData.id,
    username: apiData.username,
    full_name: apiData.full_name,
    avatar_url: apiData.avatar_url,
    age: toNumber(apiData.age),
    height: toNumber(apiData.height),
    current_weight: toNumber(apiData.current_weight),
    body_fat_percentage: toNumber(apiData.body_fat_percentage),
    weight_goal: toNumber(apiData.weight_goal),
    calorie_goal: toNumber(apiData.calorie_goal),
    protein_goal: toNumber(apiData.protein_goal),
    carbs_goal: toNumber(apiData.carbs_goal),
    fats_goal: toNumber(apiData.fats_goal),
    water_goal: toNumber(apiData.water_goal),
    sleep_goal: toNumber(apiData.sleep_goal),
    rest_time_seconds: toNumber(apiData.rest_time_seconds),
  };
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      synced: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setProfile: (data) =>
        set((state) => {
          const clean = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined),
          );
          return {
            profile: state.profile ? { ...state.profile, ...clean } : (clean as ProfileData),
            synced: true,
          };
        }),

      updateProfile: (data) =>
        set((state) => {
          const clean = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined),
          );
          return {
            profile: state.profile ? { ...state.profile, ...clean } : (clean as ProfileData),
            synced: false,
          };
        }),

      clearProfile: () => set({ profile: null, synced: true }),

      markProfileSynced: () => set({ synced: true }),
    }),
    {
      name: 'gains-profile-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ profile: state.profile }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);