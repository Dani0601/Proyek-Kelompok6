import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import { StickyMilkColors } from '@/constants/design-tokens';
import { useBahan } from '../../context/bahan-context';

const fmt = (n: number) => n.toLocaleString('id-ID');

export default function StokMasukScreen() {
  const router = useRouter();
  const { bahanList, catatStokMasuk } = useBahan();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [selectedBahanId, setSelectedBahanId] = useState(
    bahanList.length > 0 ? bahanList[0].id : ''
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [jumlah, setJumlah] = useState('');
  const [harga, setHarga] = useState('');
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState('');

  const selectedBahan = useMemo(
    () => bahanList.find((b) => b.id === selectedBahanId) || bahanList[0],
    [bahanList, selectedBahanId]
  );

  const parsedJumlah = useMemo(() => {
    return parseFloat(jumlah.replace(/\./g, '').replace(/,/g, '')) || 0;
  }, [jumlah]);

  const parsedHarga = Number(harga) || 0;

  const stokSetelah = useMemo(() => {
    if (!selectedBahan) return 0;
    return selectedBahan.stok + parsedJumlah;
  }, [selectedBahan, parsedJumlah]);

  if (!fontsLoaded) return null;

  const handleSimpan = () => {
    if (!selectedBahan) return;
    if (parsedJumlah <= 0) return setError('Jumlah masuk wajib diisi.');
    if (parsedHarga <= 0) return setError('Nominal harga wajib diisi.');

    catatStokMasuk(selectedBahan.id, parsedJumlah, parsedHarga, catatan);
    setJumlah('');
    setHarga('');
    setCatatan('');
    setError('');
    router.push('/(owner)/stok');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/(owner)/stok')}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={StickyMilkColors.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Stok Masuk</Text>
          </View>

          {/* Bahan Baku Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Bahan baku</Text>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setDropdownOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownTriggerText}>
                {selectedBahan?.nama || 'Pilih bahan baku'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={StickyMilkColors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Modal Dropdown Selection */}
          <Modal visible={dropdownOpen} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setDropdownOpen(false)}
            >
              <View style={styles.dropdownModalContent}>
                <Text style={styles.dropdownModalTitle}>Pilih Bahan Baku</Text>
                {bahanList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.dropdownItem,
                      item.id === selectedBahanId && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedBahanId(item.id);
                      setDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        item.id === selectedBahanId && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {item.nama}
                    </Text>
                    <Text style={styles.dropdownItemSub}>
                      ({fmt(item.stok)} {item.satuan})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Jumlah Masuk */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Jumlah masuk</Text>
            <View style={styles.inputSuffixWrapper}>
              <AppInput
                style={styles.inputWithSuffix}
                placeholder="0"
                placeholderTextColor={StickyMilkColors.textMuted}
                keyboardType="numeric"
                value={jumlah}
                onChangeText={(t) => { setJumlah(t); setError(''); }}
              />
              <Text style={styles.suffixText}>{selectedBahan?.satuan || ''}</Text>
            </View>
          </View>

          {/* Nominal Harga */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nominal harga</Text>
            <View style={styles.inputSuffixWrapper}>
              <Text style={styles.prefixText}>Rp</Text>
              <AppInput
                style={styles.inputWithSuffix}
                placeholder="0"
                placeholderTextColor={StickyMilkColors.textMuted}
                keyboardType="number-pad"
                value={harga ? fmt(parsedHarga) : ''}
                onChangeText={(t) => { setHarga(t.replace(/[^0-9]/g, '')); setError(''); }}
              />
            </View>
            <Text style={styles.hint}>Total harga pembelian bahan ini.</Text>
          </View>

          {/* Stok Preview Card */}
          {selectedBahan && (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Stok saat ini</Text>
                <Text style={styles.previewValueMuted}>
                  {fmt(selectedBahan.stok)} {selectedBahan.satuan}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.previewRow}>
                <Text style={styles.previewLabelBold}>Stok setelah</Text>
                <Text style={styles.previewValueBold}>
                  {fmt(stokSetelah)} {selectedBahan.satuan}
                </Text>
              </View>
            </View>
          )}

          {/* Catatan (Opsional) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Catatan (opsional)</Text>
            <View style={styles.inputWrapper}>
              <AppInput
                style={styles.input}
                placeholder="Contoh: Beli di Toko Maju Jaya"
                placeholderTextColor={StickyMilkColors.textMuted}
                value={catatan}
                onChangeText={setCatatan}
              />
            </View>
          </View>

          <View style={styles.spacer} />

          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* Tombol Simpan */}
          <AppButton style={styles.saveBtn} onPress={handleSimpan}>
            <Text style={styles.saveBtnText}>Simpan</Text>
          </AppButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: StickyMilkColors.cream,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 36,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: StickyMilkColors.textDark,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: StickyMilkColors.textDark,
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: StickyMilkColors.borderWarm,
    paddingHorizontal: 16,
    height: 52,
  },
  dropdownTriggerText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: StickyMilkColors.textDark,
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: StickyMilkColors.borderWarm,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: StickyMilkColors.textDark,
  },
  inputSuffixWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: StickyMilkColors.borderWarm,
    paddingHorizontal: 16,
    height: 52,
  },
  inputWithSuffix: {
    flex: 1,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: StickyMilkColors.textDark,
  },
  suffixText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: StickyMilkColors.textMuted,
  },
  prefixText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: StickyMilkColors.textDark,
    marginRight: 8,
  },
  hint: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: StickyMilkColors.textMuted,
    marginTop: 6,
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: StickyMilkColors.danger,
    textAlign: 'center',
    marginTop: 12,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: StickyMilkColors.textMuted,
  },
  previewValueMuted: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: StickyMilkColors.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  previewLabelBold: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: StickyMilkColors.textDark,
  },
  previewValueBold: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: StickyMilkColors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 24,
  },
  dropdownModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: 350,
  },
  dropdownModalTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: StickyMilkColors.textDark,
    marginBottom: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#FFF7ED',
  },
  dropdownItemText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: StickyMilkColors.textDark,
  },
  dropdownItemTextSelected: {
    fontFamily: 'Nunito_700Bold',
    color: StickyMilkColors.primary,
  },
  dropdownItemSub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: StickyMilkColors.textMuted,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  saveBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: StickyMilkColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});