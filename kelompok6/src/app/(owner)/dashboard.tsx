import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { StickyMilkColors } from '@/constants/design-tokens';
import { useOrders } from '@/context/order-context';
import { formatRupiah } from '@/context/produk-context';
import {
  jumlahPenjualan,
  labelTren,
  penjualanHarian,
  produkTerlaris,
  transaksiPadaTanggal,
  useTransaksiDashboard,
} from '@/lib/dashboard-data';

const COLORS = {
  background: StickyMilkColors.cream,
  card: StickyMilkColors.surface,
  brown: StickyMilkColors.primary,
  caramel: StickyMilkColors.accent,
  sand: StickyMilkColors.sand,
  mango: StickyMilkColors.mango,
  textDark: StickyMilkColors.textDark,
  textMuted: StickyMilkColors.textMuted,
  border: StickyMilkColors.borderWarm,
  iconButton: StickyMilkColors.iconButton,
};

const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
};

const TINGGI_MAKS = 105; // tinggi batang tertinggi pada grafik
const TINGGI_MIN = 6;

export default function DashboardScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const { pesanan, memuat: memuatPesanan } = useOrders();
  const { transaksi, memuat, gagal, menyegarkan, segarkan } = useTransaksiDashboard();

  const data = useMemo(() => {
    const sekarang = new Date();
    const kemarin = new Date(sekarang);
    kemarin.setDate(kemarin.getDate() - 1);

    const hariIni = transaksiPadaTanggal(transaksi, sekarang);
    const totalHariIni = jumlahPenjualan(hariIni);
    const totalKemarin = jumlahPenjualan(transaksiPadaTanggal(transaksi, kemarin));

    return {
      totalHariIni,
      jumlahTransaksi: hariIni.length,
      tren: labelTren(totalHariIni, totalKemarin),
      mingguan: penjualanHarian(transaksi, 7, sekarang),
      terlaris: produkTerlaris(transaksi, { hari: 7, batas: 5, acuan: sekarang }),
    };
  }, [transaksi]);

  if (!fontsLoaded) return null;

  const pesananAktif = pesanan.filter((p) => p.status !== 'Siap').length;

  const maks = Math.max(...data.mingguan.map((h) => h.total), 0);
  const indeksTertinggi = maks > 0 ? data.mingguan.findIndex((h) => h.total === maks) : -1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={menyegarkan} onRefresh={segarkan} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, Owner 👋</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
        </View>

        {gagal && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Gagal memuat data penjualan. Tarik layar ke bawah untuk mencoba lagi.
            </Text>
          </View>
        )}

        {/* Penjualan hari ini */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Penjualan hari ini</Text>
          <Text style={styles.heroValue}>{memuat ? '...' : formatRupiah(data.totalHariIni)}</Text>
          <Text style={styles.heroTrend}>{memuat ? ' ' : data.tren}</Text>
        </View>

        {/* Statistik */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Transaksi</Text>
            <Text style={styles.statValue}>{memuat ? '...' : data.jumlahTransaksi}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pesanan aktif</Text>
            <Text style={styles.statValue}>{memuatPesanan ? '...' : pesananAktif}</Text>
          </View>
        </View>

        {/* Grafik 7 hari */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Penjualan 7 hari</Text>
          <View style={styles.chartRow}>
            {data.mingguan.map((item, i) => {
              const tinggi =
                maks > 0 ? Math.max(TINGGI_MIN, Math.round((item.total / maks) * TINGGI_MAKS)) : TINGGI_MIN;
              const warna =
                i === data.mingguan.length - 1
                  ? COLORS.brown
                  : i === indeksTertinggi
                  ? COLORS.caramel
                  : COLORS.sand;
              return (
                <View key={item.tanggal} style={styles.barColumn}>
                  <View style={styles.barArea}>
                    <View style={[styles.bar, { height: tinggi, backgroundColor: warna }]} />
                  </View>
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Produk terlaris */}
        <Text style={styles.sectionTitle}>Produk terlaris</Text>
        {data.terlaris.map((item, i) => (
          <View key={item.nama} style={styles.topRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{i + 1}</Text>
            </View>
            <Text style={styles.topName}>{item.nama}</Text>
            <Text style={styles.topSold}>{item.terjual} terjual</Text>
          </View>
        ))}
        {!memuat && data.terlaris.length === 0 && (
          <Text style={styles.emptyText}>Belum ada penjualan dalam 7 hari terakhir.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greeting: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    lineHeight: 36,
    color: COLORS.textDark,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.brown,
  },

  notice: {
    backgroundColor: '#FDECC8',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  noticeText: { fontFamily: FONTS.body, fontSize: 12, color: '#9A6700' },

  heroCard: {
    backgroundColor: COLORS.brown,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
  },
  heroLabel: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: '#F3E3D3',
  },
  heroValue: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    lineHeight: 42,
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroTrend: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statLabel: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: 30,
    lineHeight: 42,
    color: COLORS.textDark,
  },

  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 20,
  },
  chartTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  barColumn: { alignItems: 'center', width: 34 },
  barArea: { height: 108, justifyContent: 'flex-end' },
  bar: { width: 24, borderRadius: 8 },
  barLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
  },

  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.brown },
  topName: {
    flex: 1,
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
    color: COLORS.textDark,
  },
  topSold: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  emptyText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
});