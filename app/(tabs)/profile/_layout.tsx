import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Perfil y Metas',
          headerShown: true, // Show header for the profile screen
        }}
      />
    </Stack>
  );
}
