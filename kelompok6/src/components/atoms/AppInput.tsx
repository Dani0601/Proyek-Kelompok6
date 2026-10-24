import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, type StyleProp, type TextStyle } from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';

type AppInputProps = TextInputProps & {
  inputStyle?: StyleProp<TextStyle>;
  invalid?: boolean;
};

/** Atom input reusable dengan indikator fokus dan error. */
export default function AppInput({ inputStyle, invalid = false, onFocus, onBlur, ...props }: AppInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      style={[styles.base, focused && styles.focused, invalid && styles.invalid, inputStyle, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { minWidth: 0, color: DesignTokens.color.text },
  focused: { borderColor: DesignTokens.color.primaryLight },
  invalid: { borderColor: DesignTokens.color.danger, borderWidth: 1.5 },
});
