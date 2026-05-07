import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

export default function WorkoutIndexScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        🏋️ Entrenamientos
      </Text>
      <Text
        variant="bodyLarge"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Registra tu rutina de hoy y lleva el control de tu progreso.
      </Text>
      <Button
        mode="contained"
        icon="plus"
        onPress={() => router.push('/(tabs)/workout/new')}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={{ fontSize: 16 }}
      >
        Nuevo Entrenamiento
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    borderRadius: 14,
    marginTop: 8,
    width: '100%',
  },
  buttonContent: {
    height: 54,
  },
});
