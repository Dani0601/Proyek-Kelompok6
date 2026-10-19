import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

/* ---------- Warna (diambil dari desain Figma/SVG) ---------- */
const COLORS = {
  bg: '#FFF6ED',
  card: '#FFFFFF',
  thumbBg: '#F1E3D3',
  thumbInner: '#C08A5E',
  thumbInnerDark: '#402D1E',
  textDark: '#402D1E',
  primary: '#8B5F3C',
  accent: '#C08A5E',
  muted: '#8A7A6C',
  border: '#F1E3D3',
};

/* ---------- Data contoh (ganti dengan data dari state/API/teman sekelompok) ---------- */
const INITIAL_ITEMS = [
  { id: '1', name: 'Sticky Milk Taro', variant: 'Small', price: 9000, qty: 2 },
  { id: '2', name: 'Smoothies Mangga', variant: null, price: 21000, qty: 1 },
  { id: '3', name: 'Topping Oreo', variant: null, price: 3000, qty: 1, dark: true },
];

/* ---------- Helper ---------- */
const formatRupiah = (n) => 'Rp ' + String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const parseNumber = (str) => Number(String(str).replace(/[^0-9]/g, '')) || 0;

const shortName = (item) =>
  item.variant ? `${item.name} (${item.variant.charAt(0)})` : item.name;

/**
 * Props (semua opsional, biar gampang disambung ke layar lain):
 * - initialItems : array item pesanan
 * - queueNumber  : string nomor antrean, contoh "A-014"
 * - onSubmit     : (transaksi) => void, dipanggil setelah pembayaran berhasil
 */
