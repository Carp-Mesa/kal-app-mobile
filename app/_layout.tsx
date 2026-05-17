import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';

import { DarkTheme as AppDarkTheme, LightTheme as AppLightTheme } from '@/src/theme/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useProfileStore } from '@/src/store/useProfileStore';
import { useWorkoutStore } from '@/src/store/useWorkoutStore';
import { useWaterStore } from '@/src/store/useWaterStore';
import { useNutritionStore } from '@/src/store/useNutritionStore';
import { useSleepStore } from '@/src/store/useSleepStore';
import { useShadowSync } from '@/src/hooks/useShadowSync';
import { authService } from '@/src/services/authService';
import { jwtDecode } from 'jwt-decode';

export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const _hasHydratedAuth = useAuthStore(state => state._hasHydrated);
  const _hasHydratedApp = useAppStore(state => state._hasHydrated);
  const _hasHydratedProfile = useProfileStore(state => state._hasHydrated);
  const _hasHydratedWorkout = useWorkoutStore(state => state._hasHydrated);
  const _hasHydratedWater = useWaterStore(state => state._hasHydrated);
  const _hasHydratedNutrition = useNutritionStore(state => state._hasHydrated);
  const _hasHydratedSleep = useSleepStore(state => state._hasHydrated);

  const allStoresHydrated =
    _hasHydratedAuth &&
    _hasHydratedApp &&
    _hasHydratedProfile &&
    _hasHydratedWorkout &&
    _hasHydratedWater &&
    _hasHydratedNutrition &&
    _hasHydratedSleep;

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [isAuthReady, setIsAuthReady] = useState(false);
  const authResolved = useRef(false);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // ── Silent token refresh: verify & renew if expiring within 5 min ──────────
  useEffect(() => {
    if (!allStoresHydrated || !fontsLoaded || authResolved.current) return;

    let cancelled = false;

    const resolveAuth = async () => {
      const { accessToken, refreshToken, setTokens, clearTokens } = useAuthStore.getState();

      if (!accessToken || !refreshToken) {
        authResolved.current = true;
        if (!cancelled) setIsAuthReady(true);
        return;
      }

      try {
        const decoded = jwtDecode(accessToken);
        const currentTime = Date.now() / 1000;

        if (decoded.exp && decoded.exp < currentTime + 300) {
          const response = await authService.refreshSession(refreshToken);
          if (response.access_token) {
            setTokens(response.access_token, response.refresh_token || refreshToken);
          } else {
            clearTokens();
          }
        }
      } catch {
        clearTokens();
      }

      authResolved.current = true;
      if (!cancelled) setIsAuthReady(true);
    };

    resolveAuth();

    return () => { cancelled = true; };
  }, [allStoresHydrated, fontsLoaded]);

  // ── Release splash: only after hydration + fonts + auth are all resolved ────
  useEffect(() => {
    if (isAuthReady) {
      SplashScreen.hideAsync();
    }
  }, [isAuthReady]);

  if (!allStoresHydrated || !fontsLoaded || !isAuthReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const themeMode = useAppStore((state) => state.themeMode);
  const currentTheme = themeMode === 'dark' ? AppDarkTheme : AppLightTheme;
  const navTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;

  useShadowSync();

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={currentTheme}>
        <ThemeProvider value={navTheme}>
          <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.colors.background }} edges={['top']}>
            <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} backgroundColor={currentTheme.colors.background} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </SafeAreaView>
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}