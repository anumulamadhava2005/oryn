import { Alert as RNAlert } from 'react-native';
import { showAlert as storeShowAlert, hideAlert as storeHideAlert, type AlertButton, type AlertConfig } from '@/store/alertStore';

export type { AlertButton, AlertConfig, AlertType } from '@/store/alertStore';
export { showAlert, hideAlert } from '@/store/alertStore';

/**
 * Drop-in replacement for React Native's Alert.alert
 */
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean; onDismiss?: () => void }
  ) => {
    storeShowAlert({
      title: String(title || ''),
      message: message ? String(message) : undefined,
      buttons,
      cancelable: options?.cancelable,
      onDismiss: options?.onDismiss,
    });
  },
};

/**
 * Global patch for React Native's Alert.alert so any library or existing
 * file calling Alert.alert seamlessly renders the custom Oryn alert popup.
 */
let isPatched = false;

export function setupCustomAlert() {
  if (isPatched) return;
  isPatched = true;

  try {
    RNAlert.alert = (
      title: string,
      message?: string,
      buttons?: any[],
      options?: any
    ) => {
      Alert.alert(title, message, buttons, options);
    };
  } catch (err) {
    console.warn('Could not monkey-patch Alert.alert:', err);
  }
}
