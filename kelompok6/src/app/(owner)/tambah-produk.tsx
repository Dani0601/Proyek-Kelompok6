import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import PriceField from '@/components/molecules/PriceField';
import RecipeEditor, { type ResepDraft } from '@/components/organisms/RecipeEditor';
import { DesignTokens } from '@/constants/design-tokens';
import { useProduk, type Kategori, type ResepItem } from '@/context/produk-context';

const C = DesignTokens.color;
const DRAFT_KEY = '@draft_tambah_produk';

const toResep = (items: ResepDraft[]): ResepItem[] =>
  items.map((i) => ({ bahanId: i.bahanId, jumlah: Number(i.jumlah) }));

export default function TambahProdukScreen() {
  const router = useRouter();
  const { tambahProduk } = useProduk();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<Kategori>('Minuman');
  const [hasSizes, setHasSizes] = useState(true);
  const [harga, setHarga] = useState('');
  const [hargaS, setHargaS] = useState('');
  const [hargaL, setHargaL] = useState('');
  const [resep, setResep] = useState<ResepDraft[]>([]);
  const [fotoUri, setFotoUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');

  // State + helper validasi realtime
  const [menyimpan, setMenyimpan] = useState(false);
  const [errors, setErrors] = useState<{ nama?: string; harga?: string; hargaS?: string; hargaL?: string; resep?: string }>({});
  const [touched, setTouched] = useState<{ nama?: boolean; harga?: boolean; hargaS?: boolean; hargaL?: boolean; resep?: boolean }>({});

  const tandaiSentuh = (k: 'nama' | 'harga' | 'hargaS' | 'hargaL' | 'resep') => setTouched((t) => ({ ...t, [k]: true }));

  const validasiHarga = (v: string, label: string) => {
    if (!v.trim()) return `${label} wajib diisi.`;
    const n = Number(v);
    if (Number.isNaN(n) || n <= 0) return `${label} harus lebih dari 0.`;
    return undefined;
  };

  const validasiSemua = () => ({
    nama: !nama.trim() ? 'Nama produk wajib diisi.' : undefined,
    harga: !hasSizes ? validasiHarga(harga, 'Harga') : undefined,
    hargaS: hasSizes ? validasiHarga(hargaS, 'Harga Small') : undefined,
    hargaL: hasSizes ? validasiHarga(hargaL, 'Harga Large') : undefined,
    resep: resep.length === 0 ? 'Resep wajib memiliki minimal 1 bahan baku.' : undefined,
  });

  const resepValid = resep.length > 0 && resep.every((r) => Number(r.jumlah) > 0);
  const formValid = Object.values(validasiSemua()).every((e) => !e) && resepValid;

  // Muat draft form yang tersimpan di AsyncStorage saat layar dibuka
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.nama) setNama(draft.nama);
          if (draft.kategori) setKategori(draft.kategori);
          if (typeof draft.hasSizes === 'boolean') setHasSizes(draft.hasSizes);
          if (draft.harga) setHarga(draft.harga);
          if (draft.hargaS) setHargaS(draft.hargaS);
          if (draft.hargaL) setHargaL(draft.hargaL);
          if (Array.isArray(draft.resep)) setResep(draft.resep);
          if (draft.fotoUri) setFotoUri(draft.fotoUri);
        }
      } catch (err) {
        console.log('Gagal memuat draft:', err);
      }
    })();
  }, []);

  // Simpan draft otomatis ke AsyncStorage saat field berubah
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nama || harga || hargaS || hargaL || resep.length > 0 || fotoUri) {
        AsyncStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ nama, kategori, hasSizes, harga, hargaS, hargaL, resep, fotoUri })
        ).catch(() => {});
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [nama, kategori, hasSizes, harga, hargaS, hargaL, resep, fotoUri]);

  if (!fontsLoaded) return null;

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setFotoUri(result.assets[0].uri);
  };

  const handleSimpan = async () => {
    const e = validasiSemua();
    setErrors(e);
    setTouched({ nama: true, harga: true, hargaS: true, hargaL: true, resep: true });
    if (Object.values(e).some(Boolean)) return;

    if (resep.length === 0) return setError('Resep wajib diisi minimal 1 bahan baku.');
    if (resep.some((r) => !(Number(r.jumlah) > 0))) return setError('Isi jumlah untuk semua bahan di resep.');

    const items = toResep(resep);
    setMenyimpan(true);
    try {
      await tambahProduk({
        nama: nama.trim(),
        kategori,
        hasSizes,
        foto: fotoUri ? { uri: fotoUri } : undefined,
        harga: hasSizes ? { S: Number(hargaS), L: Number(hargaL) } : { single: Number(harga) },
        // Resep awal berlaku untuk semua varian; ubah per ukuran lewat layar Edit.
        resep: hasSizes ? { S: items, L: items.map((i) => ({ ...i })) } : { single: items },
      });
      await AsyncStorage.removeItem(DRAFT_KEY);
      router.push('/(owner)/produk');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(owner)/produk')} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color={C.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tambah Produk</Text>
          </View>

          <Text style={styles.label}>Foto produk (opsional)</Text>
          <TouchableOpacity style={styles.photoBox} activeOpacity={0.7} onPress={handlePickPhoto}>
            {fotoUri ? (
              <Image source={{ uri: fotoUri }} style={styles.photoImage} />
            ) : (
              <Ionicons name="add" size={28} color={C.primary} />
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Nama produk</Text>
          <View style={[styles.inputWrapper, touched.nama && !!errors.nama && { borderColor: C.danger }]}>
            <AppInput
              style={styles.input}
              placeholder="Contoh: Sticky Milk Coklat"
              placeholderTextColor={C.textMuted}
              value={nama}
              onChangeText={(t) => {
                setNama(t);
                setErrors((p) => ({ ...p, nama: !t.trim() ? 'Nama produk wajib diisi.' : undefined }));
                setError('');
              }}
              onBlur={() => tandaiSentuh('nama')}
              invalid={touched.nama && !!errors.nama}
            />
          </View>
          {!!(touched.nama && errors.nama) && <Text style={styles.fieldError}>{errors.nama}</Text>}

          <Text style={styles.label}>Kategori</Text>
          <View style={styles.chipsRow}>
            {(['Minuman', 'Topping'] as Kategori[]).map((k) => (
              <Chip key={k} text={k} selected={kategori === k} onPress={() => setKategori(k)} />
            ))}
          </View>

          <Text style={styles.label}>Jenis harga</Text>
          <View style={styles.chipsRow}>
            <Chip text="Satu harga" selected={!hasSizes} onPress={() => setHasSizes(false)} />
            <Chip text="S & L" selected={hasSizes} onPress={() => setHasSizes(true)} />
          </View>

          {hasSizes ? (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <PriceField
                  label="Harga Small"
                  value={hargaS}
                  onChangeText={(t) => {
                    setHargaS(t);
                    setErrors((p) => ({ ...p, hargaS: validasiHarga(t, 'Harga Small') }));
                    setError('');
                  }}
                  invalid={touched.hargaS && !!errors.hargaS}
                  onBlur={() => tandaiSentuh('hargaS')}
                  error={touched.hargaS ? errors.hargaS : undefined}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PriceField
                  label="Harga Large"
                  value={hargaL}
                  onChangeText={(t) => {
                    setHargaL(t);
                    setErrors((p) => ({ ...p, hargaL: validasiHarga(t, 'Harga Large') }));
                    setError('');
                  }}
                  invalid={touched.hargaL && !!errors.hargaL}
                  onBlur={() => tandaiSentuh('hargaL')}
                  error={touched.hargaL ? errors.hargaL : undefined}
                />
              </View>
            </View>
          ) : (
            <PriceField
              label="Harga"
              value={harga}
              onChangeText={(t) => {
                setHarga(t);
                setErrors((p) => ({ ...p, harga: validasiHarga(t, 'Harga') }));
                setError('');
              }}
              invalid={touched.harga && !!errors.harga}
              onBlur={() => tandaiSentuh('harga')}
              error={touched.harga ? errors.harga : undefined}
            />
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Resep · Bahan per porsi</Text>
          <RecipeEditor items={resep} onChange={(items) => { setResep(items); setError(''); }} />
          <Text style={styles.note}>Stok bahan akan berkurang otomatis setiap produk ini terjual.</Text>

          {resep.length === 0 && (
            <Text style={styles.resepWarning}>* Wajib menambahkan minimal 1 bahan baku ke dalam resep.</Text>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <AppButton style={styles.saveBtn} onPress={handleSimpan} disabled={menyimpan || !formValid}>
            <Text style={styles.saveBtnText}>{menyimpan ? 'Menyimpan…' : 'Simpan Produk & Resep'}</Text>
          </AppButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ text, selected, onPress }: { text: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  backButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: C.textDark },
  label: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: C.textDark, marginBottom: 8, marginTop: 4 },
  photoBox: {
    width: 90, height: 90, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%', borderRadius: 14 },
  inputWrapper: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: C.borderWarm,
    paddingHorizontal: 16, height: 52, justifyContent: 'center', marginBottom: 16,
  },
  input: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: C.textDark },
  fieldError: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.danger, marginBottom: 12, marginLeft: 4 },
  chipsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chip: {
    flex: 1, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.borderWarm,
    alignItems: 'center', justifyContent: 'center',
  },
  chipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.primary },
  chipTextSelected: { color: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 12 },
  divider: { height: 1, backgroundColor: C.borderWarm, marginVertical: 12 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: C.textDark, marginBottom: 12 },
  note: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 12 },
  resepWarning: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.danger, textAlign: 'center', marginBottom: 12 },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.danger, textAlign: 'center', marginBottom: 12 },
  saveBtn: { height: 54, borderRadius: 27, backgroundColor: C.primary },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFFFFF' },
});
