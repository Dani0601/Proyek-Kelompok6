import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  type ImageSourcePropType,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import PriceField from '@/components/molecules/PriceField';
import RecipeEditor, { type ResepDraft } from '@/components/organisms/RecipeEditor';
import { DesignTokens } from '@/constants/design-tokens';
import { useProduk, type Kategori, type Produk, type ResepItem, type Varian } from '@/context/produk-context';

const C = DesignTokens.color;

const VARIAN_LABEL: Record<Varian, string> = { single: 'Standar', S: 'Small', L: 'Large' };

const toDraft = (items: ResepItem[] | undefined): ResepDraft[] =>
  (items ?? []).map((i) => ({ bahanId: i.bahanId, jumlah: String(i.jumlah) }));

const toResep = (items: ResepDraft[]): ResepItem[] =>
  items.map((i) => ({ bahanId: i.bahanId, jumlah: Number(i.jumlah) }));

export default function EditProdukScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getProduk } = useProduk();
  const produk = id ? getProduk(id) : undefined;

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) return null;
  // Produk tidak ditemukan (misalnya baru dihapus): tampilkan kosong, form di bawah butuh data.
  if (!produk) return <SafeAreaView style={styles.safe} />;

  // `key` memastikan form dibuat ulang bila membuka produk lain.
  return <EditForm key={produk.id} produk={produk} />;
}

