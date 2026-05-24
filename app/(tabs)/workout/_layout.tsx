import { Stack } from 'expo-router';
import React from 'react';

export default function WorkoutLayout() {
  return (
    <Stack>
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
          headerShown: true,
          headerBackTitle: 'Atrás',
          presentation: 'card',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="live"
        options={{
          title: 'Entrenamiento en Vivo',
          headerShown: true,
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
