import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { DarkTheme as AppDarkTheme, LightTheme as AppLightTheme } from '@/src/theme/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { SafeAreaView } from 'react-native-safe-area-context';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const _hasHydratedAuth = useAuthStore(state => state._hasHydrated);
  const _hasHydratedApp = useAppStore(state => state._hasHydrated);

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && _hasHydratedAuth && _hasHydratedApp) {
      SplashScreen.hideAsync();
    }
  }, [loaded, _hasHydratedAuth, _hasHydratedApp]);

  if (!loaded || !_hasHydratedAuth || !_hasHydratedApp) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const themeMode = useAppStore((state) => state.themeMode);
  const currentTheme = themeMode === 'dark' ? AppDarkTheme : AppLightTheme;
  const navTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;

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
