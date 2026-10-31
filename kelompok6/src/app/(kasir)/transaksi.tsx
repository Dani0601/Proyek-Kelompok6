import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';

import { useOrders, type Metode } from '@/context/order-context';
import { useKeranjang } from '@/context/keranjang-context';
import { formatRupiah } from '@/context/produk-context';
import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import ProductCard from '@/components/molecules/ProductCard';
import ProductList from '@/components/organisms/ProductList';
import PageTemplate from '@/components/templates/PageTemplate';
import { DesignTokens } from '@/constants/design-tokens';
import { KASIR_AKTIF, type DetailTransaksi } from '@/utils/detail-transaksi';
import { showAlert } from '@/utils/show-alert';

const C = DesignTokens.color;

const FONTS = {
  heading: 'Poppins_700Bold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};

const METHODS: Metode[] = ['Tunai', 'QRIS'];

const parseNumber = (str: string) => Number(String(str).replace(/[^0-9]/g, '')) || 0;

export default function TransaksiPenjualanScreen() {
  const router = useRouter();
  const { nomorBerikutnya, tambahPesanan } = useOrders();
  const { baris, total, ubahQty, bisaTambah, cekStok, kurangiStok, kosongkan, simpanDetail } = useKeranjang();

  const [fontsLoaded] = useFonts({ Poppins_700Bold, Nunito_400Regular, Nunito_700Bold });

  const [method, setMethod] = useState<Metode>('Tunai');
  const [cashReceived, setCashReceived] = useState('50000');

  const dipesan = useMemo(() => baris.filter((b) => b.qty > 0), [baris]);

  const received = parseNumber(cashReceived);
  const change = received - total;

  const handlePlus = (produkId: string, varian: (typeof baris)[number]['varian'], nama: string) => {
    const hasil = ubahQty(produkId, varian, 1);
    if (!hasil.ok) {
      showAlert('Stok tidak cukup', `Stok ${hasil.kurang.join(', ')} tidak cukup untuk menambah ${nama}.`);
    }
  };

  const handlePay = () => {
    if (dipesan.length === 0) {
      showAlert('Pesanan kosong', 'Tambahkan minimal satu item dulu ya.');
      return;
    }
    if (method === 'Tunai' && received < total) {
      showAlert('Uang kurang', `Uang diterima kurang ${formatRupiah(total - received)} dari total.`);
      return;
    }
    const kurang = cekStok();
    if (kurang.length > 0) {
      showAlert('Stok tidak cukup', `Stok ${kurang.join(', ')} tidak cukup untuk pesanan ini.`);
      return;
    }

    // catatan transaksi untuk halaman detail (dibuat sebelum keranjang dikosongkan)
    const detail: DetailTransaksi = {
      id: nomorBerikutnya,
      waktu: new Date().toISOString(),
      kasir: KASIR_AKTIF,
      metode: method,
      items: dipesan.map((b) => ({ nama: b.nama, qty: b.qty, harga: b.harga })),
      subtotal: total,
      total,
      uangDiterima: method === 'Tunai' ? received : total,
      kembalian: method === 'Tunai' ? change : 0,
      status: 'Selesai',
    };

    kurangiStok(); // stok bahan berkurang sesuai resep, terlihat di stok.tsx owner
    tambahPesanan({
      produk: dipesan.map((b) => `${b.nama} × ${b.qty}`).join(', '),
      metode: method,
    });
    simpanDetail(detail); // disimpan di context, alamat halaman cukup membawa id
    kosongkan(); // mulai pesanan baru
    setCashReceived('50000'); // ganti '' kalau kasir harus mengetik uang diterima setiap transaksi

    router.push({
      pathname: '/(kasir)/detail-transaksi',
      params: { id: detail.id },
    });
  };

  if (!fontsLoaded) return null;

  return (
    <PageTemplate>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Transaksi Penjualan</Text>
          <Text style={styles.subtitle}>Pesanan baru · Antrean #{nomorBerikutnya}</Text>

          {/* Daftar item pesanan */}
          <ProductList style={styles.list} itemSpacing={12}>
            {baris.map((b) => (
              <ProductCard
                key={b.key}
                title={b.produk.nama}
                subtitle={`${b.ukuran ? `${b.ukuran} · ` : ''}${formatRupiah(b.harga)}`}
                subtitleStyle={styles.itemPrice}
                accent={b.produk.accent}
                foto={b.produk.foto}
                style={styles.itemCard}
              >
                <View style={styles.stepper}>
                  <AppButton
                    onPress={() => ubahQty(b.produk.id, b.varian, -1)}
                    disabled={b.qty === 0}
                    accessibilityLabel={`Kurangi ${b.nama}`}
                    style={[styles.stepBtn, styles.stepBtnOutline]}
                    textStyle={[styles.stepText, { color: C.primary }]}
                  >
                    −
                  </AppButton>
                  <Text style={styles.qty}>{b.qty}</Text>
                  <AppButton
                    onPress={() => handlePlus(b.produk.id, b.varian, b.nama)}
                    accessibilityLabel={`Tambah ${b.nama}`}
                    style={[
                      styles.stepBtn,
                      styles.stepBtnFilled,
                      !bisaTambah(b.produk.id, b.varian) && styles.stepBtnHabis,
                    ]}
                    textStyle={[styles.stepText, { color: C.white }]}
                  >
                    +
                  </AppButton>
                </View>
              </ProductCard>
            ))}
          </ProductList>

          {/* Tambah menu: buka layar Pilih Menu */}
          <AppButton
            onPress={() => router.push('/(kasir)/pilih-menu')}
            accessibilityLabel="Tambah menu"
            style={styles.addMenuBtn}
            textStyle={styles.addMenuText}
          >
            + Tambah Menu
          </AppButton>

          {/* Metode pembayaran */}
          <Text style={styles.sectionTitle}>Metode pembayaran</Text>
          <View style={styles.methodRow}>
            {METHODS.map((m) => {
              const active = method === m;
              return (
                <AppButton
                  key={m}
                  onPress={() => setMethod(m)}
                  accessibilityLabel={`Bayar dengan ${m}`}
                  style={[styles.methodBtn, active ? styles.methodActive : styles.methodInactive]}
                  textStyle={[styles.methodText, { color: active ? C.white : C.primary }]}
                >
                  {m}
                </AppButton>
              );
            })}
          </View>

          {/* Ringkasan */}
          <View style={styles.summaryCard}>
            {dipesan.map((b) => (
              <View key={b.key} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{b.nama} × {b.qty}</Text>
                <Text style={styles.summaryValue}>{formatRupiah(b.harga * b.qty)}</Text>
              </View>
            ))}
            {dipesan.length === 0 && <Text style={styles.summaryLabel}>Belum ada item dipilih</Text>}

            <View style={styles.divider} />

            {method === 'Tunai' && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Uang diterima</Text>
                  <AppInput
                    style={styles.cashInput}
                    value={cashReceived ? formatRupiah(parseNumber(cashReceived)) : ''}
                    onChangeText={(t: string) => setCashReceived(String(parseNumber(t)))}
                    keyboardType="number-pad"
                    placeholder="Rp 0"
                    placeholderTextColor={C.textMuted}
                    selectTextOnFocus
                    accessibilityLabel="Uang diterima"
                  />
                </View>
                {received >= total && total > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Kembalian</Text>
                    <Text style={styles.summaryValue}>{formatRupiah(change)}</Text>
                  </View>
                )}
              </>
            )}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
            </View>
          </View>

          <AppButton onPress={handlePay} style={styles.payBtn} textStyle={styles.payText}>
            Bayar & Buat Antrean
          </AppButton>
        </ScrollView>
      </SafeAreaView>
    </PageTemplate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },

  title: { fontFamily: FONTS.heading, fontSize: 28, color: C.text },
  subtitle: { fontFamily: FONTS.body, fontSize: 14, color: C.textMuted, marginTop: 2 },

  list: { marginTop: 18 },
  itemCard: { borderRadius: 22, paddingHorizontal: 15 },
  itemPrice: { fontFamily: FONTS.bodyBold, fontSize: 14, color: C.primary },

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 27, height: 27, borderRadius: DesignTokens.radius.pill },
  stepBtnOutline: { borderWidth: 1.5, borderColor: C.primaryLight },
  stepBtnFilled: { backgroundColor: C.primary },
  stepBtnHabis: { opacity: 0.35 },
  stepText: { fontFamily: FONTS.heading, fontSize: 16, lineHeight: 20, includeFontPadding: false },
  qty: { minWidth: 28, textAlign: 'center', fontFamily: FONTS.heading, fontSize: 16, color: C.text },

  addMenuBtn: {
    height: 40,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.primary,
  },
  addMenuText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: C.primary },

  sectionTitle: { fontFamily: FONTS.heading, fontSize: 17, color: C.text, marginTop: 22 },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  methodBtn: { width: '30%', minWidth: 98, height: 38, borderRadius: DesignTokens.radius.pill },
  methodActive: { backgroundColor: C.primary },
  methodInactive: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  methodText: { fontFamily: FONTS.bodyBold, fontSize: 14 },

  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingHorizontal: 19,
    paddingTop: 15,
    paddingBottom: 14,
    marginTop: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
    marginBottom: 4,
  },
  summaryLabel: { fontFamily: FONTS.body, fontSize: 15, color: C.textMuted, flexShrink: 1, paddingRight: 8 },
  summaryValue: { fontFamily: FONTS.body, fontSize: 15, color: C.text },
  divider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.border, marginVertical: 10 },
  cashInput: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: C.text,
    textAlign: 'right',
    minWidth: 110,
    paddingVertical: 0,
  },
  totalRow: { marginTop: 6, marginBottom: 0, alignItems: 'baseline' },
  totalLabel: { fontFamily: FONTS.heading, fontSize: 17, color: C.text },
  totalValue: { fontFamily: FONTS.heading, fontSize: 23, color: C.primary },

  payBtn: { height: 50, borderRadius: 25, backgroundColor: C.primary, marginTop: 20 },
  payText: { fontFamily: FONTS.heading, fontSize: 16, color: C.white },
});