import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import { DesignTokens } from '@/constants/design-tokens';
import { priceLabel, useProduk, type Kategori, type Produk } from '@/context/produk-context';
import { supabase } from '@/lib/supabase';

const COLORS = {
  background: DesignTokens.color.cream,
  card: DesignTokens.color.surface,
  brown: DesignTokens.color.primary,
  sand: DesignTokens.color.sand,
  textDark: DesignTokens.color.textDark,
  textMuted: DesignTokens.color.textMuted,
  border: DesignTokens.color.borderWarm,
  iconButton: DesignTokens.color.iconButton,
  danger: DesignTokens.color.danger,
  dangerSoft: DesignTokens.color.dangerSoft,
  overlay: DesignTokens.color.overlay,
};

const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};

export default function ProdukScreen() {
  const router = useRouter();
  const { produkList, hapusProduk, refresh, memuat } = useProduk();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [query, setQuery] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState<'Semua' | Kategori>('Semua');
  const [deleteTarget, setDeleteTarget] = useState<Produk | null>(null);

  // Uji koneksi Langkah 5.2 ke Supabase (akan tampil di console terminal Metro)
  useEffect(() => {
    (async () => {
      const { error, count } = await supabase
        .from('produk')
        .select('id', { count: 'exact', head: true });
      if (error) console.log('KONEKSI GAGAL:', error.message);
      else console.log('KONEKSI OK, jumlah produk:', count);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return produkList.filter((p) => {
      const matchQuery = !q || p.nama.toLowerCase().includes(q);
      const matchKategori = kategoriFilter === 'Semua' || p.kategori === kategoriFilter;
      return matchQuery && matchKategori;
    });
  }, [produkList, query, kategoriFilter]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hapusProduk(deleteTarget.id);
    } catch (e) {
      Alert.alert('Gagal menghapus', e instanceof Error ? e.message : 'Terjadi kesalahan.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Manajemen Produk</Text>
            <Text style={styles.subtitle}>Kelola nama produk dan harga</Text>
          </View>
        </View>

        {/* Pencarian */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={24} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk"
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Chip filter kategori */}
        <View style={styles.filterRow}>
          {(['Semua', 'Minuman', 'Topping'] as const).map((kat) => {
            const active = kategoriFilter === kat;
            return (
              <TouchableOpacity
                key={kat}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setKategoriFilter(kat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{kat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Indikator loading */}
        {memuat && produkList.length === 0 && (
          <ActivityIndicator size="large" color={COLORS.brown} style={{ marginVertical: 20 }} />
        )}

        {/* Daftar produk */}
        {filtered.map((item) => (
          <Pressable key={item.id} style={styles.card}>
            <View style={styles.thumb}>
              {item.foto ? (
                <Image source={item.foto} style={styles.thumbImage} />
              ) : (
                <View style={[styles.thumbInner, { backgroundColor: item.accent }]} />
              )}
            </View>

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.nama}</Text>
              <Text style={styles.price}>{priceLabel(item)}</Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/(owner)/edit-produk', params: { id: item.id } })}
            >
              <Ionicons name="pencil" size={15} color={COLORS.brown} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} activeOpacity={0.7} onPress={() => setDeleteTarget(item)}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </Pressable>
        ))}

        {!memuat && filtered.length === 0 && (
          <Text style={styles.empty}>
            {produkList.length === 0 ? 'Belum ada produk. Tekan "+ Tambah Produk" untuk mulai.' : 'Produk tidak ditemukan.'}
          </Text>
        )}
      </ScrollView>

      {/* Tombol tambah (tetap di bawah) */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={() => router.push('/(owner)/tambah-produk')}>
          <Text style={styles.addButtonText}>+ Tambah Produk</Text>
        </TouchableOpacity>
      </View>

      {/* Konfirmasi hapus */}
      <Modal visible={deleteTarget !== null} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.dialogTitle}>Hapus produk?</Text>
            <Text style={styles.dialogText}>
              {deleteTarget ? `"${deleteTarget.nama}"` : ''} akan dihapus dari daftar produk.
            </Text>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.sheetButton, styles.cancelButton]} activeOpacity={0.8} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetButton, styles.dangerButton]} activeOpacity={0.85} onPress={confirmDelete}>
                <Text style={styles.saveText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 32 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  resepButton: { height: 40, paddingHorizontal: 22, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  resepText: { fontFamily: FONTS.headingSemi, fontSize: 14, color: COLORS.textDark },
  footer: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16, backgroundColor: COLORS.background },
  title: { fontFamily: FONTS.heading, fontSize: 26, lineHeight: 36, color: COLORS.textDark },
  subtitle: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, marginBottom: 14 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  searchInput: { flex: 1, marginLeft: 12, fontFamily: FONTS.body, fontSize: 15, color: COLORS.textDark, padding: 0 },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.brown,
    borderColor: COLORS.brown,
  },
  filterChipText: {
    fontFamily: FONTS.headingSemi,
    fontSize: 13,
    color: COLORS.textDark,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 84,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  thumb: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: 52, height: 52 },
  thumbInner: { width: 20, height: 32, borderRadius: 6 },
  info: { flex: 1, marginLeft: 12, marginRight: 6 },
  name: { fontFamily: FONTS.heading, fontSize: 16, color: COLORS.textDark },
  price: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.brown, marginTop: 2 },
  deleteButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.dangerSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  editButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.iconButton, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginVertical: 20 },

  addButton: { height: 54, borderRadius: 27, backgroundColor: COLORS.brown, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { fontFamily: FONTS.headingSemi, fontSize: 16, color: '#FFFFFF' },

  // ----- Dialog hapus -----
  row: { flexDirection: 'row', gap: 12 },
  sheetButton: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: COLORS.sand },
  dangerButton: { backgroundColor: COLORS.danger },
  cancelText: { fontFamily: FONTS.headingSemi, fontSize: 15, color: COLORS.brown },
  saveText: { fontFamily: FONTS.headingSemi, fontSize: 15, color: '#FFFFFF' },
  dialogOverlay: { flex: 1, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  dialog: { width: '100%', backgroundColor: COLORS.background, borderRadius: 24, padding: 24, alignItems: 'center' },
  dialogIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dialogTitle: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.textDark, marginBottom: 6 },
  dialogText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 },
});
