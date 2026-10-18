import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

const COLORS = {
  background: '#FFF5EA',
  card: '#FFFFFF',
  brown: '#8B5E3C',
  caramel: '#C48B60',
  sand: '#EEE2D3',
  mango: '#E8B84B',
  textDark: '#3A2418',
  textMuted: '#8E7B6D',
  border: '#F3E6D8',
  iconButton: '#FFF3E6',
  danger: '#C0392B',
  dangerSoft: '#FCEBE8',
  overlay: 'rgba(58, 36, 24, 0.45)',
};

const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
};

// ---------- Helper ----------
const formatRupiah = (n) =>
  'Rp ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const onlyDigits = (text) => text.replace(/[^0-9]/g, '');

const priceLabel = (p) =>
  p.hasSizes
    ? `S ${formatRupiah(p.priceS)} · L ${formatRupiah(p.priceL)}`
    : formatRupiah(p.price);

const EMPTY_FORM = {
  name: '',
  hasSizes: false,
  price: '',
  priceS: '',
  priceL: '',
};

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Sticky Milk Coklat', hasSizes: true, priceS: 10000, priceL: 19000, accent: COLORS.caramel },
  { id: 2, name: 'Sticky Milk Taro', hasSizes: true, priceS: 9000, priceL: 17000, accent: COLORS.caramel },
  { id: 3, name: 'Smoothies Durian', hasSizes: false, price: 26000, accent: COLORS.mango },
  { id: 4, name: 'Smoothies Mangga', hasSizes: false, price: 21000, accent: COLORS.caramel },
  { id: 5, name: 'Topping Oreo', hasSizes: false, price: 3000, accent: COLORS.caramel },
];

// Kolom input harga dengan awalan "Rp"
function PriceField({ label, value, onChangeText }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.input}>
        <Text style={styles.prefix}>Rp</Text>
        <TextInput
          style={styles.inputText}
          value={value}
          onChangeText={(t) => onChangeText(onlyDigits(t))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>
    </View>
  );
}

