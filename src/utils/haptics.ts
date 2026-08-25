/**
 * Haptics utility — centralised haptic feedback helpers.
 * Wraps expo-haptics with graceful fallback for web/unsupported platforms.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isHapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tap — filter chips, toggle states */
export function hapticLight() {
  if (isHapticsSupported) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

/** Medium tap — star/unstar, swipe action threshold */
export function hapticMedium() {
  if (isHapticsSupported) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

/** Heavy tap — destructive actions, major state changes */
export function hapticHeavy() {
  if (isHapticsSupported) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }
}

/** Selection tick — scrolling through picker items */
export function hapticSelection() {
  if (isHapticsSupported) {
    Haptics.selectionAsync().catch(() => {});
  }
}

/** Success notification — sync complete, action confirmed */
export function hapticSuccess() {
  if (isHapticsSupported) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

/** Warning notification — approaching deadline, error state */
export function hapticWarning() {
  if (isHapticsSupported) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }
}

/** Error notification — sync failed, invalid action */
export function hapticError() {
  if (isHapticsSupported) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }
}
