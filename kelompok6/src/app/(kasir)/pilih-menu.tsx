import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import ProductCard from '@/components/molecules/ProductCard';
import ProductList from '@/components/organisms/ProductList';
import PageTemplate from '@/components/templates/PageTemplate';
import { DesignTokens } from '@/constants/design-tokens';
import { useKeranjang } from '@/context/keranjang-context';
import { formatRupiah, useProduk, type Produk, type Varian } from '@/context/produk-context';
import { showAlert } from '@/utils/show-alert';

const C = DesignTokens.color;

const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};

const KATEGORI = ['Semua', 'Sticky Milk', 'Smoothies', 'Topping'] as const;
type Kategori = (typeof KATEGORI)[number];

// "Sticky Milk" dan "Smoothies" dikenali dari awalan nama produk; "Topping" dari kategori produk
const cocokKategori = (p: Produk, k: Kategori) => {
  if (k === 'Semua') return true;
  if (k === 'Topping') return p.kategori === 'Topping';
  return p.nama.toLowerCase().startsWith(k.toLowerCase());
};

const angka = (n?: number) => formatRupiah(n).replace('Rp ', '');
const hargaLabel = (p: Produk) =>
  p.hasSizes ? `S ${angka(p.harga.S)} · L ${angka(p.harga.L)}` : formatRupiah(p.harga.single);

export default function PilihMenuScreen() {
  const router = useRouter();
  const { produkList } = useProduk();
  const { jumlahItem, total, qtyProduk, ubahQty, bisaTambah } = useKeranjang();

  const [fontsLoaded] = useFonts({ Poppins_600SemiBold, Poppins_700Bold, Nunito_400Regular, Nunito_700Bold });

  const [query, setQuery] = useState('');
  const [kategori, setKategori] = useState<Kategori>('Semua');

  const daftar = useMemo(() => {
    const q = query.trim().toLowerCase();
    return produkList.filter((p) => cocokKategori(p, kategori) && (!q || p.nama.toLowerCase().includes(q)));
  }, [produkList, query, kategori]);

  const keTransaksi = () => router.navigate('/(kasir)/transaksi');

  const tambah = (p: Produk, varian: Varian) => {
    const hasil = ubahQty(p.id, varian, 1);
    if (!hasil.ok) {
      showAlert('Stok tidak cukup', `Stok ${hasil.kurang.join(', ')} tidak cukup untuk menambah ${p.nama}.`);
    }
  };

  return (
    <PageTemplate>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <AppButton onPress={keTransaksi} accessibilityLabel="Kembali" style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </AppButton>
          <Text style={styles.title}>Pilih Menu</Text>
        </View>

        {/* Pencarian */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={C.textMuted} />
          <AppInput
            style={styles.searchInput}
            placeholder="Cari menu"
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Cari menu"
          />
        </View>

        {/* Filter kategori */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {KATEGORI.map((k) => {
            const active = kategori === k;
            return (
              <AppButton
                key={k}
                onPress={() => setKategori(k)}
                accessibilityLabel={`Kategori ${k}`}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                textStyle={[styles.chipText, { color: active ? C.white : C.primary }]}
              >
                {k}
              </AppButton>
            );
          })}
        </ScrollView>

        {/* Daftar menu */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ProductList itemSpacing={12}>
            {daftar.map((p) => {
              const varianList: Varian[] = p.hasSizes ? ['S', 'L'] : ['single'];
              return (
                <ProductCard
                  key={p.id}
                  title={p.nama}
                  subtitle={hargaLabel(p)}
                  accent={p.accent}
                  foto={p.foto}
                  badge={qtyProduk(p.id)}
                  style={styles.card}
                >
                  <View style={styles.addRow}>
                    {varianList.map((v) => {
                      const filled = v !== 'S';
                      const habis = !bisaTambah(p.id, v);
                      return (
                        <AppButton
                          key={v}
                          onPress={() => tambah(p, v)}
                          accessibilityLabel={v === 'single' ? `Tambah ${p.nama}` : `Tambah ${p.nama} ukuran ${v}`}
                          style={[
                            styles.addBtn,
                            v === 'single' && styles.addBtnWide,
                            filled ? styles.addBtnFilled : styles.addBtnOutline,
                            habis && styles.addBtnHabis,
                          ]}
                          textStyle={[styles.addText, { color: filled ? C.white : C.primary }]}
                        >
                          {v === 'single' ? '+ Tambah' : `+ ${v}`}
                        </AppButton>
                      );
                    })}
                  </View>
                </ProductCard>
              );
            })}
          </ProductList>

          {daftar.length === 0 && <Text style={styles.empty}>Menu tidak ditemukan.</Text>}
        </ScrollView>

        {/* Tombol lihat pesanan */}
        <View style={styles.footer}>
          <AppButton onPress={keTransaksi} style={styles.footerBtn} textStyle={styles.footerText}>
            {jumlahItem > 0
              ? `Lihat Pesanan (${jumlahItem}) · ${formatRupiah(total)}`
              : 'Kembali ke Pesanan'}
          </AppButton>
        </View>
      </SafeAreaView>
    </PageTemplate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: DesignTokens.radius.pill, backgroundColor: C.surface },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: C.text },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginHorizontal: 22,
    marginTop: 18,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: C.text,
    padding: 0,
  },

  chipScroll: { flexGrow: 0, marginTop: 12 },
  chipRow: { paddingHorizontal: 22, gap: 8 },
  chip: { height: 33, paddingHorizontal: 16, borderRadius: DesignTokens.radius.pill },
  chipActive: { backgroundColor: C.primary },
  chipInactive: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  chipText: { fontFamily: FONTS.headingSemi, fontSize: 13 },

  listContent: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 16 },
  card: { borderRadius: 22, paddingHorizontal: 15 },

  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { minWidth: 48, height: 34, paddingHorizontal: 12, borderRadius: DesignTokens.radius.pill },
  addBtnWide: { minWidth: 84 },
  addBtnOutline: { borderWidth: 1.5, borderColor: C.primary },
  addBtnFilled: { backgroundColor: C.primary },
  addBtnHabis: { opacity: 0.35 },
  addText: { fontFamily: FONTS.headingSemi, fontSize: 13, fontWeight: '600' },

  empty: { fontFamily: FONTS.body, fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 24 },

  footer: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16 },
  footerBtn: { height: 52, borderRadius: 26, backgroundColor: C.primary },
  footerText: { fontFamily: FONTS.heading, fontSize: 16, color: C.white, fontWeight: '700' },
});