import { useWaterStore } from './useWaterStore';
import { useNutritionStore } from './useNutritionStore';
import { useSleepStore } from './useSleepStore';
import { useWorkoutStore } from './useWorkoutStore';
import { useProfileStore } from './useProfileStore';
import { useShadowSyncStore } from './useShadowSyncStore';

// ═══════════════════════════════════════════════════════════════════════════════
// clearAllStores — Logout / User Switch cleanup
// ═══════════════════════════════════════════════════════════════════════════════
//
// Call this BEFORE navigating to the login screen on logout.
// It wipes all domain stores so that a subsequent user login starts fresh
// and cannot see the previous user's data.
//
// The function is intentionally NOT a hook — it can be called from any
// non-React context (e.g., directly from a button's onPress handler or
// from the auth interceptor in apiClient.ts).
// ═══════════════════════════════════════════════════════════════════════════════

export function clearAllStores(): void {
  useWaterStore.getState().clearLogs();
  useNutritionStore.getState().clearLogs();
  useSleepStore.getState().clearLogs();
  useWorkoutStore.getState().clearLogs();
  useProfileStore.getState().clearProfile();

  // Reset the sync engine's timestamps so the next session starts fresh
  useShadowSyncStore.setState({
    isSyncing: false,
    isFetching: false,
    pendingResync: false,
    lastSyncAt: null,
    lastFetchAt: null,
    debugLog: [],
  });
}
