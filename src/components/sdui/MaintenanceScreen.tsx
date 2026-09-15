/**
 * MaintenanceScreen — Gate screen displayed when remote maintenance mode is enabled.
 * Automatically polls the server periodically to restore access once maintenance completes.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Opacity } from '@/constants/theme';
import { OrynLogo } from '@/components/common/OrynLogo';
import { useSDUIStore, useSDUIEnvironment } from '@/store/sduiStore';
import { syncSDUI } from '@/services/sduiService';
import { hapticMedium, hapticSuccess } from '@/utils/haptics';

interface MaintenanceScreenProps {
  onBypass?: () => void;
}

export function MaintenanceScreen({ onBypass }: MaintenanceScreenProps) {
  const maintenance = useSDUIStore((s) => s.manifest.maintenance);
  const environment = useSDUIEnvironment();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Auto-poll server every 60s to check if maintenance is over
  useEffect(() => {
    const interval = setInterval(async () => {
      await syncSDUI();
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleManualCheck = async () => {
    hapticMedium();
    setChecking(true);
    const success = await syncSDUI();
    setChecking(false);
    setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    if (success) {
      hapticSuccess();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top Environment Badge */}
        <View style={styles.envPill}>
          <View style={[styles.envDot, { backgroundColor: environment === 'dev' ? Colors.systemOrange : Colors.systemGreen }]} />
          <Text style={styles.envText}>SDUI · {environment.toUpperCase()}</Text>
        </View>

        {/* Central Card */}
        <View style={styles.centerContent}>
          <View style={styles.logoWrap}>
            <OrynLogo size={72} borderRadius={Radius.xl} />
            <View style={styles.wrenchBadge}>
              <Ionicons name="construct" size={16} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>{maintenance?.title || 'System Maintenance'}</Text>
          <Text style={styles.message}>
            {maintenance?.message ||
              'Oryn is currently undergoing essential scheduled maintenance or infrastructure updates. Access will be restored shortly.'}
          </Text>

          {maintenance?.estimatedEndTime && (
            <View style={styles.timeBox}>
              <Ionicons name="time-outline" size={16} color={Colors.systemOrange} />
              <Text style={styles.timeText}>
                Estimated completion: {new Date(maintenance.estimatedEndTime).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleManualCheck}
            disabled={checking}
            style={({ pressed }) => [
              styles.checkBtn,
              pressed && { opacity: Opacity.pressed },
              checking && { opacity: 0.6 },
            ]}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.checkBtnText}>Check Status</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.lastCheckedText}>Last checked at {lastChecked}</Text>
        </View>

        {/* Admin Bypass Option if enabled */}
        {maintenance?.allowAdminBypass && onBypass && (
          <Pressable
            onPress={onBypass}
            style={({ pressed }) => [styles.bypassBtn, pressed && { opacity: Opacity.pressed }]}
          >
            <Ionicons name="shield-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.bypassText}>Developer / Admin Bypass</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[8],
  },
  envPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  envDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  envText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  centerContent: {
    alignItems: 'center',
    maxWidth: 340,
    gap: Spacing[3],
  },
  logoWrap: {
    position: 'relative',
    marginBottom: Spacing[3],
  },
  wrenchBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.systemOrange,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.systemOrange + '15',
    borderWidth: 1,
    borderColor: Colors.systemOrange + '30',
    paddingHorizontal: Spacing[3.5],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    marginTop: Spacing[1],
  },
  timeText: {
    fontSize: Typography.size.xs,
    color: Colors.systemOrange,
    fontWeight: Typography.weight.medium,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.systemBlue,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    marginTop: Spacing[4],
    width: '100%',
  },
  checkBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  lastCheckedText: {
    fontSize: Typography.size.xs,
    color: Colors.textDisabled,
    marginTop: Spacing[1],
  },
  bypassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing[2],
  },
  bypassText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
});
