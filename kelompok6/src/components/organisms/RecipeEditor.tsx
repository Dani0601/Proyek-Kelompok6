import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DesignTokens } from '@/constants/design-tokens';
import { useBahan } from '@/context/bahan-context';
import RecipeRowItemMolecule from '@/components/molecules/RecipeRowItemMolecule';
import AppButton from '@/components/atoms/AppButton';

const C = DesignTokens.color;

/** Item resep saat diedit: jumlah disimpan sebagai string agar mudah diketik. */
export type ResepDraft = { bahanId: string; jumlah: string };

type RecipeEditorProps = {
  items: ResepDraft[];
  onChange: (items: ResepDraft[]) => void;
};

/**
 * Organism editor resep:
 * Menggabungkan Molecule (RecipeRowItemMolecule) dan Atom (AppButton)
 * untuk mengelola daftar bahan, edit kuantiti, hapus, dan pilih bahan dari stok.
 */
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
          <RecipeRowItemMolecule
            key={item.bahanId}
            item={{
              bahanId: item.bahanId,
              nama: bahan.nama,
              satuan: bahan.satuan,
              jumlah: item.jumlah,
            }}
            onChangeJumlah={(t) => setJumlah(item.bahanId, t)}
            onRemove={() => remove(item.bahanId)}
          />
        );
      })}

      <AppButton
        style={[styles.addButton, available.length === 0 && styles.addButtonDisabled]}
        disabled={available.length === 0}
        onPress={() => setPickerVisible(true)}
        textStyle={styles.addText}
      >
        + Tambah bahan
      </AppButton>

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
  addButton: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  addText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.primary },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '60%',
  },
  sheetTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: C.textDark, marginBottom: 14 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  optionName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: C.textDark },
  optionUnit: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.textMuted },
});
