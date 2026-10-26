import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';
import AppBadge from '@/components/atoms/AppBadge';
import AppAvatar from '@/components/atoms/AppAvatar';

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

/** Molecule kartu produk: menggabungkan Atom (AppAvatar, AppBadge) + teks informasi produk + slot tombol/aksi. */
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
      <View style={styles.thumbWrapper}>
        <AppAvatar foto={foto} accent={accent} size={44} />
        {!!badge && badge > 0 && (
          <AppBadge label={badge} style={styles.badgePosition} />
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignTokens.color.surface,
    borderRadius: DesignTokens.radius.lg,
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.md,
    gap: DesignTokens.spacing.md,
  },
  thumbWrapper: {
    position: 'relative',
  },
  badgePosition: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: DesignTokens.color.text,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: DesignTokens.color.textMuted,
    fontSize: DesignTokens.typography.bodySmall,
    marginTop: 3,
  },
});