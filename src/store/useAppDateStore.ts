import { create } from 'zustand';
import { getLocalDateString } from '../utils/date';

interface AppDateState {
  currentLocalDate: string;
  setCurrentLocalDate: (date: string) => void;
}

export const useAppDateStore = create<AppDateState>((set) => ({
  currentLocalDate: getLocalDateString(),
  setCurrentLocalDate: (date) => set({ currentLocalDate: date }),
}));
