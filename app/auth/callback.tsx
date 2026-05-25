import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useShadowSyncStore } from '@/src/store/useShadowSyncStore';
import { authService } from '@/src/services/authService';
import { clearAllStores } from '@/src/store/clearAllStores';

const CYBER = '#CCFF00';
const DARK_BG = '#121212';
const WHITE = '#FFFFFF';
const SILVER = '#888888';

export default function AuthCallbackScreen() {
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) return;

    const processCallback = async () => {
      if (!url.includes('access_token')) {
        router.replace('/(auth)/login');
        return;
      }

      try {
        const result = authService.handleOAuthCallback(url);
        if (result.access_token && result.refresh_token) {
          clearAllStores();
          useAuthStore.getState().setTokens(result.access_token, result.refresh_token);
          await useShadowSyncStore.getState().fetchAndMerge(true);
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('OAuth Callback processing failed:', error);
        router.replace('/(auth)/login');
      }
    };

    const timer = setTimeout(() => {
      processCallback();
    }, 400);

    return () => clearTimeout(timer);
  }, [url]);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={CYBER} />
      <Text style={s.title}>PROCESANDO INICIO DE SESIÓN</Text>
      <Text style={s.subtitle}>Preparando tu estación de entrenamiento...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'SpaceMono',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: SILVER,
    fontSize: 11,
    textAlign: 'center',
  },
});
