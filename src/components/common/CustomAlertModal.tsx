import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Shadows } from '@/constants/theme';
import { useAlertStore, type AlertButton, type AlertType } from '@/store/alertStore';
import { hapticLight, hapticMedium, hapticWarning, hapticSuccess } from '@/utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function inferAlertType(title: string, message?: string, buttons?: AlertButton[]): { type: AlertType; icon: any } {
  const text = `${title} ${message || ''}`.toLowerCase();
  const hasDestructiveBtn = buttons?.some((b) => b.style === 'destructive');

  if (hasDestructiveBtn || text.includes('delete') || text.includes('remove') || text.includes('permanent') || text.includes('reject')) {
    return { type: 'destructive', icon: 'trash-outline' };
  }
  if (text.includes('error') || text.includes('failed') || text.includes('could not')) {
    return { type: 'destructive', icon: 'alert-circle-outline' };
  }
  if (text.includes('success') || text.includes('approved') || text.includes('synced') || text.includes('sent')) {
    return { type: 'success', icon: 'checkmark-circle-outline' };
  }
  if (text.includes('missing') || text.includes('warning') || text.includes('permission') || text.includes('required') || text.includes('notice')) {
    return { type: 'warning', icon: 'warning-outline' };
  }
  if (text.includes('sign out') || text.includes('logout')) {
    return { type: 'warning', icon: 'log-out-outline' };
  }
  return { type: 'info', icon: 'information-circle-outline' };
}

export function CustomAlertModal() {
  const { visible, config, hide } = useAlertStore();

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Trigger haptic based on alert type
      const inferred = inferAlertType(config?.title || '', config?.message, config?.buttons);
      const activeType = config?.type || inferred.type;

      if (activeType === 'destructive') {
        hapticWarning();
      } else if (activeType === 'success') {
        hapticSuccess();
      } else {
        hapticMedium();
      }

      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 110,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, config, scaleAnim, opacityAnim]);

  if (!visible || !config) return null;

  const buttons = config.buttons && config.buttons.length > 0
    ? config.buttons
    : [{ text: 'OK', style: 'default' as const }];

  const inferred = inferAlertType(config.title, config.message, buttons);
  const type = config.type || inferred.type;
  const iconName = config.icon || inferred.icon;

  const handleClose = (btn?: AlertButton) => {
    hapticLight();
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hide();
      if (btn?.onPress) {
        btn.onPress();
      } else if (config.onDismiss) {
        config.onDismiss();
      }
    });
  };

  const handleBackdropPress = () => {
    if (config.cancelable !== false) {
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      handleClose(cancelBtn);
    }
  };

  // Color config based on type
  let iconColor = '#FFFFFF';
  let iconBg = 'rgba(255, 255, 255, 0.08)';
  let iconBorder = 'rgba(255, 255, 255, 0.12)';

  if (type === 'destructive') {
    iconColor = '#EF4444';
    iconBg = 'rgba(239, 68, 68, 0.14)';
    iconBorder = 'rgba(239, 68, 68, 0.25)';
  } else if (type === 'warning') {
    iconColor = '#F59E0B';
    iconBg = 'rgba(245, 158, 11, 0.14)';
    iconBorder = 'rgba(245, 158, 11, 0.25)';
  } else if (type === 'success') {
    iconColor = '#10B981';
    iconBg = 'rgba(16, 185, 129, 0.14)';
    iconBorder = 'rgba(16, 185, 129, 0.25)';
  }

  const isTwoButtons = buttons.length === 2;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Top Decorative Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconBg, borderColor: iconBorder }]}>
            <Ionicons name={iconName} size={26} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {config.title}
          </Text>

          {/* Message */}
          {Boolean(config.message) && (
            <Text style={styles.message}>
              {config.message}
            </Text>
          )}

          {/* Buttons */}
          <View style={[styles.buttonContainer, isTwoButtons ? styles.buttonRow : styles.buttonCol]}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              let btnStyle: any = styles.defaultBtn;
              let textStyle: any = styles.defaultBtnText;

              if (isCancel) {
                btnStyle = styles.cancelBtn;
                textStyle = styles.cancelBtnText;
              } else if (isDestructive) {
                btnStyle = styles.destructiveBtn;
                textStyle = styles.destructiveBtnText;
              }

              return (
                <Pressable
                  key={`btn-${index}-${btn.text}`}
                  style={({ pressed }) => [
                    styles.baseBtn,
                    btnStyle,
                    isTwoButtons && styles.flexBtn,
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => handleClose(btn)}
                >
                  <Text style={[styles.baseBtnText, textStyle]}>
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 56, 336),
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.65,
        shadowRadius: 28,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.68)',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 6,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonCol: {
    flexDirection: 'column',
    gap: 8,
  },
  baseBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBtn: {
    flex: 1,
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  baseBtnText: {
    fontSize: 14,
    fontWeight: Typography.weight.semibold,
    letterSpacing: -0.1,
  },
  defaultBtn: {
    backgroundColor: '#FFFFFF',
  },
  defaultBtnText: {
    color: '#000000',
    fontWeight: Typography.weight.bold,
  },
  destructiveBtn: {
    backgroundColor: '#EF4444',
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cancelBtnText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: Typography.weight.semibold,
  },
});
