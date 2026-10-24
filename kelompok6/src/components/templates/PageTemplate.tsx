import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';

type PageTemplateProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Template dasar untuk halaman yang membutuhkan satu root fleksibel. */
export default function PageTemplate({ children, style }: PageTemplateProps) {
  return <View style={[styles.base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: DesignTokens.color.background,
  },
});
