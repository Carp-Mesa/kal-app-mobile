import { useWaterStore } from '../store/useWaterStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useSleepStore } from '../store/useSleepStore';
import { useShadowSyncStore } from '../store/useShadowSyncStore';
import { useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Local-First Mutation Hooks
// ═══════════════════════════════════════════════════════════════════════════════
//
// These hooks write to Zustand stores SYNCHRONOUSLY.
// The UI reacts instantly — no awaiting HTTP, no isPending states.
//
// IMPORTANT: After each local write, we call enqueueSync() to notify
// the Shadow Sync Engine. This is done HERE (hooks layer) rather than
// inside the stores to avoid circular dependencies:
//   useShadowSyncStore → apiClient → useWaterStore → useShadowSyncStore  (CYCLE!)
//
// By keeping the sync notification in the hooks, the stores have zero
// knowledge of the sync engine, breaking the require cycle.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns a synchronous function to log water intake.
 * Writes directly to the local store — instant UI feedback.
 * Notifies Shadow Sync to push to the server in the background.
 */
export const useLogWater = () => {
  const addWater = useWaterStore((state) => state.addWater);

  const mutate = useCallback(
    (amount_ml: number, callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
      try {
        addWater(amount_ml);
        queueMicrotask(() => useShadowSyncStore.getState().enqueueSync());
        callbacks?.onSuccess?.();
      } catch {
        callbacks?.onError?.();
      }
    },
    [addWater],
  );

  return { mutate, isPending: false };
};

/**
 * Returns a synchronous function to log a nutrition entry.
 * Writes directly to the local store — instant UI feedback.
 * Notifies Shadow Sync to push to the server in the background.
 */
export const useLogNutrition = () => {
  const addNutrition = useNutritionStore((state) => state.addNutrition);

  const mutate = useCallback(
    (
      data: {
        meal_name: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        is_cheat_meal?: boolean;
      },
      callbacks?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        addNutrition(data);
        queueMicrotask(() => useShadowSyncStore.getState().enqueueSync());
        callbacks?.onSuccess?.();
      } catch {
        callbacks?.onError?.();
      }
    },
    [addNutrition],
  );

  return { mutate, isPending: false };
};

/**
 * Returns a synchronous function to log a sleep entry.
 * Writes directly to the local store — instant UI feedback.
 * Notifies Shadow Sync to push to the server in the background.
 */
export const useLogSleep = () => {
  const addSleep = useSleepStore((state) => state.addSleep);

  const mutate = useCallback(
    (
      data: {
        start_time: string;
        end_time: string;
        quality_score: number;
        date: string;
      },
      callbacks?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      try {
        addSleep(data);
        queueMicrotask(() => useShadowSyncStore.getState().enqueueSync());
        callbacks?.onSuccess?.();
      } catch {
        callbacks?.onError?.();
      }
    },
    [addSleep],
  );

  return { mutate, isPending: false };
};