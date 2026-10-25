import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DesignTokens } from '@/constants/design-tokens';
import { useBahan } from '@/context/bahan-context';

const C = DesignTokens.color;

/** Item resep saat diedit: jumlah disimpan sebagai string agar mudah diketik. */
export type ResepDraft = { bahanId: string; jumlah: string };

type RecipeEditorProps = {
  items: ResepDraft[];
  onChange: (items: ResepDraft[]) => void;
};

/** Organism editor resep: daftar bahan per porsi, hapus, dan tambah bahan dari stok. */
export default function RecipeEditor({ items, onChange }: RecipeEditorProps) {
  const { bahanList } = useBahan();
  const [pickerVisible, setPickerVisible] = useState(false);

  const available = bahanList.filter((b) => !items.some((i) => i.bahanId === b.id));

  const setJumlah = (bahanId: string, text: string) => {
    const clean = text.replace(/[^0-9.]/g, '');
    onChange(items.map((i) => (i.bahanId === bahanId ? { ...i, jumlah: clean } : i)));
  };

  const remove = (bahanId: string) => onChange(items.filter((i) => i.bahanId !== bahanId));

  const add = (bahanId: string) => {
    onChange([...items, { bahanId, jumlah: '' }]);
    setPickerVisible(false);
  };

  return (
    <View>
      {items.map((item) => {
        const bahan = bahanList.find((b) => b.id === item.bahanId);
        if (!bahan) return null;
        return (
          <View key={item.bahanId} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{bahan.nama}</Text>
            <View style={styles.qtyBox}>
              <TextInput
                style={styles.qtyInput}
                value={item.jumlah}
                onChangeText={(t) => setJumlah(item.bahanId, t)}
                keyboardType="decimal-pad"
                maxLength={7}
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor={C.textMuted}
              />
              <Text style={styles.unit}>{bahan.satuan}</Text>
            </View>
            <TouchableOpacity onPress={() => remove(item.bahanId)} hitSlop={8} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={22} color={C.danger} />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.addButton, available.length === 0 && styles.addButtonDisabled]}
        activeOpacity={0.7}
        disabled={available.length === 0}
        onPress={() => setPickerVisible(true)}
      >
        <Text style={styles.addText}>+ Tambah bahan</Text>
      </TouchableOpacity>

      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setPickerVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Pilih bahan</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {available.map((b) => (
                <TouchableOpacity key={b.id} style={styles.option} activeOpacity={0.7} onPress={() => add(b.id)}>
                  <Text style={styles.optionName}>{b.nama}</Text>
                  <Text style={styles.optionUnit}>{b.satuan}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  name: { flex: 1, minWidth: 0, fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.textDark },
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
    textAlign: 'right',
  },
  unit: { width: 36, marginLeft: 6, fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: C.textMuted },
  addButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  addText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.primary },
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    maxHeight: '70%',
  },
  sheetTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: C.textDark, marginBottom: 12 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  optionName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.textDark },
  optionUnit: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.textMuted },
});
