import { Alert, Platform } from 'react-native';

/** Alert yang jalan di HP dan di web (Alert.alert bawaan RN tidak muncul di web). */
export const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }], { cancelable: false });
  }
};
/** Dialog konfirmasi Batal/Ya yang jalan di HP dan di web. */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  labelYa = 'Hapus'
) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Batal', style: 'cancel' },
      { text: labelYa, style: 'destructive', onPress: onConfirm },
    ]);
  }
};