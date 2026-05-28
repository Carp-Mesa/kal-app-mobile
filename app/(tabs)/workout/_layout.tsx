import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from 'react-native-paper';

export default function WorkoutLayout() {
  const theme = useTheme();

  // Compact header shared across all workout sub-screens to maximise
  // usable content area (especially important on the "En Vivo" screen).
  const compactHeaderStyle = {
    backgroundColor: theme.colors.background,
    height: 48,
  };
  const compactHeaderTitleStyle = {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.onBackground,
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: compactHeaderStyle,
        headerTitleStyle: compactHeaderTitleStyle,
        headerTintColor: theme.colors.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Entrenamientos',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Nuevo Entrenamiento',
          headerShown: false,
          headerBackTitle: 'Atrás',
          presentation: 'card',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="live"
        options={{
          title: 'Entrenamiento en Vivo',
          headerShown: false,
          headerBackTitle: 'Atrás',
          presentation: 'card',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Historial de Entrenamientos',
          headerBackTitle: 'Atrás',
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Detalle del Entrenamiento',
          headerBackTitle: 'Atrás',
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
