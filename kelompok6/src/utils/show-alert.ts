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