export default function ProdukScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [query, setQuery] = useState('');

  // Formulir tambah / edit
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = mode tambah
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  // Konfirmasi hapus
  const [deleteTarget, setDeleteTarget] = useState(null);

  const nextId = useRef(6);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setFormVisible(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      hasSizes: item.hasSizes,
      price: item.hasSizes ? '' : String(item.price),
      priceS: item.hasSizes ? String(item.priceS) : '',
      priceL: item.hasSizes ? String(item.priceL) : '',
    });
    setError('');
    setFormVisible(true);
  };

  const closeForm = () => setFormVisible(false);

  const saveForm = () => {
    const name = form.name.trim();
    if (!name) {
      setError('Nama produk wajib diisi.');
      return;
    }

    let priceData;
    if (form.hasSizes) {
      const priceS = Number(form.priceS);
      const priceL = Number(form.priceL);
      if (!priceS || !priceL) {
        setError('Harga ukuran S dan L wajib diisi.');
        return;
      }
      priceData = { hasSizes: true, priceS, priceL };
    } else {
      const price = Number(form.price);
      if (!price) {
        setError('Harga wajib diisi.');
        return;
      }
      priceData = { hasSizes: false, price };
    }

    if (editingId === null) {
      setProducts((list) => [
        ...list,
        { id: nextId.current++, name, accent: COLORS.caramel, ...priceData },
      ]);
    } else {
      setProducts((list) =>
        list.map((p) => (p.id === editingId ? { ...p, name, ...priceData } : p))
      );
    }
    setFormVisible(false);
  };

  const confirmDelete = () => {
    setProducts((list) => list.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Manajemen Produk</Text>
        <Text style={styles.subtitle}>Kelola nama produk dan harga</Text>

        {/* Pencarian */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={24} color="#8E7B6D" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk"
            placeholderTextColor="#8E7B6D"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Daftar produk */}
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.thumb}>
              <View style={[styles.thumbInner, { backgroundColor: item.accent }]} />
            </View>

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.price}>{priceLabel(item)}</Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.7}
              onPress={() => openEdit(item)}
            >
              <Ionicons name="pencil" size={15} color={COLORS.brown} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.7}
              onPress={() => setDeleteTarget(item)}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {filtered.length === 0 && (
          <Text style={styles.empty}>
            {products.length === 0
              ? 'Belum ada produk. Tekan "+ Tambah Produk" untuk mulai.'
              : 'Produk tidak ditemukan.'}
          </Text>
        )}

        {/* Tombol tambah */}
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.85}
          onPress={openAdd}
        >
          <Text style={styles.addButtonText}>+ Tambah Produk</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal tambah / edit */}
      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.flex} onPress={closeForm} />
          <View style={styles.sheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sheetTitle}>
                {editingId === null ? 'Tambah Produk' : 'Edit Produk'}
              </Text>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Nama produk</Text>
                <View style={styles.input}>
                  <TextInput
                    style={styles.inputText}
                    value={form.name}
                    onChangeText={(t) => setField('name', t)}
                    placeholder="Contoh: Sticky Milk Matcha"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={styles.switchTitle}>Ada pilihan ukuran</Text>
                  <Text style={styles.switchHint}>Harga terpisah untuk S dan L</Text>
                </View>
                <Switch
                  value={form.hasSizes}
                  onValueChange={(v) => setField('hasSizes', v)}
                  trackColor={{ false: COLORS.sand, true: COLORS.caramel }}
                  thumbColor={form.hasSizes ? COLORS.brown : '#FFFFFF'}
                />
              </View>

              {form.hasSizes ? (
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <PriceField
                      label="Harga S"
                      value={form.priceS}
                      onChangeText={(t) => setField('priceS', t)}
                    />
                  </View>
                  <View style={styles.flex}>
                    <PriceField
                      label="Harga L"
                      value={form.priceL}
                      onChangeText={(t) => setField('priceL', t)}
                    />
                  </View>
                </View>
              ) : (
                <PriceField
                  label="Harga"
                  value={form.price}
                  onChangeText={(t) => setField('price', t)}
                />
              )}

              {!!error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.sheetButton, styles.cancelButton]}
                  activeOpacity={0.8}
                  onPress={closeForm}
                >
                  <Text style={styles.cancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetButton, styles.saveButton]}
                  activeOpacity={0.85}
                  onPress={saveForm}
                >
                  <Text style={styles.saveText}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal konfirmasi hapus */}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.dialogTitle}>Hapus produk?</Text>
            <Text style={styles.dialogText}>
              {deleteTarget ? `"${deleteTarget.name}"` : ''} akan dihapus dari
              daftar produk.
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.sheetButton, styles.cancelButton]}
                activeOpacity={0.8}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetButton, styles.dangerButton]}
                activeOpacity={0.85}
                onPress={confirmDelete}
              >
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
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },

  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    lineHeight: 36,
    color: COLORS.textDark,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 14,
  },

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
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.textDark,
    padding: 0,
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
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInner: { width: 20, height: 32, borderRadius: 6 },
  info: { flex: 1, marginLeft: 12, marginRight: 6 },
  name: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.textDark,
  },
  price: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.brown,
    marginTop: 2,
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  empty: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: 20,
  },

  addButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.brown,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addButtonText: {
    fontFamily: FONTS.headingSemi,
    fontSize: 16,
    color: '#FFFFFF',
  },

  // ----- Modal formulir -----
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  sheetTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.textDark,
    marginBottom: 16,
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  prefix: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.brown,
    marginRight: 8,
  },
  inputText: {
    flex: 1,
    fontFamily: FONTS.bodySemi,
    fontSize: 15,
    color: COLORS.textDark,
    padding: 0,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  switchTitle: { fontFamily: FONTS.headingSemi, fontSize: 14, color: COLORS.textDark },
  switchHint: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  row: { flexDirection: 'row', gap: 12 },
  error: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
    color: COLORS.danger,
    marginBottom: 12,
  },
  sheetButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { backgroundColor: COLORS.sand },
  saveButton: { backgroundColor: COLORS.brown },
  dangerButton: { backgroundColor: COLORS.danger },
  cancelText: { fontFamily: FONTS.headingSemi, fontSize: 15, color: COLORS.brown },
  saveText: { fontFamily: FONTS.headingSemi, fontSize: 15, color: '#FFFFFF' },

  // ----- Dialog hapus -----
  dialogOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  dialogIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.textDark,
    marginBottom: 6,
  },
  dialogText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
});