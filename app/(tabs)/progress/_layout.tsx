import { Stack } from 'expo-router';
import React from 'react';

export default function ProgressLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Progreso',
          headerShown: false,
        }}
      />
    </Stack>
  );
}