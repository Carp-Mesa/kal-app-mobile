import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ProfileData } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Profile Store — Local-First
// ═══════════════════════════════════════════════════════════════════════════════
// The profile is fetched once from the server and cached locally.
// Subsequent reads always come from this store — no spinners.

interface ProfileState {
  profile: ProfileData | null;

  // ── Mutations ──────────────────────────────────────────────────────────────
  setProfile: (data: ProfileData) => void;
  updateProfile: (data: Partial<ProfileData>) => void;
  clearProfile: () => void;

  // ── Hydration ──────────────────────────────────────────────────────────────
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setProfile: (data) => set({ profile: data }),

      updateProfile: (data) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...data } : data,
        })),

      clearProfile: () => set({ profile: null }),
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
