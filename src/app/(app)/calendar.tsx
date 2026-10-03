/**
 * Calendar Screen — Unified with Today Screen Calendar Tab.
 *
 * Automatically routes to the integrated interactive academic calendar
 * in Today screen to ensure a single, consistent timeline experience.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function CalendarScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace({
      pathname: '/(app)/today',
      params: { tab: 'calendar' },
    });
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="small" color={Colors.accent} />
    </View>
  );
}
