import { authService } from '@/src/services/authService';
import { useAuthStore } from '@/src/store/useAuthStore';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setTokens } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      // Validamos ambas propiedades por si el backend mandara el token
      if (response && response.access_token) {
        setTokens(response.access_token, response.refresh_token);
        router.replace('/(tabs)');
      } else {
        alert('Respuesta inválida del servidor.');
      }
    } catch (error: any) {
      console.log('Error en login:', error?.response?.data || error.message);
      // Aquí usaríamos un Alert o Snackbar para mostrar "Credenciales incorrectas"
      alert('Credenciales incorrectas o error de red');
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
        <Text variant="displaySmall" style={styles.title}>Bienvenido de nuevo</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>Inicia sesión para continuar tu progreso</Text>

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
              onPress={handleLogin} 
              loading={loading}
              disabled={loading || !email || !password}
              style={styles.button}
            >
              Entrar
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text>¿Aún no tienes cuenta?</Text>
          <Link href="/(auth)/register" asChild>
            <Button mode="text">Regístrate</Button>
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
