import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
  hasSeenOnboarding: boolean;
  themeMode: 'light' | 'dark';
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  completeOnboarding: () => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      themeMode: 'dark', // default theme
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      toggleTheme: () => set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'gains-station-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);