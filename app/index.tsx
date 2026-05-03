import { useAppStore } from '@/src/store/useAppStore';
import { Redirect } from 'expo-router';

export default function IndexRedirector() {
  const { hasSeenOnboarding, sessionToken } = useAppStore();

  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)/screen" />;
  }

  if (!sessionToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