function EditForm({ produk }: { produk: Produk }) {
  const router = useRouter();
  const { updateProduk } = useProduk();

  const [nama, setNama] = useState(produk.nama);
  const [kategori, setKategori] = useState<Kategori>(produk.kategori);
  const [hasSizes, setHasSizes] = useState(produk.hasSizes);
  const [foto, setFoto] = useState<ImageSourcePropType | undefined>(produk.foto);
  const [hargaS, setHargaS] = useState(String(produk.harga.S ?? ''));
  const [hargaL, setHargaL] = useState(String(produk.harga.L ?? ''));
  const [harga, setHarga] = useState(String(produk.harga.single ?? ''));
  const variants: Varian[] = hasSizes ? ['S', 'L'] : ['single'];
  const [selected, setSelected] = useState<Varian>(produk.hasSizes ? 'L' : 'single');
  const [menuOpen, setMenuOpen] = useState(false);
  const [resep, setResep] = useState<Partial<Record<Varian, ResepDraft[]>>>(() => ({
    S: toDraft(produk.resep.S),
    L: toDraft(produk.resep.L),
    single: toDraft(produk.resep.single),
  }));
  const [error, setError] = useState('');

  // State + helper validasi realtime di EditForm (pola yang sama dengan TambahProdukScreen).
  const [menyimpan, setMenyimpan] = useState(false);
  const [errors, setErrors] = useState<{ nama?: string; harga?: string; hargaS?: string; hargaL?: string }>({});
  const [touched, setTouched] = useState<{ nama?: boolean; harga?: boolean; hargaS?: boolean; hargaL?: boolean }>({});

  const tandaiSentuh = (k: 'nama' | 'harga' | 'hargaS' | 'hargaL') => setTouched((t) => ({ ...t, [k]: true }));

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
  });

  const resepValid = variants.every(
    (v) => (resep[v] ?? []).length > 0 && (resep[v] ?? []).every((r) => Number(r.jumlah) > 0)
  );
  const formValid = Object.values(validasiSemua()).every((e) => !e) && resepValid;

  const menuLabel = (v: Varian) => (hasSizes ? `${nama.trim() || produk.nama} · ${VARIAN_LABEL[v]}` : nama.trim() || produk.nama);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setFoto({ uri: result.assets[0].uri });
  };

  // Ganti jenis harga: resep varian yang belum ada disalin dari varian lain agar tidak kosong.
  const changeHasSizes = (value: boolean) => {
    if (value === hasSizes) return;
    setResep((r) => {
      if (value) {
        const base = r.single?.length ? r.single : r.L ?? [];
        return {
          ...r,
          S: r.S?.length ? r.S : base.map((i) => ({ ...i })),
          L: r.L?.length ? r.L : base.map((i) => ({ ...i })),
        };
      }
      const base = r.L?.length ? r.L : r.S ?? [];
      return { ...r, single: r.single?.length ? r.single : base.map((i) => ({ ...i })) };
    });
    setHasSizes(value);
    setSelected(value ? 'L' : 'single');
    setMenuOpen(false);
    setError('');
  };

  const handleSimpan = async () => {
    const e = validasiSemua();
    setErrors(e);
    setTouched({ nama: true, harga: true, hargaS: true, hargaL: true });
    if (Object.values(e).some(Boolean)) return;

    for (const v of variants) {
      const items = resep[v] ?? [];
      if (items.length === 0) {
        setSelected(v);
        return setError(`Resep untuk varian ${VARIAN_LABEL[v]} wajib memiliki minimal 1 bahan.`);
      }
      if (items.some((r) => !(Number(r.jumlah) > 0))) {
        setSelected(v);
        return setError(`Isi jumlah untuk semua bahan di resep ${VARIAN_LABEL[v]}.`);
      }
    }

    setMenyimpan(true);
    try {
      await updateProduk(produk.id, {
        nama: nama.trim(),
        kategori,
        hasSizes,
        foto,
        harga: hasSizes ? { S: Number(hargaS), L: Number(hargaL) } : { single: Number(harga) },
        resep: Object.fromEntries(variants.map((v) => [v, toResep(resep[v] ?? [])])),
      });
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
            <Text style={styles.headerTitle}>Edit Menu</Text>
          </View>

          {/* Pilih menu / ukuran yang resepnya diedit */}
          <TouchableOpacity
            style={styles.selector}
            activeOpacity={0.8}
            disabled={variants.length < 2}
            onPress={() => setMenuOpen((o) => !o)}
          >
            <View style={styles.selectorThumb}>
              {foto ? (
                <Image source={foto} style={styles.thumbImage} />
              ) : (
                <View style={[styles.thumbInner, { backgroundColor: produk.accent }]} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectorHint}>Menu</Text>
              <Text style={styles.selectorValue} numberOfLines={1}>{menuLabel(selected)}</Text>
            </View>
            {variants.length > 1 && <Ionicons name={menuOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.textDark} />}
          </TouchableOpacity>

          {menuOpen && (
            <View style={styles.dropdown}>
              {variants.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={styles.dropdownItem}
                  activeOpacity={0.7}
                  onPress={() => { setSelected(v); setMenuOpen(false); }}
                >
                  <Text style={[styles.dropdownText, v === selected && { color: C.primary }]}>{menuLabel(v)}</Text>
                  {v === selected && <Ionicons name="checkmark" size={18} color={C.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Foto produk</Text>
          <TouchableOpacity style={styles.photoBox} activeOpacity={0.7} onPress={handlePickPhoto}>
            {foto ? (
              <Image source={foto} style={styles.photoImage} />
            ) : (
              <Ionicons name="add" size={28} color={C.primary} />
            )}
          </TouchableOpacity>
          {!!foto && (
            <TouchableOpacity onPress={() => setFoto(undefined)} activeOpacity={0.7} style={styles.removePhoto}>
              <Text style={styles.removePhotoText}>Hapus foto</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Nama produk</Text>
          <View style={[styles.inputWrapper, touched.nama && !!errors.nama && { borderColor: C.danger }]}>
            <AppInput
              style={styles.input}
              value={nama}
              onChangeText={(t) => {
                setNama(t);
                setErrors((p) => ({ ...p, nama: !t.trim() ? 'Nama produk wajib diisi.' : undefined }));
                setError('');
              }}
              onBlur={() => tandaiSentuh('nama')}
              invalid={touched.nama && !!errors.nama}
              placeholder="Nama produk"
              placeholderTextColor={C.textMuted}
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
            <Chip text="Satu harga" selected={!hasSizes} onPress={() => changeHasSizes(false)} />
            <Chip text="S & L" selected={hasSizes} onPress={() => changeHasSizes(true)} />
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

          <Text style={styles.sectionTitle}>Bahan per porsi</Text>
          <RecipeEditor
            items={resep[selected] ?? []}
            onChange={(items) => { setResep((r) => ({ ...r, [selected]: items })); setError(''); }}
          />
          <Text style={styles.note}>Stok bahan akan berkurang otomatis setiap menu ini terjual.</Text>

          {(resep[selected] ?? []).length === 0 && (
            <Text style={styles.resepWarning}>* Wajib menambahkan minimal 1 bahan baku ke dalam resep.</Text>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <AppButton style={styles.saveBtn} onPress={handleSimpan} disabled={menyimpan || !formValid}>
            <Text style={styles.saveBtnText}>{menyimpan ? 'Menyimpan…' : 'Simpan Perubahan'}</Text>
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
  photoBox: {
    width: 90, height: 90, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  removePhoto: { marginTop: 8, alignSelf: 'flex-start' },
  removePhotoText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: C.danger },
  chipsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chip: {
    flex: 1, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: C.borderWarm,
    alignItems: 'center', justifyContent: 'center',
  },
  chipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.primary },
  chipTextSelected: { color: '#FFFFFF' },
  safe: { flex: 1, backgroundColor: C.cream },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  backButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: C.textDark },

  selector: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 10, paddingRight: 16 },
  selectorThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.sand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: 44, height: 44 },
  thumbInner: { width: 17, height: 29, borderRadius: 7 },
  selectorHint: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: C.textMuted },
  selectorValue: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: C.textDark },
  dropdown: { backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: 6, paddingVertical: 4 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  dropdownText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: C.textDark },

  label: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: C.textDark, marginBottom: 8, marginTop: 18 },
  inputWrapper: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: C.borderWarm,
    paddingHorizontal: 16, height: 52, justifyContent: 'center', marginBottom: 16,
  },
  input: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: C.textDark },
  fieldError: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.danger, marginBottom: 12, marginLeft: 4 },
  row: { flexDirection: 'row', gap: 12 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: C.textDark, marginTop: 8, marginBottom: 12 },
  note: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 12 },
  resepWarning: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.danger, textAlign: 'center', marginBottom: 12 },
  error: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.danger, textAlign: 'center', marginBottom: 12 },
  saveBtn: { height: 54, borderRadius: 27, backgroundColor: C.primary },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#FFFFFF' },
});
