/**
 * AI Legal Mobile - Authentication Stack Layout
 * Handles login, registration, and password recovery screen navigation stack.
 */

import { Stack } from 'expo-router';
import { useThemeContext } from '@/providers';

export default function AuthLayout() {
  const { theme } = useThemeContext();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.backgroundElement,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: theme.background,
        },
      }}>
      <Stack.Screen name="login" options={{ title: 'Log In', headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
      <Stack.Screen name="verification" options={{ title: 'Verify Email' }} />
      <Stack.Screen name="reset-password/[token]" options={{ title: 'New Password' }} />
    </Stack>
  );
}
