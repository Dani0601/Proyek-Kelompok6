import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import { StickyMilkColors } from '@/constants/design-tokens';
import { useBahan } from '../../context/bahan-context';

const UNITS: Array<'ml' | 'gram' | 'pcs'> = ['ml', 'gram', 'pcs'];

export default function TambahBahanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { bahanList, tambahBahan, updateBahan } = useBahan();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const existingBahan = id ? bahanList.find((b) => b.id === id) : undefined;

  const [nama, setNama] = useState(existingBahan?.nama || '');
  const [satuan, setSatuan] = useState<'ml' | 'gram' | 'pcs'>(existingBahan?.satuan || 'ml');
  const [stok, setStok] = useState(existingBahan ? existingBahan.stok.toString() : '');
  const [minimum, setMinimum] = useState(existingBahan ? existingBahan.minimum.toString() : '');

  useEffect(() => {
    if (existingBahan) {
      setNama(existingBahan.nama);
      setSatuan(existingBahan.satuan);
      setStok(existingBahan.stok.toString());
      setMinimum(existingBahan.minimum.toString());
    }
  }, [existingBahan]);

  if (!fontsLoaded) return null;

  const handleSimpan = () => {
    if (!nama.trim()) return;

    const stokNum = parseFloat(stok.replace(/\./g, '').replace(/,/g, '')) || 0;
    const minNum = parseFloat(minimum.replace(/\./g, '').replace(/,/g, '')) || 0;

    if (existingBahan) {
      updateBahan(existingBahan.id, {
        nama: nama.trim(),
        satuan,
        stok: stokNum,
        minimum: minNum,
      });
    } else {
      tambahBahan({
        nama: nama.trim(),
        satuan,
        stok: stokNum,
        minimum: minNum,
      });
    }

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
                onChangeText={setNama}
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
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {u}
                    </Text>
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
                onChangeText={setStok}
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
                onChangeText={setMinimum}
              />
              <Text style={styles.suffixText}>{satuan}</Text>
            </View>
          </View>

          <View style={styles.spacer} />

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