export default function TransaksiPenjualanScreen({
  initialItems = INITIAL_ITEMS,
  queueNumber = 'A-014',
  onSubmit,
}) {
  const [items, setItems] = useState(initialItems);
  const [method, setMethod] = useState('Tunai'); // 'Tunai' | 'QRIS'
  const [cashReceived, setCashReceived] = useState('50000');

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items]
  );

  const received = parseNumber(cashReceived);
  const change = received - total;

  /* ----- aksi ----- */
  const changeQty = (id, delta) => {
    setItems((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0) // qty 0 = item dihapus dari pesanan
    );
  };

  const handlePay = () => {
    if (items.length === 0) {
      Alert.alert('Pesanan kosong', 'Tambahkan minimal satu item dulu ya.');
      return;
    }
    if (method === 'Tunai' && received < total) {
      Alert.alert(
        'Uang kurang',
        `Uang diterima kurang ${formatRupiah(total - received)} dari total.`
      );
      return;
    }

    const transaksi = {
      queueNumber,
      items,
      method,
      total,
      received: method === 'Tunai' ? received : total,
      change: method === 'Tunai' ? change : 0,
      createdAt: new Date().toISOString(),
    };

    if (onSubmit) onSubmit(transaksi);

    Alert.alert(
      'Pembayaran berhasil',
      method === 'Tunai'
        ? `Antrean #${queueNumber} dibuat.\nKembalian: ${formatRupiah(change)}`
        : `Antrean #${queueNumber} dibuat.`
    );
  };

  /* ----- render ----- */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={styles.title}>Transaksi Penjualan</Text>
        <Text style={styles.subtitle}>Pesanan baru · Antrean #{queueNumber}</Text>

        {/* Daftar item */}
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.thumb}>
                <View
                  style={[
                    styles.thumbInner,
                    item.dark && { backgroundColor: COLORS.thumbInnerDark },
                  ]}
                />
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemPrice}>
                  {item.variant ? `${item.variant} · ` : ''}
                  {formatRupiah(item.price)}
                </Text>
              </View>

              <View style={styles.stepper}>
                <Pressable
                  onPress={() => changeQty(item.id, -1)}
                  style={({ pressed }) => [
                    styles.stepBtn,
                    styles.stepBtnOutline,
                    pressed && styles.pressed,
                  ]}
                  hitSlop={6}
                >
                  <Text style={[styles.stepText, { color: COLORS.primary }]}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{item.qty}</Text>
                <Pressable
                  onPress={() => changeQty(item.id, 1)}
                  style={({ pressed }) => [
                    styles.stepBtn,
                    styles.stepBtnFilled,
                    pressed && styles.pressed,
                  ]}
                  hitSlop={6}
                >
                  <Text style={[styles.stepText, { color: '#fff' }]}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {items.length === 0 && (
            <Text style={styles.emptyText}>Belum ada item di pesanan.</Text>
          )}
        </View>

        {/* Metode pembayaran */}
        <Text style={styles.sectionTitle}>Metode pembayaran</Text>
        <View style={styles.methodRow}>
          {['Tunai', 'QRIS'].map((m) => {
            const active = method === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={[styles.methodBtn, active ? styles.methodActive : styles.methodInactive]}
              >
                <Text style={[styles.methodText, { color: active ? '#fff' : COLORS.primary }]}>
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Ringkasan */}
        <View style={styles.summaryCard}>
          {items.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {shortName(item)} × {item.qty}
              </Text>
              <Text style={styles.summaryValue}>{formatRupiah(item.price * item.qty)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {method === 'Tunai' && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Uang diterima</Text>
                <TextInput
                  style={styles.cashInput}
                  value={cashReceived ? formatRupiah(parseNumber(cashReceived)) : ''}
                  onChangeText={(t) => setCashReceived(String(parseNumber(t)))}
                  keyboardType="number-pad"
                  placeholder="Rp 0"
                  placeholderTextColor={COLORS.muted}
                  selectTextOnFocus
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

        {/* Tombol bayar */}
        <Pressable
          onPress={handlePay}
          style={({ pressed }) => [styles.payBtn, pressed && styles.pressed]}
        >
          <Text style={styles.payText}>Bayar & Buat Antrean</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Style ----------
 * Font: desain pakai Poppins (judul) + Nunito Sans (teks biasa).
 * Kalau project sudah load font itu (expo-font / @expo-google-fonts),
 * ganti nilai FONT di bawah, contoh: bold: 'Poppins_700Bold'.
 */
const FONT = {
  bold: undefined, // 'Poppins_700Bold'
  semibold: undefined, // 'Poppins_600SemiBold'
  regular: undefined, // 'NunitoSans_400Regular'
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 40,
  },
  pressed: { opacity: 0.8 },

  /* header */
  title: {
    fontFamily: FONT.bold,
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },

  /* item list */
  list: { marginTop: 18, gap: 13 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    height: 78,
    paddingHorizontal: 15,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.thumbBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInner: {
    width: 18,
    height: 32,
    borderRadius: 7,
    backgroundColor: COLORS.thumbInner,
  },
  itemInfo: { flex: 1, marginLeft: 15, marginRight: 8 },
  itemName: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  itemPrice: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.muted,
    paddingVertical: 24,
  },

  /* stepper */
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: 'transparent',
  },
  stepBtnFilled: { backgroundColor: COLORS.primary },
  stepText: { fontSize: 16, fontWeight: '800', lineHeight: 18, includeFontPadding: false },
  qty: {
    minWidth: 28,
    textAlign: 'center',
    fontFamily: FONT.bold,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },

  /* metode pembayaran */
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 26,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  methodBtn: {
    width: '30%',
    minWidth: 98,
    height: 41,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodActive: { backgroundColor: COLORS.primary },
  methodInactive: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodText: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    fontWeight: '700',
  },

  /* ringkasan */
  summaryCard: {
    backgroundColor: COLORS.card,
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
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.muted,
    flexShrink: 1,
    paddingRight: 8,
  },
  summaryValue: {
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLORS.textDark,
  },
  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    marginVertical: 10,
  },
  cashInput: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'right',
    minWidth: 110,
    paddingVertical: 0,
  },
  totalRow: { marginTop: 6, marginBottom: 0, alignItems: 'baseline' },
  totalLabel: {
    fontFamily: FONT.bold,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  totalValue: {
    fontFamily: FONT.bold,
    fontSize: 23,
    fontWeight: '700',
    color: COLORS.primary,
  },

  /* tombol bayar */
  payBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  payText: {
    fontFamily: FONT.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});