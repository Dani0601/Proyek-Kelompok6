import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import { StickyMilkColors } from '@/constants/design-tokens';
import { useBahan, type StokMasuk } from '../../context/bahan-context';

const fmt = (n: number) => n.toLocaleString('id-ID');
const pad = (n: number) => String(n).padStart(2, '0');
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatTanggal = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function RiwayatStokMasukScreen() {
  const router = useRouter();
  const { bahanList, riwayatStokMasuk, memuat, galat, refreshBahan } = useBahan();
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const urut = useMemo(
    () => [...riwayatStokMasuk].sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [riwayatStokMasuk]
  );
  const totalPengeluaran = useMemo(
    () => riwayatStokMasuk.reduce((jumlah, m) => jumlah + m.harga, 0),
    [riwayatStokMasuk]
  );

  if (!fontsLoaded) return null;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBahan();
    setRefreshing(false);
  };

  const bukaEdit = (item: StokMasuk) =>
    router.push({ pathname: '/(owner)/stok-masuk', params: { id: item.id } });

  const header = (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(owner)/stok')}
          activeOpacity={0.7}
          accessibilityLabel="Kembali ke Stok"
        >
          <Ionicons name="chevron-back" size={24} color={StickyMilkColors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Pengadaan</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total pengeluaran belanja bahan</Text>
        <Text style={styles.summaryValue}>Rp {fmt(totalPengeluaran)}</Text>
        <Text style={styles.summarySub}>{riwayatStokMasuk.length} kali pembelian</Text>
      </View>

      {!!galat && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{galat}</Text>
          <TouchableOpacity onPress={refreshBahan} activeOpacity={0.7}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={urut}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          memuat ? (
            <ActivityIndicator style={styles.loader} color={StickyMilkColors.primary} />
          ) : (
            <Text style={styles.empty}>Belum ada pengadaan stok. Catat dari layar Stok.</Text>
          )
        }
        renderItem={({ item }) => {
          const bahan = bahanList.find((b) => b.id === item.bahanId);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => bukaEdit(item)}
              accessibilityLabel={`Edit pengadaan ${bahan?.nama ?? 'bahan'}`}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.bahanName} numberOfLines={1}>
                    {bahan?.nama ?? 'Bahan dihapus'}
                  </Text>
                  <Text style={styles.tanggal}>{formatTanggal(item.tanggal)}</Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.jumlah}>
                  +{fmt(item.jumlah)} {bahan?.satuan ?? ''}
                </Text>
                <Text style={styles.harga}>Rp {fmt(item.harga)}</Text>
              </View>

              {!!item.catatan && <Text style={styles.catatan}>{item.catatan}</Text>}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StickyMilkColors.cream },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: StickyMilkColors.textDark },

  summaryCard: {
    backgroundColor: StickyMilkColors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#F3E6D8' },
  summaryValue: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#FFFFFF', marginTop: 2 },
  summarySub: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: '#F3E6D8', marginTop: 2 },

  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#B91C1C' },
  retryText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: StickyMilkColors.primary,
    marginTop: 6,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardInfo: { flex: 1, minWidth: 0 },
  bahanName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: StickyMilkColors.textDark },
  tanggal: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: StickyMilkColors.textMuted,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  jumlah: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#10B981' },
  harga: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: StickyMilkColors.primary },
  catatan: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: StickyMilkColors.textMuted,
    marginTop: 8,
  },

  loader: { marginTop: 40 },
  empty: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: StickyMilkColors.textMuted,
    textAlign: 'center',
    marginVertical: 30,
  },
});