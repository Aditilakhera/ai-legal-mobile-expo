import { Stack } from 'expo-router';
import React from 'react';

export default function CasesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="document-viewer" />
    </Stack>
  );
}
