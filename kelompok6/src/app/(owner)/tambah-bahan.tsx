import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import { StickyMilkColors } from '@/constants/design-tokens';
import { useBahan } from '../../context/bahan-context';
import { useProduk } from '../../context/produk-context';

const UNITS: Array<'ml' | 'gram' | 'pcs'> = ['ml', 'gram', 'pcs'];

const hanyaAngka = (t: string) => t.replace(/[^0-9]/g, '');

function BahanForm({ bahanId }: { bahanId?: string }) {
  const router = useRouter();
  const { bahanList, tambahBahan, updateBahan, hapusBahan } = useBahan();
  const { produkList } = useProduk();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const existingBahan = bahanId ? bahanList.find((b) => b.id === bahanId) : undefined;

  const [nama, setNama] = useState(existingBahan?.nama ?? '');
  const [satuan, setSatuan] = useState<'ml' | 'gram' | 'pcs'>(existingBahan?.satuan ?? 'ml');
  const [stok, setStok] = useState(existingBahan ? String(existingBahan.stok) : '');
  const [minimum, setMinimum] = useState(existingBahan ? String(existingBahan.minimum) : '');
  const [error, setError] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [modalHapusVisible, setModalHapusVisible] = useState(false);
  const [infoHapus, setInfoHapus] = useState(''); // pesan 'tidak bisa dihapus' (kosong = tertutup)

  if (!fontsLoaded) return null;

  // Dibuka dengan id, tapi bahannya tidak ada (mis. sudah dihapus)
  if (bahanId && !existingBahan) {
    return (
      <SafeAreaView style={styles.notFound} edges={['top']}>
        <Text style={styles.notFoundText}>Bahan tidak ditemukan.</Text>
        <AppButton style={styles.saveBtn} onPress={() => router.push('/(owner)/stok')}>
          <Text style={styles.saveBtnText}>Kembali</Text>
        </AppButton>
      </SafeAreaView>
    );
  }

  // Resep produk yang masih memakai bahan ini (bahan tidak boleh dihapus selama masih dipakai)
  const dipakaiDi = existingBahan
    ? produkList.filter((p) =>
        Object.values(p.resep).some((items) => items?.some((i) => i.bahanId === existingBahan.id))
      )
    : [];

  const handleSimpan = async () => {
    const namaBersih = nama.trim();
    if (!namaBersih) return setError('Nama bahan wajib diisi.');

    const duplikat = bahanList.some(
      (b) => b.id !== existingBahan?.id && b.nama.trim().toLowerCase() === namaBersih.toLowerCase()
    );
    if (duplikat) return setError('Bahan dengan nama ini sudah ada.');

    const data = {
      nama: namaBersih,
      satuan,
      stok: Number(stok) || 0,
      minimum: Number(minimum) || 0,
    };

    setMenyimpan(true);
    try {
      if (existingBahan) await updateBahan(existingBahan.id, data);
      else await tambahBahan(data);
      router.push('/(owner)/stok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan bahan.');
    } finally {
      setMenyimpan(false);
    }
  };

  const handleHapusClick = () => {
    if (!existingBahan) return;

    if (dipakaiDi.length > 0) {
      setInfoHapus(
        `"${existingBahan.nama}" masih dipakai di resep: ${dipakaiDi
          .map((p) => p.nama)
          .join(', ')}. Hapus dulu dari resep tersebut.`
      );
      return;
    }

    setModalHapusVisible(true);
  };

  const eksekusiHapus = async () => {
    if (!existingBahan) return;
    setModalHapusVisible(false);
    try {
      await hapusBahan(existingBahan.id);
      router.push('/(owner)/stok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus bahan.');
    }
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
            <Text style={styles.headerTitle}>
              {existingBahan ? 'Edit Bahan' : 'Tambah Bahan'}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama bahan</Text>
            <View style={styles.inputWrapper}>
              <AppInput
                style={styles.input}
                placeholder="Masukkan nama bahan"
                placeholderTextColor={StickyMilkColors.textMuted}
                value={nama}
                onChangeText={(t) => {
                  setNama(t);
                  setError('');
                }}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Satuan</Text>
            <View style={styles.chipsRow}>
              {UNITS.map((u) => {
                const isSelected = satuan === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSatuan(u)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{u}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Stok saat ini</Text>
            <View style={styles.inputSuffixWrapper}>
              <AppInput
                style={styles.inputWithSuffix}
                placeholder="0"
                placeholderTextColor={StickyMilkColors.textMuted}
                keyboardType="numeric"
                value={stok}
                onChangeText={(t) => setStok(hanyaAngka(t))}
              />
              <Text style={styles.suffixText}>{satuan}</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Batas minimum (ingatkan jika di bawah ini)</Text>
            <View style={styles.inputSuffixWrapper}>
              <AppInput
                style={styles.inputWithSuffix}
                placeholder="0"
                placeholderTextColor={StickyMilkColors.textMuted}
                keyboardType="numeric"
                value={minimum}
                onChangeText={(t) => setMinimum(hanyaAngka(t))}
              />
              <Text style={styles.suffixText}>{satuan}</Text>
            </View>
          </View>

          <View style={styles.spacer} />

          {!!error && <Text style={styles.error}>{error}</Text>}

          {/* Tombol Simpan */}
          <AppButton style={styles.saveBtn} onPress={handleSimpan} disabled={menyimpan}>
            <Text style={styles.saveBtnText}>{menyimpan ? 'Menyimpan…' : 'Simpan'}</Text>
          </AppButton>

          {/* Tombol Hapus (hanya saat edit) */}
          {existingBahan && (
            <AppButton style={styles.deleteBtn} onPress={handleHapusClick} disabled={menyimpan}>
              <Text style={styles.deleteBtnText}>Hapus Bahan</Text>
            </AppButton>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dialog konfirmasi hapus + info bahan masih dipakai (komponen seragam) */}
      {existingBahan && (
        <>
          <DialogLokal
            visible={modalHapusVisible}
            title="Hapus bahan?"
            message={`"${existingBahan.nama}" beserta riwayat pengadaannya akan dihapus permanen.`}
            onClose={() => setModalHapusVisible(false)}
            onConfirm={eksekusiHapus}
          />
          <DialogLokal
            visible={infoHapus !== ''}
            title="Bahan tidak bisa dihapus"
            message={infoHapus}
            icon="alert-circle-outline"
            onClose={() => setInfoHapus('')}
          />
        </>
      )}
    </SafeAreaView>
  );
}

/**
 * Formulir dibuat ulang setiap kali layar dibuka, supaya isiannya selalu segar
 * (layar tab tetap hidup di belakang, sehingga state lama bisa terbawa).
 */
export default function TambahBahanScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [sesi, setSesi] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setSesi((s) => s + 1);
    }, [])
  );

  const bahanId = id && id.length > 0 ? id : undefined; // id kosong = mode tambah
  return <BahanForm key={`${bahanId ?? 'baru'}-${sesi}`} bahanId={bahanId} />;
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
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: StickyMilkColors.borderWarm,
  },
  chipSelected: {
    backgroundColor: StickyMilkColors.primary,
    borderColor: StickyMilkColors.primary,
  },
  chipText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: StickyMilkColors.primary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
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
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: StickyMilkColors.danger,
    textAlign: 'center',
    marginTop: 12,
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
  deleteBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: StickyMilkColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  deleteBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: StickyMilkColors.danger,
  },
  notFound: {
    flex: 1,
    backgroundColor: StickyMilkColors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  notFoundText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: StickyMilkColors.textMuted,
    marginBottom: 16,
  },
});

