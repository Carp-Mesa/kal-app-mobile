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
export function mapApiProfileToStore(apiData: any): Partial<ProfileData> {
  if (!apiData || typeof apiData !== 'object') return {};

  return {
    id: apiData.id,
    username: apiData.username,
    full_name: apiData.full_name,
    avatar_url: apiData.avatar_url,
    age: typeof apiData.age === 'number' ? apiData.age : undefined,
    height: typeof apiData.height === 'number' ? apiData.height : undefined,
    current_weight: typeof apiData.current_weight === 'number' ? apiData.current_weight : undefined,
    body_fat_percentage: typeof apiData.body_fat_percentage === 'number' ? apiData.body_fat_percentage : undefined,
    weight_goal: typeof apiData.weight_goal === 'number' ? apiData.weight_goal : undefined,
    calorie_goal: typeof apiData.calorie_goal === 'number' ? apiData.calorie_goal : undefined,
    protein_goal: typeof apiData.protein_goal === 'number' ? apiData.protein_goal : undefined,
    carbs_goal: typeof apiData.carbs_goal === 'number' ? apiData.carbs_goal : undefined,
    fats_goal: typeof apiData.fats_goal === 'number' ? apiData.fats_goal : undefined,
    water_goal: typeof apiData.water_goal === 'number' ? apiData.water_goal : undefined,
    sleep_goal: typeof apiData.sleep_goal === 'number' ? apiData.sleep_goal : undefined,
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
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...data } : (data as ProfileData),
          synced: true,
        })),

      updateProfile: (data) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...data } : data,
          synced: false,
        })),

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