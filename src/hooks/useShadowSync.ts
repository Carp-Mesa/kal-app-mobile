import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useShadowSyncStore } from '../store/useShadowSyncStore';

// ═══════════════════════════════════════════════════════════════════════════════
// useShadowSync — Global listener for automatic background sync
// ═══════════════════════════════════════════════════════════════════════════════
//
// Mount this hook ONCE at the root level (_layout.tsx).
// It listens to:
//   1. Network connectivity changes (NetInfo)
//   2. App returning to foreground (AppState)
//
// Both triggers fire `syncAll()` silently — no UI involvement.
// ═══════════════════════════════════════════════════════════════════════════════

export function useShadowSync() {
  const syncAll = useShadowSyncStore((s) => s.syncAll);
  const fetchAndMerge = useShadowSyncStore((s) => s.fetchAndMerge);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // ── 1. Network Connectivity Listener ──────────────────────────────────
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      // Only fire when actually connected — not on every NetInfo update
      if (state.isConnected && state.isInternetReachable !== false) {
        syncAll(); // Push pending unsynced records silently
      }
    });

    // ── 2. AppState Listener (background → foreground) ───────────────────
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App returned to foreground — sync + fetch profile silently
        NetInfo.fetch().then((state) => {
          if (state.isConnected) {
            syncAll();
            fetchAndMerge(); // Fetch profile (rate-limited to 60s internally)
          }
        });
      }
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // ── 3. Initial sync on mount (2s delay to let stores hydrate) ────────
    const initialTimeout = setTimeout(() => {
      NetInfo.fetch().then((state) => {
        if (state.isConnected) {
          syncAll();
        }
      });
    }, 2000);

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
      clearTimeout(initialTimeout);
    };
  }, [syncAll, fetchAndMerge]);
}
