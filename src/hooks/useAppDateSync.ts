import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getLocalDateString } from '../utils/date';
import { useAppDateStore } from '../store/useAppDateStore';
import { useShadowSyncStore } from '../store/useShadowSyncStore';

/**
 * Global hook to actively synchronize currentLocalDate across the app.
 * Schedules a timer to fire exactly at midnight (00:00:00) and listens to
 * AppState transitions to ensure the date is always accurate, even if the
 * device crossed midnight while the app was in the background.
 */
export function useAppDateSync() {
  useEffect(() => {
    const { setCurrentLocalDate } = useAppDateStore.getState();

    // 1. Timer to fire exactly at midnight (00:00:00)
    const scheduleNextMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0); // Next day 00:00:00
      const msUntilMidnight = midnight.getTime() - now.getTime();

      // Fallback delay if calculation results in a non-positive delay
      const delay = msUntilMidnight > 0 ? msUntilMidnight : 1000;

      return setTimeout(() => {
        const nextDate = getLocalDateString();
        setCurrentLocalDate(nextDate);
        
        // Silently pull fresh server data for the new day
        useShadowSyncStore.getState().fetchAndMerge(true);
        
        timerRef = scheduleNextMidnight();
      }, delay);
    };

    let timerRef = scheduleNextMidnight();

    // 2. AppState listener to recalculate today's date when app is resumed
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const currentDate = getLocalDateString();
        const prevDate = useAppDateStore.getState().currentLocalDate;
        if (prevDate !== currentDate) {
          setCurrentLocalDate(currentDate);
          useShadowSyncStore.getState().fetchAndMerge(true);
        }
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      clearTimeout(timerRef);
      appStateSub.remove();
    };
  }, []);
}
