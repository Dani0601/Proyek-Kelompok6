import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';

type ProductCardProps = {
  title: string;
  subtitle: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
};

/** Molecule kartu produk untuk daftar produk Owner dan pemilihan item Kasir. */
export default function ProductCard({ title, subtitle, children, style, accent = DesignTokens.color.primaryLight }: ProductCardProps) {
  return (
    <View style={[styles.base, style]}>
      <View style={styles.thumb}><View style={[styles.thumbInner, { backgroundColor: accent }]} /></View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: DesignTokens.color.surface,
    borderRadius: DesignTokens.radius.lg, paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.md, gap: DesignTokens.spacing.md,
  },
  thumb: {
    width: 44, height: 44, borderRadius: DesignTokens.radius.md, backgroundColor: DesignTokens.color.thumb,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbInner: { width: 17, height: 29, borderRadius: 7 },
  info: { flex: 1, minWidth: 0 },
  title: { color: DesignTokens.color.text, fontSize: 15, fontWeight: '700' },
  subtitle: { color: DesignTokens.color.textMuted, fontSize: DesignTokens.typography.bodySmall, marginTop: 3 },
});
