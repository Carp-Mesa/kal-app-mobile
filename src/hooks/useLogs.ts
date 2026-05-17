import { useWaterStore } from '../store/useWaterStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useSleepStore } from '../store/useSleepStore';
import { useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Local-First Mutation Hooks
// ═══════════════════════════════════════════════════════════════════════════════
//
// These hooks write to Zustand stores SYNCHRONOUSLY.
// The UI reacts instantly — no awaiting HTTP, no isPending states.
// The Shadow Sync Engine will push the data to the server in the background.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns a synchronous function to log water intake.
 * Writes directly to the local store — instant UI feedback.
 */
export const useLogWater = () => {
  const addWater = useWaterStore((state) => state.addWater);

  const mutate = useCallback(
    (amount_ml: number, callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
      try {
        addWater(amount_ml);
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
        callbacks?.onSuccess?.();
      } catch {
        callbacks?.onError?.();
      }
    },
    [addSleep],
  );

  return { mutate, isPending: false };
};