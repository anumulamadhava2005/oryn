/**
 * Root layout — handles auth & onboarding routing with global providers.
 * Route groups: (auth) for unauthenticated, (app) for authenticated.
 * Shows onboarding on first launch, then login, then app.
 */

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore, type AuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

function RouteGuard({ children }: { children: React.ReactNode }) {
  const authStatus = useAuthStore((s: AuthStore) => s.status);
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authStatus === 'loading') return;

    const inAuth = segments[0] === '(auth)';
    const isAuthenticated = authStatus === 'authenticated';

    if (!hasCompletedOnboarding) {
      if (segments.join('/') !== '(auth)/onboarding') {
        router.replace('/(auth)/onboarding');
      }
    } else if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(app)');
    }
  }, [authStatus, segments, router, hasCompletedOnboarding]);

  useEffect(() => {
    if (authStatus !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [authStatus]);

  return <>{children}</>;
}

export default function RootLayout() {
  useAuth();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
        <StatusBar style="light" />
        <RouteGuard>
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </RouteGuard>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
