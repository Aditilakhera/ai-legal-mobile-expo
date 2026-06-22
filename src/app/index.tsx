import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/store/auth';
import { Scale } from '@/components/ui';

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        console.log('[SPLASH] Session active. Redirecting to dashboard...');
        router.replace('/(tabs)/dashboard');
      } else {
        console.log('[SPLASH] Guest session detected. Redirecting to onboarding...');
        router.replace('/onboarding');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <Scale duration={800} style={styles.logoContainer}>
        <Image
          source={require('@/assets/logos/Logo.svg')}
          style={styles.logo}
          contentFit="contain"
        />
      </Scale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
});

