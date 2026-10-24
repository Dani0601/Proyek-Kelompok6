import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';

type AppButtonProps = {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Atom tombol reusable dengan state pressed/disabled yang konsisten. */
export default function AppButton({ children, onPress, style, textStyle, disabled, accessibilityLabel }: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.base, style, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      {typeof children === 'string' ? <Text style={[styles.label, textStyle]}>{children}</Text> : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  label: { color: DesignTokens.color.text },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
