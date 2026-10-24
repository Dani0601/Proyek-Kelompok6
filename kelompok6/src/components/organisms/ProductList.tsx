import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type ProductListProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  itemSpacing?: number;
};

/** Organism daftar produk: menyatukan layout dan jarak antar-kartu di halaman Owner/Kasir. */
export default function ProductList({ children, style, itemSpacing = 12 }: ProductListProps) {
  return <View style={[styles.base, { gap: itemSpacing }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { width: '100%' },
});
