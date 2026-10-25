import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';

import { useOrders, type Metode } from '@/context/order-context';
import { useBahan } from '@/context/bahan-context';
import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import ProductCard from '@/components/molecules/ProductCard';
import ProductList from '@/components/organisms/ProductList';
import PageTemplate from '@/components/templates/PageTemplate';
import { DesignTokens } from '@/constants/design-tokens';

const C = DesignTokens.color;

const FONTS = {
  heading: 'Poppins_700Bold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};

/* ---------- Katalog menu ----------
 * Harga disamakan dengan produk.tsx milik owner.
 * (Idealnya nanti dipindah ke ProductContext supaya otomatis sinkron.)
 */
type MenuItem = {
  id: string;
  name: string;
  variant: 'Small' | 'Large' | null;
  price: number;
  accent: string;
};

type OrderItem = MenuItem & { qty: number };

const MENU: MenuItem[] = [
  { id: 'coklat-s', name: 'Sticky Milk Coklat', variant: 'Small', price: 10000, accent: C.primaryLight },
  { id: 'coklat-l', name: 'Sticky Milk Coklat', variant: 'Large', price: 19000, accent: C.primaryLight },
  { id: 'taro-s', name: 'Sticky Milk Taro', variant: 'Small', price: 9000, accent: C.primaryLight },
  { id: 'taro-l', name: 'Sticky Milk Taro', variant: 'Large', price: 17000, accent: C.primaryLight },
  { id: 'durian', name: 'Smoothies Durian', variant: null, price: 26000, accent: C.mango },
  { id: 'mangga', name: 'Smoothies Mangga', variant: null, price: 21000, accent: C.mango },
  { id: 'oreo', name: 'Topping Oreo', variant: null, price: 3000, accent: C.text },
];

/* ---------- Resep: pemakaian bahan per 1 porsi ----------
 * bahanId mengacu ke id di bahan-context.tsx:
 *   '1' Susu UHT (ml)        '2' Bubuk Coklat (gram)   '3' Bubuk Taro (gram)
 *   '4' Keju Parut (gram)    '5' Cup Large (pcs)       '6' Cup Small (pcs)
 * CATATAN: angka di bawah hanya CONTOH, sesuaikan dengan resep asli.
 * Menu yang bahannya belum terdaftar di stok (Durian, Mangga, Oreo) dikosongkan,
 * jadi tidak mengurangi stok apa pun.
 */
const RESEP: Record<string, { bahanId: string; jumlah: number }[]> = {
  'coklat-s': [{ bahanId: '1', jumlah: 200 }, { bahanId: '2', jumlah: 25 }, { bahanId: '6', jumlah: 1 }],
  'coklat-l': [{ bahanId: '1', jumlah: 350 }, { bahanId: '2', jumlah: 40 }, { bahanId: '5', jumlah: 1 }],
  'taro-s': [{ bahanId: '1', jumlah: 200 }, { bahanId: '3', jumlah: 25 }, { bahanId: '6', jumlah: 1 }],
  'taro-l': [{ bahanId: '1', jumlah: 350 }, { bahanId: '3', jumlah: 40 }, { bahanId: '5', jumlah: 1 }],
  durian: [],
  mangga: [],
  oreo: [],
};

const fromMenu = (id: string, qty: number): OrderItem => {
  const m = MENU.find((x) => x.id === id)!;
  return { ...m, qty };
};

// isi awal sesuai desain; setelah transaksi pertama dibayar, pesanan dikosongkan
const INITIAL_ITEMS: OrderItem[] = [fromMenu('taro-s', 2), fromMenu('mangga', 1), fromMenu('oreo', 1)];

const METHODS: Metode[] = ['Tunai', 'QRIS'];

/* ---------- Helper ---------- */
const formatRupiah = (n: number) =>
  'Rp ' + String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const parseNumber = (str: string) => Number(String(str).replace(/[^0-9]/g, '')) || 0;
const shortName = (item: MenuItem) =>
  item.variant ? `${item.name} (${item.variant.charAt(0)})` : item.name;
const hargaLabel = (item: MenuItem) =>
  `${item.variant ? `${item.variant} · ` : ''}${formatRupiah(item.price)}`;

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }], { cancelable: false });
  }
};

