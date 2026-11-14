import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import { StickyMilkColors } from '@/constants/design-tokens';
import type { Role } from '@/context/auth-context';
import { useKasir } from '../../context/kasir-context';

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PERAN: { key: Role; label: string }[] = [
  { key: 'kasir', label: 'Kasir' },
  { key: 'owner', label: 'Owner' },
];

function KasirForm() {
  const router = useRouter();
  const { kasirList, tambahKasir } = useKasir();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [email, setEmail] = useState('');
  const [nama, setNama] = useState('');
  const [role, setRole] = useState<Role>('kasir');
  const [sentuh, setSentuh] = useState(false); // pesan email baru muncul setelah pengguna mengetik
  const [galat, setGalat] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  if (!fontsLoaded) return null;

  // validasi realtime
  const emailBersih = email.trim().toLowerCase();
  let pesanEmail = '';
  if (sentuh) {
    if (!emailBersih) pesanEmail = 'Email wajib diisi.';
    else if (!FORMAT_EMAIL.test(emailBersih)) pesanEmail = 'Format email tidak valid.';
    else if (kasirList.some((k) => k.email === emailBersih)) pesanEmail = 'Email sudah terdaftar.';
  }
  const valid =
    !!emailBersih && FORMAT_EMAIL.test(emailBersih) && !kasirList.some((k) => k.email === emailBersih);

  const simpan = async () => {
    setSentuh(true);
    if (!valid) return;
    setMenyimpan(true);
    setGalat('');
    try {
      await tambahKasir(emailBersih, nama, role);
      router.replace('/(owner)/manajemen-kasir');
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal menambah akun.');
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/(owner)/manajemen-kasir')}
              activeOpacity={0.7}
              accessibilityLabel="Kembali"
            >
              <Ionicons name="chevron-back" size={24} color={StickyMilkColors.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tambah Akun</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Google</Text>
            <View style={[styles.inputWrapper, !!pesanEmail && styles.inputWrapperError]}>
              <AppInput
                style={styles.input}
                placeholder="nama@gmail.com"
                placeholderTextColor={StickyMilkColors.textMuted}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setSentuh(true);
                  setGalat('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                accessibilityLabel="Email"
              />
            </View>
            {!!pesanEmail && <Text style={styles.fieldError}>{pesanEmail}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama (opsional)</Text>
            <View style={styles.inputWrapper}>
              <AppInput
                style={styles.input}
                placeholder="Nama kasir"
                placeholderTextColor={StickyMilkColors.textMuted}
                value={nama}
                onChangeText={setNama}
                accessibilityLabel="Nama"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Peran</Text>
            <View style={styles.segment}>
              {PERAN.map((p) => {
                const aktif = role === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.segmentItem, aktif && styles.segmentItemAktif]}
                    onPress={() => setRole(p.key)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: aktif }}
                  >
                    <Text style={[styles.segmentText, aktif && styles.segmentTextAktif]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {role === 'owner' && (
              <View style={styles.warn}>
                <Ionicons name="warning-outline" size={18} color="#B45309" />
                <Text style={styles.warnText}>
                  Owner mendapat akses penuh: kelola produk, stok, laporan, dan akun lain.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={StickyMilkColors.primary} />
            <Text style={styles.noteText}>
              Pengguna harus masuk dengan akun Google yang memakai email ini.
            </Text>
          </View>

          {!!galat && <Text style={styles.error}>{galat}</Text>}

          <AppButton
            style={[styles.saveBtn, !valid && styles.saveBtnOff]}
            onPress={simpan}
            disabled={!valid || menyimpan}
          >
            <Text style={styles.saveBtnText}>{menyimpan ? 'Menyimpan…' : 'Simpan'}</Text>
          </AppButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Formulir dibuat ulang setiap layar dibuka agar isiannya selalu kosong (tab tetap hidup di belakang). */
export default function TambahKasirScreen() {
  const [sesi, setSesi] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setSesi((s) => s + 1);
    }, [])
  );
  return <KasirForm key={sesi} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StickyMilkColors.cream },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 36, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
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
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: StickyMilkColors.textDark },
  formGroup: { marginBottom: 20 },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: StickyMilkColors.textDark, marginBottom: 8 },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: StickyMilkColors.borderWarm,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  inputWrapperError: { borderColor: StickyMilkColors.danger },
  input: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: StickyMilkColors.textDark },
  fieldError: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: StickyMilkColors.danger, marginTop: 6 },
  segment: {
    flexDirection: 'row',
    backgroundColor: StickyMilkColors.sand,
    borderRadius: 16,
    padding: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  segmentItemAktif: { backgroundColor: StickyMilkColors.primary },
  segmentText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: StickyMilkColors.primary },
  segmentTextAktif: { color: '#FFFFFF' },
  warn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  warnText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 12.5, color: '#92400E' },
  note: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: StickyMilkColors.iconButton,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 12.5, color: StickyMilkColors.primary },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: StickyMilkColors.danger,
    textAlign: 'center',
    marginTop: 16,
  },
  saveBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: StickyMilkColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnOff: { backgroundColor: StickyMilkColors.primaryLight },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFFFFF' },
});
