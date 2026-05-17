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
  setProfile: (data: ProfileData) => void;
  updateProfile: (data: Partial<ProfileData>) => void;
  clearProfile: () => void;
  markProfileSynced: () => void;

  // ── Hydration ──────────────────────────────────────────────────────────────
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      synced: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setProfile: (data) => set({ profile: data, synced: true }),

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