// total kebutuhan bahan dari daftar pesanan: { bahanId: jumlah }
const kebutuhanBahan = (list: OrderItem[]) => {
  const total: Record<string, number> = {};
  for (const it of list) {
    for (const r of RESEP[it.id] ?? []) {
      total[r.bahanId] = (total[r.bahanId] ?? 0) + r.jumlah * it.qty;
    }
  }
  return total;
};

export default function TransaksiPenjualanScreen() {
  const router = useRouter();
  const { nomorBerikutnya, tambahPesanan } = useOrders();
  const { bahanList, updateBahan } = useBahan();

  const [fontsLoaded] = useFonts({ Poppins_700Bold, Nunito_400Regular, Nunito_700Bold });

  const [items, setItems] = useState<OrderItem[]>(INITIAL_ITEMS);
  const [method, setMethod] = useState<Metode>('Tunai');
  const [cashReceived, setCashReceived] = useState('50000');
  const [pilihMenuOpen, setPilihMenuOpen] = useState(false);

  const itemDipesan = useMemo(() => items.filter((it) => it.qty > 0), [items]);
  const total = useMemo(
    () => itemDipesan.reduce((sum, it) => sum + it.price * it.qty, 0),
    [itemDipesan]
  );
  const menuBelumDipilih = useMemo(
    () => MENU.filter((m) => !items.some((it) => it.id === m.id)),
    [items]
  );

  const received = parseNumber(cashReceived);
  const change = received - total;

  /* ----- stok: nama bahan yang tidak cukup untuk daftar pesanan tertentu ----- */
  const bahanKurang = (list: OrderItem[]) =>
    Object.entries(kebutuhanBahan(list)).flatMap(([bahanId, jumlah]) => {
      const b = bahanList.find((x) => x.id === bahanId);
      return b && b.stok < jumlah ? [b.nama] : [];
    });

  const bisaTambah = (menuId: string) =>
    bahanKurang(items.map((it) => (it.id === menuId ? { ...it, qty: it.qty + 1 } : it))).length === 0;

  const bisaTambahMenuBaru = (m: MenuItem) => bahanKurang([...items, { ...m, qty: 1 }]).length === 0;

  /* ----- aksi ----- */
  const handleMinus = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty: Math.max(0, it.qty - 1) } : it)));
  };

  const handlePlus = (item: OrderItem) => {
    const next = items.map((it) => (it.id === item.id ? { ...it, qty: it.qty + 1 } : it));
    const kurang = bahanKurang(next);
    if (kurang.length > 0) {
      showAlert('Stok tidak cukup', `Stok ${kurang.join(', ')} tidak cukup untuk menambah ${shortName(item)}.`);
      return;
    }
    setItems(next);
  };

  const handleTambahMenu = (m: MenuItem) => {
    const kurang = bahanKurang([...items, { ...m, qty: 1 }]);
    if (kurang.length > 0) {
      showAlert('Stok tidak cukup', `Stok ${kurang.join(', ')} tidak cukup untuk ${shortName(m)}.`);
      return;
    }
    setItems((prev) => [...prev, { ...m, qty: 1 }]);
    setPilihMenuOpen(false);
  };

  const goToAntrean = () => router.navigate('/(kasir)/kasir');

  const handlePay = () => {
    if (itemDipesan.length === 0) {
      showAlert('Pesanan kosong', 'Tambahkan minimal satu item dulu ya.');
      return;
    }
    if (method === 'Tunai' && received < total) {
      showAlert('Uang kurang', `Uang diterima kurang ${formatRupiah(total - received)} dari total.`);
      return;
    }
    const kurang = bahanKurang(itemDipesan);
    if (kurang.length > 0) {
      showAlert('Stok tidak cukup', `Stok ${kurang.join(', ')} tidak cukup untuk pesanan ini.`);
      return;
    }

    // kurangi stok bahan (tampil otomatis di stok.tsx milik owner)
    Object.entries(kebutuhanBahan(itemDipesan)).forEach(([bahanId, jumlah]) => {
      const b = bahanList.find((x) => x.id === bahanId);
      if (b) updateBahan(b.id, { stok: b.stok - jumlah });
    });

    const produk = itemDipesan.map((it) => `${shortName(it)} × ${it.qty}`).join(', ');
    tambahPesanan({ produk, metode: method });

    // mulai pesanan baru
    setItems([]);
    setCashReceived('50000'); // ganti '' kalau kasir harus mengetik uang diterima setiap transaksi

    showAlert('Transaksi berhasil', 'Transaksi berhasil ditambahkan', goToAntrean);
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
            {items.map((item) => (
              <ProductCard
                key={item.id}
                title={item.name}
                subtitle={hargaLabel(item)}
                accent={item.accent}
                style={styles.itemCard}
              >
                <View style={styles.stepper}>
                  <AppButton
                    onPress={() => handleMinus(item.id)}
                    disabled={item.qty === 0}
                    accessibilityLabel={`Kurangi ${item.name}`}
                    style={[styles.stepBtn, styles.stepBtnOutline]}
                    textStyle={[styles.stepText, { color: C.primary }]}
                  >
                    −
                  </AppButton>
                  <Text style={styles.qty}>{item.qty}</Text>
                  <AppButton
                    onPress={() => handlePlus(item)}
                    accessibilityLabel={`Tambah ${item.name}`}
                    style={[styles.stepBtn, styles.stepBtnFilled, !bisaTambah(item.id) && styles.stepBtnHabis]}
                    textStyle={[styles.stepText, { color: C.white }]}
                  >
                    +
                  </AppButton>
                </View>
              </ProductCard>
            ))}
          </ProductList>

          {/* Tambah menu */}
          <AppButton
            onPress={() => setPilihMenuOpen(true)}
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
            {itemDipesan.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{shortName(item)} × {item.qty}</Text>
                <Text style={styles.summaryValue}>{formatRupiah(item.price * item.qty)}</Text>
              </View>
            ))}
            {itemDipesan.length === 0 && (
              <Text style={styles.summaryLabel}>Belum ada item dipilih</Text>
            )}

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

      {/* Pilih menu untuk ditambahkan */}
      <Modal
        visible={pilihMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPilihMenuOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Tambah Menu</Text>
              <AppButton
                onPress={() => setPilihMenuOpen(false)}
                accessibilityLabel="Tutup"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={C.primary} />
              </AppButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ProductList itemSpacing={10}>
                {menuBelumDipilih.map((m) => {
                  const ada = bisaTambahMenuBaru(m);
                  return (
                    <AppButton
                      key={m.id}
                      onPress={() => handleTambahMenu(m)}
                      accessibilityLabel={`Tambah ${shortName(m)}`}
                      style={[styles.pickRow, !ada && styles.pickRowHabis]}
                    >
                      <ProductCard
                        title={m.name}
                        subtitle={ada ? hargaLabel(m) : `${hargaLabel(m)} · Stok bahan habis`}
                        accent={m.accent}
                        style={styles.pickCard}
                      />
                    </AppButton>
                  );
                })}
              </ProductList>
              {menuBelumDipilih.length === 0 && (
                <Text style={styles.emptyText}>Semua menu sudah ditambahkan.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 27, height: 27, borderRadius: DesignTokens.radius.pill },
  stepBtnOutline: { borderWidth: 1.5, borderColor: C.primaryLight },
  stepBtnFilled: { backgroundColor: C.primary },
  stepBtnHabis: { opacity: 0.35 },
  stepText: { fontFamily: FONTS.heading, fontSize: 16, lineHeight: 20, includeFontPadding: false },
  qty: {
    minWidth: 28,
    textAlign: 'center',
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: C.text,
  },

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
  summaryLabel: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: C.textMuted,
    flexShrink: 1,
    paddingRight: 8,
  },
  summaryValue: { fontFamily: FONTS.body, fontSize: 15, color: C.text },
  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border,
    marginVertical: 10,
  },
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

  payBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: C.primary,
    marginTop: 20,
  },
  payText: { fontFamily: FONTS.heading, fontSize: 16, color: C.white },

  /* modal pilih menu */
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay },
  sheet: {
    backgroundColor: C.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: { fontFamily: FONTS.heading, fontSize: 20, color: C.text },
  closeBtn: { width: 36, height: 36, borderRadius: DesignTokens.radius.pill, backgroundColor: C.thumb },
  pickRow: { alignItems: 'stretch', justifyContent: 'flex-start' },
  pickRowHabis: { opacity: 0.5 },
  pickCard: { borderRadius: 18 },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
});