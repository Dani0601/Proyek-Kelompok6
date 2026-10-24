import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import ProductList from '@/components/organisms/ProductList';
import { StickyMilkColors } from '@/constants/design-tokens';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useBahan, type Bahan } from '../../context/bahan-context';

const COLORS = {
  background: StickyMilkColors.cream,
  card: '#FFFFFF',
  brown: StickyMilkColors.primary,
  textDark: StickyMilkColors.textDark,
  textMuted: StickyMilkColors.textMuted,
  border: StickyMilkColors.borderWarm,
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  green: '#10B981',
};

const fmt = (n: number) => n.toLocaleString('id-ID');

export default function StokScreen() {
  const router = useRouter();
  const { bahanList } = useBahan();
  const [query, setQuery] = useState('');

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? bahanList.filter((b: Bahan) => b.nama.toLowerCase().includes(q)) : bahanList;
  }, [bahanList, query]);

  const hampirHabis = useMemo(() => bahanList.filter((b: Bahan) => b.stok <= b.minimum), [bahanList]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Stok Bahan</Text>
            <Text style={styles.subtitle}>{bahanList.length} bahan baku</Text>
          </View>
          <TouchableOpacity
            style={styles.addCircle}
            activeOpacity={0.8}
            onPress={() => router.push('/(owner)/tambah-bahan')}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <AppInput
            style={styles.searchInput}
            placeholder="Cari bahan baku"
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Cari bahan baku"
          />
        </View>

        {/* Warning Banner */}
        {hampirHabis.length > 0 && (
          <View style={styles.warnBanner}>
            <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.warnText}>{hampirHabis.length} bahan hampir habis</Text>
          </View>
        )}

        {/* Product / Ingredient List */}
        <ProductList itemSpacing={12}>
          {filtered.map((bahan: Bahan) => {
            const low = bahan.stok <= bahan.minimum;
            return (
              <TouchableOpacity
                key={bahan.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/(owner)/tambah-bahan',
                    params: { id: bahan.id },
                  })
                }
              >
                <View style={[styles.statusDot, { backgroundColor: low ? COLORS.danger : COLORS.green }]} />
                <View style={styles.info}>
                  <Text style={styles.bahanName} numberOfLines={1}>
                    {bahan.nama}
                  </Text>
                  <Text style={styles.bahanMin}>
                    {'Min. ' + fmt(bahan.minimum) + ' ' + bahan.satuan}
                  </Text>
                </View>
                <View style={styles.stokRight}>
                  <Text style={[styles.stokQty, low && styles.stokQtyLow]}>
                    {fmt(bahan.stok)} {bahan.satuan}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ProductList>

        {filtered.length === 0 && (
          <Text style={styles.empty}>Bahan tidak ditemukan.</Text>
        )}

        {/* Catat Stok Masuk Button */}
        <AppButton
          style={styles.stokMasukBtn}
          onPress={() => router.push('/(owner)/stok-masuk')}
        >
          <Text style={styles.stokMasukText}>Catat Stok Masuk</Text>
        </AppButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    color: COLORS.textDark,
  },
  subtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.brown,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: COLORS.textDark,
    padding: 0,
  },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  warnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: COLORS.danger,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(231, 222, 212, 0.4)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  bahanName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: COLORS.textDark,
  },
  bahanMin: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stokRight: {
    alignItems: 'flex-end',
  },
  stokQty: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: COLORS.textDark,
  },
  stokQtyLow: {
    color: COLORS.danger,
  },

  empty: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: 24,
  },

  stokMasukBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.brown,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  stokMasukText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
