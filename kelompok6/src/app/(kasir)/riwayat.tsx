import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageTemplate from '@/components/templates/PageTemplate';
import { StickyMilkFonts } from '@/constants/design-tokens';

type Mode = 'Tanggal' | 'Bulan' | 'Tahun';
const MODE: Mode[] = ['Tanggal', 'Bulan', 'Tahun'];

type Metode = 'Tunai' | 'QRIS';
type Transaksi = {
  id: string;
  produk: string;
  tgl: string; // YYYY-MM-DD
  jam: string;
  metode: Metode;
  total: number;
};

// Data contoh. Nanti diganti dari data transaksi asli.
const DATA_TRANSAKSI: Transaksi[] = [
  { id: 'A-013', produk: 'Redvelvet (S) × 2', tgl: '2026-10-18', jam: '10:41', metode: 'Tunai', total: 18000 },
  { id: 'A-012', produk: 'Durian (L) × 3', tgl: '2026-10-18', jam: '10:32', metode: 'QRIS', total: 51000 },
  { id: 'A-011', produk: 'Matcha (S) × 1', tgl: '2026-10-18', jam: '10:20', metode: 'QRIS', total: 9000 },
  { id: 'A-010', produk: 'Coklat (L) × 2', tgl: '2026-10-18', jam: '10:05', metode: 'Tunai', total: 38000 },
  { id: 'A-009', produk: 'Mangga (L) × 2', tgl: '2026-10-16', jam: '15:12', metode: 'Tunai', total: 42000 },
  { id: 'A-008', produk: 'Taro (S) × 3', tgl: '2026-10-15', jam: '11:48', metode: 'QRIS', total: 27000 },
  { id: 'A-007', produk: 'Durian (S) × 1', tgl: '2026-10-10', jam: '09:30', metode: 'Tunai', total: 15000 },
  { id: 'A-006', produk: 'Coklat (L) × 4', tgl: '2026-10-03', jam: '16:05', metode: 'QRIS', total: 76000 },
  { id: 'A-005', produk: 'Taro (L) × 2', tgl: '2026-09-20', jam: '13:15', metode: 'Tunai', total: 34000 },
  { id: 'A-004', produk: 'Durian (L) × 5', tgl: '2025-12-12', jam: '14:00', metode: 'QRIS', total: 85000 },
];

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const formatRupiah = (angka: number) =>
  'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function RiwayatScreen() {
  const [mode, setMode] = useState<Mode>('Tanggal');
  const [acuan, setAcuan] = useState(new Date(2026, 9, 18));

  const geser = (arah: 1 | -1) => {
    const d = new Date(acuan);
    if (mode === 'Tanggal') d.setDate(d.getDate() + arah);
    else if (mode === 'Bulan') d.setMonth(d.getMonth() + arah, 1);
    else d.setFullYear(d.getFullYear() + arah, 0, 1);
    setAcuan(d);
  };

  const labelPeriode =
    mode === 'Tanggal'
      ? `${acuan.getDate()} ${NAMA_BULAN[acuan.getMonth()]} ${acuan.getFullYear()}`
      : mode === 'Bulan'
      ? `${NAMA_BULAN[acuan.getMonth()]} ${acuan.getFullYear()}`
      : `${acuan.getFullYear()}`;

  const cocok = (tgl: string) => {
    if (mode === 'Tanggal') return tgl === toIso(acuan);
    if (mode === 'Bulan') return tgl.startsWith(`${acuan.getFullYear()}-${pad(acuan.getMonth() + 1)}`);
    return tgl.startsWith(`${acuan.getFullYear()}`);
  };

  const dataTampil = DATA_TRANSAKSI
    .filter((t) => cocok(t.tgl))
    .sort((a, b) => (b.tgl + b.jam).localeCompare(a.tgl + a.jam));

  const pendapatan = dataTampil.reduce((j, t) => j + t.total, 0);
  const jumlah = dataTampil.length;
  const rataRata = jumlah > 0 ? Math.round(pendapatan / jumlah) : 0;
  const totalTunai = dataTampil.filter((t) => t.metode === 'Tunai').reduce((j, t) => j + t.total, 0);
  const totalQris = dataTampil.filter((t) => t.metode === 'QRIS').reduce((j, t) => j + t.total, 0);

  return (
    <PageTemplate>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.judul}>Riwayat Transaksi</Text>
          <Text style={styles.subjudul}>Daftar transaksi yang sudah diproses</Text>

          <View style={styles.filterRow}>
            {MODE.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.tab, mode === m && styles.tabAktif]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.tabText, mode === m && styles.tabTextAktif]}>{m}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.tombolHariIni} onPress={() => setAcuan(new Date())}>
              <Text style={styles.tombolHariIniText}>Hari ini</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pemilih}>
            <TouchableOpacity style={styles.panah} onPress={() => geser(-1)}>
              <Text style={styles.panahText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.labelPeriode}>{labelPeriode}</Text>
            <TouchableOpacity style={styles.panah} onPress={() => geser(1)}>
              <Text style={styles.panahText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.kartuTotal}>
            <Text style={styles.totalLabel}>Pendapatan</Text>
            <Text style={styles.totalAngka}>{formatRupiah(pendapatan)}</Text>
            <Text style={styles.totalInfo}>
              {jumlah} transaksi · rata-rata {formatRupiah(rataRata)}
            </Text>
          </View>

          <View style={styles.kartuMetode}>
            <View>
              <Text style={styles.metodeLabel}>Tunai</Text>
              <Text style={styles.metodeAngka}>{formatRupiah(totalTunai)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metodeLabel}>QRIS</Text>
              <Text style={styles.metodeAngka}>{formatRupiah(totalQris)}</Text>
            </View>
          </View>

          <FlatList
            data={dataTampil}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.kosong}>Belum ada transaksi di periode ini.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.kartuTrx}>
                <View style={styles.trxBadge}>
                  <Text style={styles.trxBadgeText}>TRX</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trxProduk}>{item.id} · {item.produk}</Text>
                  <Text style={styles.trxWaktu}>{item.tgl} · {item.jam} · {item.metode}</Text>
                </View>
                <Text style={styles.trxTotal}>{formatRupiah(item.total)}</Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </PageTemplate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  judul: { fontFamily: StickyMilkFonts.heading, fontSize: 26, color: '#3B2A1E' },
  subjudul: { fontFamily: StickyMilkFonts.body, fontSize: 13, color: '#8A7A6B', marginTop: 2, marginBottom: 14 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2D2',
    marginRight: 8,
  },
  tabAktif: { backgroundColor: '#8B5A3C', borderColor: '#8B5A3C' },
  tabText: { fontFamily: StickyMilkFonts.bodySemi, fontSize: 12, color: '#8B5A3C' },
  tabTextAktif: { color: '#FFFFFF' },
  tombolHariIni: { marginLeft: 'auto', paddingVertical: 8, paddingHorizontal: 6 },
  tombolHariIniText: { fontFamily: StickyMilkFonts.bodySemi, fontSize: 12, color: '#C08A5B' },
  pemilih: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  panah: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panahText: { fontFamily: StickyMilkFonts.heading, fontSize: 22, color: '#8B5A3C', marginTop: -2 },
  labelPeriode: { fontFamily: StickyMilkFonts.headingSemi, fontSize: 14, color: '#3B2A1E' },
  kartuTotal: {
    backgroundColor: '#8B5A3C',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  totalLabel: { fontFamily: StickyMilkFonts.body, color: '#F3E3D3', fontSize: 12 },
  totalAngka: { fontFamily: StickyMilkFonts.heading, color: '#FFFFFF', fontSize: 28, marginVertical: 4 },
  totalInfo: { fontFamily: StickyMilkFonts.body, color: '#F3E3D3', fontSize: 12 },
  kartuMetode: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  metodeLabel: { fontFamily: StickyMilkFonts.body, fontSize: 11, color: '#8A7A6B' },
  metodeAngka: { fontFamily: StickyMilkFonts.headingSemi, fontSize: 14, color: '#3B2A1E' },
  kosong: { fontFamily: StickyMilkFonts.body, textAlign: 'center', color: '#8A7A6B', marginTop: 20, fontSize: 12 },
  kartuTrx: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  trxBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trxBadgeText: { fontFamily: StickyMilkFonts.headingSemi, fontSize: 10, color: '#8B5A3C' },
  trxProduk: { fontFamily: StickyMilkFonts.bodyBold, fontSize: 13, color: '#3B2A1E' },
  trxWaktu: { fontFamily: StickyMilkFonts.body, fontSize: 11, color: '#8A7A6B', marginTop: 2 },
  trxTotal: { fontFamily: StickyMilkFonts.headingSemi, fontSize: 13, color: '#8B5A3C' },
});