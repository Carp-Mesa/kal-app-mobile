import { authService } from '@/src/services/authService';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useShadowSyncStore } from '@/src/store/useShadowSyncStore';
import { useProfileStore } from '@/src/store/useProfileStore';
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
  useSharedValue,
  useAnimatedStyle,
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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { setTokens } = useAuthStore();
  const router = useRouter();
  const { trigger: shakeTrigger, animatedStyle: shakeStyle } = useShake();

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const getInputBorderColor = (field: string) => {
    if (errorField === field) return ERROR_RED;
    return 'rgba(255,255,255,0.15)';
  };

  const handleRegister = async () => {
    setErrorField(null);
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorField('fullName');
      setErrorMsg('Ingresa tu nombre completo');
      shakeTrigger();
      return;
    }
    if (!isValidEmail(email)) {
      setErrorField('email');
      setErrorMsg('Correo electrónico inválido');
      shakeTrigger();
      return;
    }
    if (password.length < 6) {
      setErrorField('password');
      setErrorMsg('La contraseña debe tener al menos 6 caracteres');
      shakeTrigger();
      return;
    }
    if (password !== confirmPassword) {
      setErrorField('confirmPassword');
      setErrorMsg('Las contraseñas no coinciden');
      shakeTrigger();
      return;
    }

    setLoading(true);
    try {
      const response = await authService.register(email, password);

      // null = email confirmation required (Supabase returns no session)
      if (response === null) {
        setErrorMsg('Revisa tu correo para confirmar tu cuenta antes de continuar.');
        shakeTrigger();
        return;
      }

      if (response.access_token) {
        // 1. Wipe any residual data from a previous session
        clearAllStores();

        // 2. Save name to profile store for instant display
        useProfileStore.getState().updateProfile({ full_name: fullName.trim() });

        // 3. Persist new session
        setTokens(response.access_token, response.refresh_token);

        // 4. Navigate to onboarding for initial setup
        router.replace('/(onboarding)/screen');

        // 5. Cold Start: fetch profile and any existing data from server
        useShadowSyncStore.getState().fetchAndMerge(true);
      }
    } catch (error: any) {
      const msg = error?.message || error?.toString() || '';
      console.error('❌ [Supabase Auth Error]:', msg);
      if (msg.includes('already registered')) {
        setErrorMsg('Este correo ya está registrado. Intenta iniciar sesión.');
      } else if (msg.includes('No API key') || msg.includes('supabase')) {
        setErrorMsg('Error de configuración. Verifica tu conexión.');
      } else if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch')) {
        setErrorMsg('Error de red. Verifica tu conexión a internet.');
      } else {
        setErrorMsg(msg || 'Hubo un error al registrarse');
      }
      shakeTrigger();
    } finally {
      setLoading(false);
    }
  };

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
                <MaterialCommunityIcons name="account-plus" size={44} color={CYBER_LIME} />
              </View>
            </View>
            <Text style={styles.title}>NUEVO RECLUTA</Text>
            <Text style={styles.subtitle}>Crea tu perfil y toma el control.</Text>
          </View>

          {/* ── Card ────────────────────────────────────────────────── */}
          <Animated.View style={[styles.card, shakeStyle]}>
            <TextInput
              label="Nombre Completo"
              mode="outlined"
              autoCapitalize="words"
              value={fullName}
              onChangeText={(t) => { setFullName(t); if (errorField === 'fullName') { setErrorField(null); setErrorMsg(''); } }}
              style={styles.input}
              outlineStyle={{ borderRadius: 12, borderColor: getInputBorderColor('fullName'), borderWidth: 1.5 }}
              textColor="#FFFFFF"
              theme={{ colors: { primary: CYBER_LIME, onSurfaceVariant: '#A0A0A0', outline: getInputBorderColor('fullName') } }}
              left={<TextInput.Icon icon="account-outline" color="#A0A0A0" />}
            />

            <TextInput
              label="Correo Electrónico"
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => { setEmail(t); if (errorField === 'email') { setErrorField(null); setErrorMsg(''); } }}
              style={styles.input}
              outlineStyle={{ borderRadius: 12, borderColor: getInputBorderColor('email'), borderWidth: 1.5 }}
              textColor="#FFFFFF"
              theme={{ colors: { primary: CYBER_LIME, onSurfaceVariant: '#A0A0A0', outline: getInputBorderColor('email') } }}
              left={<TextInput.Icon icon="email-outline" color="#A0A0A0" />}
            />

            <TextInput
              label="Contraseña"
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={secure}
              value={password}
              onChangeText={(t) => { setPassword(t); if (errorField === 'password') { setErrorField(null); setErrorMsg(''); } }}
              style={styles.input}
              outlineStyle={{ borderRadius: 12, borderColor: getInputBorderColor('password'), borderWidth: 1.5 }}
              textColor="#FFFFFF"
              theme={{ colors: { primary: CYBER_LIME, onSurfaceVariant: '#A0A0A0', outline: getInputBorderColor('password') } }}
              left={<TextInput.Icon icon="lock-outline" color="#A0A0A0" />}
              right={
                <TextInput.Icon
                  icon={secure ? 'eye-off-outline' : 'eye-outline'}
                  color="#A0A0A0"
                  onPress={() => setSecure(!secure)}
                />
              }
            />

            <TextInput
              label="Confirmar Contraseña"
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={secureConfirm}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); if (errorField === 'confirmPassword') { setErrorField(null); setErrorMsg(''); } }}
              style={[styles.input, { marginBottom: errorMsg ? 8 : 20 }]}
              outlineStyle={{ borderRadius: 12, borderColor: getInputBorderColor('confirmPassword'), borderWidth: 1.5 }}
              textColor="#FFFFFF"
              theme={{ colors: { primary: CYBER_LIME, onSurfaceVariant: '#A0A0A0', outline: getInputBorderColor('confirmPassword') } }}
              left={<TextInput.Icon icon="lock-check-outline" color="#A0A0A0" />}
              right={
                <TextInput.Icon
                  icon={secureConfirm ? 'eye-off-outline' : 'eye-outline'}
                  color="#A0A0A0"
                  onPress={() => setSecureConfirm(!secureConfirm)}
                />
              }
            />

            {errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={loading || !email || !password || !confirmPassword}
              style={[styles.button, (!email || !password || !confirmPassword || loading) && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.buttonText}>ACTIVAR ESTACIÓN</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Ya tengo cuenta.</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Iniciar sesión</Text>
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
    marginBottom: 28,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(204, 255, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
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
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 20,
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
    marginBottom: 14,
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
  footer: {
    marginTop: 28,
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
