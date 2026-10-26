import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';

export type AppAvatarProps = {
  foto?: ImageSourcePropType;
  accent?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Atom Avatar / Thumbnail gambar:
 * Menampilkan foto produk jika tersedia, atau placeholder warna aksen jika tidak ada foto.
 */
export default function AppAvatar({
  foto,
  accent = DesignTokens.color.primaryLight,
  size = 44,
  style,
}: AppAvatarProps) {
  return (
    <View style={[styles.thumb, { width: size, height: size }, style]}>
      {foto ? (
        <Image source={foto} style={styles.thumbImage} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbInner, { backgroundColor: accent }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    borderRadius: DesignTokens.radius.md,
    backgroundColor: DesignTokens.color.thumb,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbInner: {
    width: '40%',
    height: '65%',
    borderRadius: 7,
  },
});