/** Dialog lokal (kartu krem, tombol pil) — gaya sama dengan dialog hapus di halaman Produk. */
function DialogLokal({
  visible,
  title,
  message,
  icon = 'trash-outline',
  onClose,
  onConfirm,
  confirmLabel = 'Hapus',
}: {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onClose: () => void;
  onConfirm?: () => void; // kosong = dialog info dengan satu tombol OK
  confirmLabel?: string;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={dlg.overlay}>
        <View style={dlg.dialog}>
          <View style={dlg.icon}>
            <Ionicons name={icon} size={24} color={StickyMilkColors.danger} />
          </View>
          <Text style={dlg.title}>{title}</Text>
          <Text style={dlg.text}>{message}</Text>
          {onConfirm ? (
            <View style={dlg.row}>
              <TouchableOpacity style={[dlg.button, dlg.cancel]} activeOpacity={0.8} onPress={onClose}>
                <Text style={dlg.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dlg.button, dlg.danger]} activeOpacity={0.85} onPress={onConfirm}>
                <Text style={dlg.buttonText}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[dlg.button, dlg.primary, dlg.full]} activeOpacity={0.85} onPress={onClose}>
              <Text style={dlg.buttonText}>OK</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const dlg = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: StickyMilkColors.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  dialog: { width: '100%', backgroundColor: StickyMilkColors.cream, borderRadius: 24, padding: 24, alignItems: 'center' },
  icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: StickyMilkColors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: StickyMilkColors.textDark, marginBottom: 6, textAlign: 'center' },
  text: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: StickyMilkColors.textMuted, textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12, width: '100%' },
  button: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', flex: 0 },
  cancel: { backgroundColor: StickyMilkColors.sand },
  danger: { backgroundColor: StickyMilkColors.danger },
  primary: { backgroundColor: StickyMilkColors.primary },
  cancelText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: StickyMilkColors.primary },
  buttonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#FFFFFF' },
});