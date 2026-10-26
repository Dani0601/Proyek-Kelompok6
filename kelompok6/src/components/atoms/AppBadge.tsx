import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';

export type AppBadgeProps = {
  label: string | number;
  style?: StyleProp<ViewStyle>;
  color?: string;
  backgroundColor?: string;
};

/** Atom badge kecil untuk indikator angka, status, atau jumlah. */
export default function AppBadge({
  label,
  style,
  color = DesignTokens.color.white,
  backgroundColor = DesignTokens.color.primary,
}: AppBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
