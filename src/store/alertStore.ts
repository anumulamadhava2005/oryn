import { create } from 'zustand';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export type AlertType = 'default' | 'destructive' | 'warning' | 'success' | 'info';

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: AlertType;
  icon?: string;
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AlertState {
  visible: boolean;
  config: AlertConfig | null;
  show: (config: AlertConfig) => void;
  hide: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  config: null,
  show: (config) => set({ visible: true, config }),
  hide: () => set({ visible: false, config: null }),
}));

/**
 * Programmatic helper to trigger the custom alert popup
 */
export function showAlert(config: AlertConfig) {
  useAlertStore.getState().show(config);
}

/**
 * Programmatic helper to close the custom alert popup
 */
export function hideAlert() {
  useAlertStore.getState().hide();
}
