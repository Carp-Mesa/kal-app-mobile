import { authService } from '@/src/services/authService';
import { useAppStore } from '@/src/store/useAppStore';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSessionToken } = useAppStore();
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await authService.register(email, password);
      if (response.token) {
        setSessionToken(response.token);
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text variant="displaySmall" style={styles.title}>Crea tu cuenta</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>Comienza a medir lo que realmente importa</Text>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Email"
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
            <TextInput
              label="Contraseña"
              mode="outlined"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
            <Button 
              mode="contained" 
              onPress={handleRegister} 
              loading={loading}
              disabled={loading || !email || !password}
              style={styles.button}
            >
              Crear Cuenta
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text>¿Ya tienes cuenta?</Text>
          <Link href="/(auth)/login" asChild>
            <Button mode="text">Inicia sesión</Button>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  card: {
    paddingVertical: 10,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 4,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  }
});
