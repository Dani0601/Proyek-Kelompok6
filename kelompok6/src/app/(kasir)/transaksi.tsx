import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrders, type Metode } from '@/context/order-context';
import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import ProductCard from '@/components/molecules/ProductCard';
import ProductList from '@/components/organisms/ProductList';
import { StickyMilkColors } from '@/constants/design-tokens';

const COLORS = {
  bg: StickyMilkColors.background,
  card: StickyMilkColors.surface,
  thumbBg: StickyMilkColors.thumb,
  thumbInner: StickyMilkColors.primaryLight,
  thumbInnerDark: StickyMilkColors.text,
  textDark: StickyMilkColors.text,
  primary: StickyMilkColors.primary,
  accent: StickyMilkColors.primaryLight,
  muted: StickyMilkColors.textMuted,
  border: StickyMilkColors.border,
};

type Item = {
  id: string;
  name: string;
  variant: string | null;
  price: number;
  qty: number;
  dark?: boolean;
};

const METHODS: Metode[] = ['Tunai', 'QRIS'];

const INITIAL_ITEMS: Item[] = [
  { id: '1', name: 'Sticky Milk Taro', variant: 'Small', price: 9000, qty: 2 },
  { id: '2', name: 'Smoothies Mangga', variant: null, price: 21000, qty: 1 },
  { id: '3', name: 'Topping Oreo', variant: null, price: 3000, qty: 1, dark: true },
];

const formatRupiah = (n: number) =>
  'Rp ' + String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const parseNumber = (str: string) => Number(String(str).replace(/[^0-9]/g, '')) || 0;
const shortName = (item: Item) =>
  item.variant ? `${item.name} (${item.variant.charAt(0)})` : item.name;
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }], { cancelable: false });
  }
};
export default function TransaksiPenjualanScreen() {
  const router = useRouter();
  const { nomorBerikutnya, tambahPesanan } = useOrders();

  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [method, setMethod] = useState<Metode>('Tunai');
  const [cashReceived, setCashReceived] = useState('50000');

  const itemDipesan = useMemo(() => items.filter((it) => it.qty > 0), [items]);
  const total = useMemo(
    () => itemDipesan.reduce((sum, it) => sum + it.price * it.qty, 0),
    [itemDipesan]
  );

  const received = parseNumber(cashReceived);
  const change = received - total;

  // jumlah berhenti di 0, item TIDAK dihapus
  const changeQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it))
    );
  };

  // pindah ke layar antrean
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

  const produk = itemDipesan.map((it) => `${shortName(it)} × ${it.qty}`).join(', ');
  tambahPesanan({ produk, metode: method });

  // kosongkan form untuk transaksi berikutnya
  setItems((prev) => prev.map((it) => ({ ...it, qty: 0 })));
  setCashReceived('50000'); // ganti '' kalau kasir harus mengetik uang diterima setiap transaksi

  showAlert('Transaksi berhasil', 'Transaksi berhasil ditambahkan', goToAntrean);
};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Transaksi Penjualan</Text>
        <Text style={styles.subtitle}>Pesanan baru · Antrean #{nomorBerikutnya}</Text>

        <ProductList style={styles.list} itemSpacing={13}>
          {items.map((item) => (
            <ProductCard
              key={item.id}
              title={item.name}
              subtitle={`${item.variant ? `${item.variant} · ` : ''}${formatRupiah(item.price)}`}
              accent={item.dark ? COLORS.thumbInnerDark : COLORS.thumbInner}
              style={styles.itemCard}
            >
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => changeQty(item.id, -1)}
                  disabled={item.qty === 0}
                  style={({ pressed }) => [
                    styles.stepBtn, styles.stepBtnOutline,
                    item.qty === 0 && styles.stepBtnDisabled,
                    pressed && styles.pressed,
                  ]}
                  hitSlop={6}
                >
                  <Text style={[styles.stepText, { color: COLORS.primary }]}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{item.qty}</Text>
                <Pressable
                  onPress={() => changeQty(item.id, 1)}
                  style={({ pressed }) => [styles.stepBtn, styles.stepBtnFilled, pressed && styles.pressed]}
                  hitSlop={6}
                >
                  <Text style={[styles.stepText, { color: '#fff' }]}>+</Text>
                </Pressable>
              </View>
            </ProductCard>
          ))}
        </ProductList>

        <Text style={styles.sectionTitle}>Metode pembayaran</Text>
        <View style={styles.methodRow}>
          {METHODS.map((m) => {
            const active = method === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={[styles.methodBtn, active ? styles.methodActive : styles.methodInactive]}
              >
                <Text style={[styles.methodText, { color: active ? '#fff' : COLORS.primary }]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>

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
                  placeholderTextColor={COLORS.muted}
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

        <AppButton onPress={handlePay} style={styles.payBtn}>
          <Text style={styles.payText}>Bayar & Buat Antrean</Text>
        </AppButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 22, paddingTop: 36, paddingBottom: 40 },
  pressed: { opacity: 0.8 },

  title: { fontSize: 28, fontWeight: '700', color: COLORS.textDark },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 2 },

  list: { marginTop: 18, gap: 13 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 24, height: 78, paddingHorizontal: 15,
  },
  thumb: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.thumbBg,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbInner: { width: 18, height: 32, borderRadius: 7, backgroundColor: COLORS.thumbInner },
  itemInfo: { flex: 1, marginLeft: 15, marginRight: 8 },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  itemPrice: { fontSize: 15, fontWeight: '600', color: COLORS.primary, marginTop: 2 },

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepBtnOutline: { borderWidth: 1.5, borderColor: COLORS.accent, backgroundColor: 'transparent' },
  stepBtnFilled: { backgroundColor: COLORS.primary },
  stepBtnDisabled: { opacity: 0.35 },
  stepText: { fontSize: 16, fontWeight: '800', lineHeight: 18, includeFontPadding: false },
  qty: { minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.textDark },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textDark, marginTop: 26 },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  methodBtn: {
    width: '30%', minWidth: 98, height: 41, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  methodActive: { backgroundColor: COLORS.primary },
  methodInactive: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  methodText: { fontSize: 14, fontWeight: '700' },

  summaryCard: {
    backgroundColor: COLORS.card, borderRadius: 24, paddingHorizontal: 19,
    paddingTop: 15, paddingBottom: 14, marginTop: 18,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    minHeight: 24, marginBottom: 4,
  },
  summaryLabel: { fontSize: 15, color: COLORS.muted, flexShrink: 1, paddingRight: 8 },
  summaryValue: { fontSize: 15, color: COLORS.textDark },
  divider: {
    borderTopWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, marginVertical: 10,
  },
  cashInput: {
    fontSize: 15, fontWeight: '700', color: COLORS.textDark,
    textAlign: 'right', minWidth: 110, paddingVertical: 0,
  },
  totalRow: { marginTop: 6, marginBottom: 0, alignItems: 'baseline' },
  totalLabel: { fontSize: 17, fontWeight: '700', color: COLORS.textDark },
  totalValue: { fontSize: 23, fontWeight: '700', color: COLORS.primary },

  payBtn: {
    height: 50, borderRadius: 25, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  payText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
