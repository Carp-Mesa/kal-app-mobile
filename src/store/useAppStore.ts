import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
  hasSeenOnboarding: boolean;
  sessionToken: string | null;
  completeOnboarding: () => void;
  setSessionToken: (token: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      sessionToken: null,
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      setSessionToken: (token) => set({ sessionToken: token }),
      logout: () => set({ sessionToken: null }),
    }),
    {
      name: 'gains-station-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);