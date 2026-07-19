import { Alert, Platform } from 'react-native';

export function showAlert(
  title: string,
  message?: string,
  buttons?: { text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[]
) {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // If there are multiple buttons (e.g. Cancel & Delete/Restore/Add)
      const hasActionBtn = buttons.some((b) => b.style !== 'cancel');
      const actionBtn = buttons.find((b) => b.style !== 'cancel' && b.onPress) || buttons[buttons.length - 1];
      const cancelBtn = buttons.find((b) => b.style === 'cancel');

      if (hasActionBtn && cancelBtn) {
        const confirmed = window.confirm(`${title}${message ? '\n\n' + message : ''}`);
        if (confirmed) {
          actionBtn?.onPress?.();
        } else {
          cancelBtn?.onPress?.();
        }
      } else {
        window.alert(`${title}${message ? '\n\n' + message : ''}`);
        actionBtn?.onPress?.();
      }
    } else {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}
