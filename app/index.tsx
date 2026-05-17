import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  const hasSeenOnboarding = useAppStore(state => state.hasSeenOnboarding);
  const accessToken = useAuthStore(state => state.accessToken);

  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)/screen" />;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}