import { Stack } from 'expo-router';
import React from 'react';

export default function WorkoutLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Entrenamientos',
          headerShown: false, // El tab ya tiene header
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Nuevo Entrenamiento',
          headerBackTitle: 'Atrás',
          presentation: 'card',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
