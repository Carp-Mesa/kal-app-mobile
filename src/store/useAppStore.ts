import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ModalType = 'none' | 'water' | 'nutrition' | 'sleep';

interface AppState {
  hasSeenOnboarding: boolean;
  themeMode: 'light' | 'dark';
  modalVisible: ModalType;
  triggerSaveWorkout: number;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  completeOnboarding: () => void;
  toggleTheme: () => void;
  setModalVisible: (modal: ModalType) => void;
  requestSaveWorkout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      themeMode: 'dark',
      modalVisible: 'none',
      triggerSaveWorkout: 0,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      toggleTheme: () => set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),
      setModalVisible: (modal) => set({ modalVisible: modal }),
      requestSaveWorkout: () => set((state) => ({ triggerSaveWorkout: state.triggerSaveWorkout + 1 })),
    }),
    {
      name: 'gains-station-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        themeMode: state.themeMode,
        modalVisible: state.modalVisible,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);