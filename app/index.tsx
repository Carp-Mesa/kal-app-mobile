import { useAppStore } from '@/src/store/useAppStore';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function IndexRedirector() {
  const { hasSeenOnboarding, sessionToken, _hasHydrated } = useAppStore();

  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#0061FF" />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)/screen" />;
  }

  if (!sessionToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
