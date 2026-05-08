import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Perfil y Metas',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Historial Nutricional',
          headerBackTitle: 'Atrás',
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
