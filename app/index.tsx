import { authService } from '@/src/services/authService';
import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Redirect } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function IndexRedirector() {
  const { hasSeenOnboarding, _hasHydrated } = useAppStore();
  const { accessToken, refreshToken, setTokens, clearTokens } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  console.log(`[Navigation Check] Hydrated: ${_hasHydrated} | Token: ${!!accessToken}`);

  useEffect(() => {
    const verifyToken = async () => {
      if (!_hasHydrated) return;

      if (!accessToken || !refreshToken) {
        setIsVerifying(false);
        return;
      }

      try {
        const decoded = jwtDecode(accessToken);
        const currentTime = Date.now() / 1000;
        
        // Si faltan menos de 5 minutos para expirar o ya expiró
        if (decoded.exp && decoded.exp < currentTime + 300) {
          const response = await authService.refreshSession(refreshToken!);
          if (response.access_token) {
            setTokens(response.access_token, response.refresh_token || refreshToken!);
          } else {
            clearTokens();
          }
        }
      } catch (error) {
        console.log('Error verifying or refreshing token on startup', error);
        clearTokens();
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [_hasHydrated]);

  if (!_hasHydrated || isVerifying) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#0061FF" />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)/screen" />;
  }

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
