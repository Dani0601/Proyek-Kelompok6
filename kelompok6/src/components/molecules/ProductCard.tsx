import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';

type ProductCardProps = {
  title: string;
  subtitle: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: string;
  /** Foto produk (require atau { uri }). Kalau kosong, tampil blok warna accent. */
  foto?: ImageSourcePropType;
  /** Angka kecil di pojok kanan atas gambar; disembunyikan kalau 0/kosong. */
  badge?: number;
  subtitleStyle?: StyleProp<TextStyle>;
};

/** Molecule kartu produk untuk daftar produk Owner dan pemilihan item Kasir. */
export default function ProductCard({
  title,
  subtitle,
  children,
  style,
  accent = DesignTokens.color.primaryLight,
  foto,
  badge,
  subtitleStyle,
}: ProductCardProps) {
  return (
    <View style={[styles.base, style]}>
      <View style={styles.thumb}>
        {foto ? (
          <Image source={foto} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbInner, { backgroundColor: accent }]} />
        )}
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={2}>{subtitle}</Text>
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
  thumbImage: { width: '100%', height: '100%', borderRadius: DesignTokens.radius.md },
  thumbInner: { width: 17, height: 29, borderRadius: 7 },
  badge: {
    position: 'absolute', top: -8, right: -8, minWidth: 19, height: 19, borderRadius: 10,
    paddingHorizontal: 5, backgroundColor: DesignTokens.color.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: DesignTokens.color.white, fontSize: 11, fontWeight: '700' },
  info: { flex: 1, minWidth: 0 },
  title: { color: DesignTokens.color.text, fontSize: 15, fontWeight: '700' },
  subtitle: { color: DesignTokens.color.textMuted, fontSize: DesignTokens.typography.bodySmall, marginTop: 3 },
});