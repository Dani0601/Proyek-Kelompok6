import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DesignTokens } from '@/constants/design-tokens';
import AppInput from '@/components/atoms/AppInput';
import AppButton from '@/components/atoms/AppButton';

const C = DesignTokens.color;

export type RecipeRowItem = {
  bahanId: string;
  nama: string;
  satuan: string;
  jumlah: string;
};

type RecipeRowItemProps = {
  item: RecipeRowItem;
  onChangeJumlah: (val: string) => void;
  onRemove: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Molecule baris resep:
 * Menggabungkan atom AppInput untuk input kuantiti dan atom AppButton untuk tombol hapus.
 */
export default function RecipeRowItemMolecule({
  item,
  onChangeJumlah,
  onRemove,
  style,
}: RecipeRowItemProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.name} numberOfLines={1}>{item.nama}</Text>
      <View style={styles.qtyBox}>
        <AppInput
          style={styles.qtyInput}
          value={item.jumlah}
          onChangeText={onChangeJumlah}
          keyboardType="decimal-pad"
          maxLength={7}
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor={C.textMuted}
        />
        <Text style={styles.unit}>{item.satuan}</Text>
      </View>
      <AppButton
        onPress={onRemove}
        accessibilityLabel={`Hapus ${item.nama}`}
        style={styles.removeBtn}
      >
        <Ionicons name="trash-outline" size={20} color={C.danger} />
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 10,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.textDark,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 124,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.cream,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  qtyInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: C.textDark,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
  },
  unit: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: C.textMuted,
    marginLeft: 6,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
