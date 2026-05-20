import { authService } from '@/src/services/authService';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useShadowSyncStore } from '@/src/store/useShadowSyncStore';
import { clearAllStores } from '@/src/store/clearAllStores';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const CYBER_LIME = '#CCFF00';
const CARD_BG = '#1A1A1A';
const ERROR_RED = '#FF4444';

function useShake() {
  const shakeX = useSharedValue(0);
  const trigger = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [shakeX]);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  return { trigger, animatedStyle };
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { setTokens } = useAuthStore();
  const router = useRouter();
  const { trigger: shakeTrigger, animatedStyle: shakeStyle } = useShake();

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const onAuthSuccess = async (accessToken: string, refreshToken: string) => {
    clearAllStores();
    setTokens(accessToken, refreshToken);
    await useShadowSyncStore.getState().fetchAndMerge(true);
    router.replace('/(tabs)');
  };

  const handleLogin = async () => {
    setErrorMsg('');
    if (!isValidEmail(email)) {
      setErrorMsg('Correo electrónico inválido');
      shakeTrigger();
      return;
    }
    if (!password) {
      setErrorMsg('Ingresa tu contraseña');
      shakeTrigger();
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      if (response?.access_token) {
        onAuthSuccess(response.access_token, response.refresh_token);
      } else {
        setErrorMsg('Respuesta inválida del servidor.');
        shakeTrigger();
      }
    } catch (error: any) {
      const msg = error?.message || '';
      console.error('❌ [Supabase Auth Error]:', msg);
      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('Credenciales incorrectas');
      } else if (msg.includes('No API key') || msg.includes('supabase')) {
        setErrorMsg('Error de configuración. Verifica tu conexión.');
      } else if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch')) {
        setErrorMsg('Error de red. Verifica tu conexión a internet.');
      } else {
        setErrorMsg(msg || 'Error de red. Intenta de nuevo.');
      }
      shakeTrigger();
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setErrorMsg('');
    setOauthLoading(true);
    try {
      const result = await authService.loginWithOAuth(provider);
      if (result?.access_token) {
        onAuthSuccess(result.access_token, result.refresh_token);
      } else {
        setErrorMsg('No se pudieron obtener las credenciales.');
        shakeTrigger();
      }
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg === 'OAuth_CANCELLED') {
        // User cancelled — no error message needed
      } else if (msg === 'OAuth_FAILED') {
        setErrorMsg('La autenticación falló. Intenta de nuevo.');
        shakeTrigger();
      } else if (msg === 'OAuth_CALLBACK_MISSING_TOKENS') {
        setErrorMsg('Error al procesar la respuesta. Intenta de nuevo.');
        shakeTrigger();
      } else {
        setErrorMsg('Error de conexión. Intenta de nuevo.');
        shakeTrigger();
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const inputBorderColor = errorMsg ? ERROR_RED : 'rgba(255,255,255,0.15)';
  const isAnyLoading = loading || oauthLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.iconRing}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="lightning-bolt" size={48} color={CYBER_LIME} />
              </View>
            </View>
            <Text style={styles.title}>BIENVENIDO</Text>
            <Text style={styles.title}>LIBERA TU POTENCIAL</Text>
            <Text style={styles.subtitle}>Inicia sesión para continuar tu evolución.</Text>
          </View>

          {/* ── Card ────────────────────────────────────────────────── */}
          <Animated.View style={[styles.card, shakeStyle]}>
            <TextInput
              label="Correo Electrónico"
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
              style={styles.input}
              outlineStyle={{ borderRadius: 12, borderColor: inputBorderColor, borderWidth: 1.5 }}
              textColor="#FFFFFF"
              theme={{ colors: { primary: CYBER_LIME, onSurfaceVariant: '#A0A0A0', outline: inputBorderColor } }}
              left={<TextInput.Icon icon="email-outline" color="#A0A0A0" />}
            />

            <TextInput
              label="Contraseña"
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={secure}
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
              style={[styles.input, { marginBottom: errorMsg ? 8 : 20 }]}
              outlineStyle={{ borderRadius: 12, borderColor: inputBorderColor, borderWidth: 1.5 }}
              textColor="#FFFFFF"
              theme={{ colors: { primary: CYBER_LIME, onSurfaceVariant: '#A0A0A0', outline: inputBorderColor } }}
              left={<TextInput.Icon icon="lock-outline" color="#A0A0A0" />}
              right={
                <TextInput.Icon
                  icon={secure ? 'eye-off-outline' : 'eye-outline'}
                  color="#A0A0A0"
                  onPress={() => setSecure(!secure)}
                />
              }
            />

            {errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={isAnyLoading || !email || !password}
              style={[styles.button, (!email || !password || isAnyLoading) && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.buttonText}>ENTRAR</Text>
              )}
            </TouchableOpacity>

            {/* ── Social Auth Separator ──────────────────────────────── */}
            <View style={styles.separatorContainer}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>o continúa con</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* ── OAuth Buttons ──────────────────────────────────────── */}
            <View style={styles.oauthRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleOAuth('google')}
                disabled={isAnyLoading}
                style={[styles.oauthButton, isAnyLoading && styles.buttonDisabled]}
              >
                <MaterialCommunityIcons name="google" size={20} color="#FFFFFF" />
                <Text style={styles.oauthButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleOAuth('facebook')}
                disabled={isAnyLoading}
                style={[styles.oauthButton, isAnyLoading && styles.buttonDisabled]}
              >
                <MaterialCommunityIcons name="facebook" size={20} color="#FFFFFF" />
                <Text style={styles.oauthButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Regístrate aquí</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(204, 255, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 0,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: CARD_BG,
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
    opacity: 0.98,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  errorText: {
    color: ERROR_RED,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: CYBER_LIME,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(204, 255, 0, 0.35)',
  },
  buttonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  separatorText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },
  oauthRow: {
    flexDirection: 'row',
    gap: 12,
  },
  oauthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
  },
  oauthButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  footerLink: {
    color: CYBER_LIME,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});