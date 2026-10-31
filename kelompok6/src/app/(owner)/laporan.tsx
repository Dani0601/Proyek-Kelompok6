import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PageTemplate from '@/components/templates/PageTemplate';
import { useBahan } from '@/context/bahan-context';

type Mode = 'Tanggal' | 'Bulan' | 'Tahun';
const MODE: Mode[] = ['Tanggal', 'Bulan', 'Tahun'];

type Jenis = 'masuk' | 'keluar';
type FilterJenis = 'Semua' | 'Pemasukan' | 'Pengeluaran';
const FILTER_JENIS: FilterJenis[] = ['Semua', 'Pemasukan', 'Pengeluaran'];

type Catatan = {
  id: string;
  jenis: Jenis;
  judul: string;
  tgl: string; // YYYY-MM-DD
  jam: string;
  keterangan: string;
  nominal: number;
};

// Pendapatan: masih data contoh (nanti diganti dari data transaksi asli).
const DATA_PENDAPATAN: Catatan[] = [
  { id: 'A-013', jenis: 'masuk', judul: 'A-013 · Redvelvet (S) × 2', tgl: '2026-10-18', jam: '10:41', keterangan: 'Tunai', nominal: 18000 },
  { id: 'A-012', jenis: 'masuk', judul: 'A-012 · Durian (L) × 3', tgl: '2026-10-18', jam: '10:32', keterangan: 'QRIS', nominal: 51000 },
  { id: 'A-011', jenis: 'masuk', judul: 'A-011 · Matcha (S) × 1', tgl: '2026-10-18', jam: '10:20', keterangan: 'QRIS', nominal: 9000 },
  { id: 'A-010', jenis: 'masuk', judul: 'A-010 · Coklat (L) × 2', tgl: '2026-10-18', jam: '10:05', keterangan: 'Tunai', nominal: 38000 },
  { id: 'A-009', jenis: 'masuk', judul: 'A-009 · Mangga (L) × 2', tgl: '2026-10-16', jam: '15:12', keterangan: 'Tunai', nominal: 42000 },
  { id: 'A-008', jenis: 'masuk', judul: 'A-008 · Taro (S) × 3', tgl: '2026-10-15', jam: '11:48', keterangan: 'QRIS', nominal: 27000 },
  { id: 'A-007', jenis: 'masuk', judul: 'A-007 · Durian (S) × 1', tgl: '2026-10-10', jam: '09:30', keterangan: 'Tunai', nominal: 15000 },
  { id: 'A-006', jenis: 'masuk', judul: 'A-006 · Coklat (L) × 4', tgl: '2026-10-03', jam: '16:05', keterangan: 'QRIS', nominal: 76000 },
  { id: 'A-005', jenis: 'masuk', judul: 'A-005 · Taro (L) × 2', tgl: '2026-09-20', jam: '13:15', keterangan: 'Tunai', nominal: 34000 },
  { id: 'A-004', jenis: 'masuk', judul: 'A-004 · Durian (L) × 5', tgl: '2025-12-12', jam: '14:00', keterangan: 'QRIS', nominal: 85000 },
];

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const formatRupiah = (angka: number) =>
  'Rp ' + Math.abs(angka).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const formatSaldo = (angka: number) =>
  (angka < 0 ? '-' : '') + formatRupiah(angka);

const pad = (n: number) => String(n).padStart(2, '0');

const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function LaporanScreen() {
  const { bahanList, riwayatStokMasuk } = useBahan();

  const [mode, setMode] = useState<Mode>('Tanggal');
  const [filterJenis, setFilterJenis] = useState<FilterJenis>('Semua');
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

  // Pengeluaran asli dari stok masuk (bahan-context)
  const dataPengeluaran: Catatan[] = riwayatStokMasuk.map((s) => {
    const d = new Date(s.tanggal);
    const bahan = bahanList.find((b) => b.id === s.bahanId);
    return {
      id: `sm-${s.id}`,
      jenis: 'keluar',
      judul: `Beli ${bahan ? bahan.nama : 'bahan'} ${s.jumlah} ${bahan ? bahan.satuan : ''}`.trim(),
      tgl: toIso(d),
      jam: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      keterangan: s.catatan || 'Stok masuk',
      nominal: s.harga,
    };
  });

  const semua = [...DATA_PENDAPATAN, ...dataPengeluaran];
  const dataTampil = semua
    .filter((c) => cocok(c.tgl))
    .sort((a, b) => (b.tgl + b.jam).localeCompare(a.tgl + a.jam));

  const pendapatan = dataTampil.filter((c) => c.jenis === 'masuk').reduce((j, c) => j + c.nominal, 0);
  const pengeluaran = dataTampil.filter((c) => c.jenis === 'keluar').reduce((j, c) => j + c.nominal, 0);
  const saldo = pendapatan - pengeluaran;

  const dataRincian = dataTampil.filter((c) =>
    filterJenis === 'Semua'
      ? true
      : filterJenis === 'Pemasukan'
      ? c.jenis === 'masuk'
      : c.jenis === 'keluar'
  );

  const handleEkspor = () => {
    Alert.alert('Ekspor', 'Fitur ekspor belum tersedia pada versi ini.');
  };

  return (
    <PageTemplate>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.judul}>Laporan Keuangan</Text>
          <Text style={styles.subjudul}>Saldo, pendapatan, dan pengeluaran</Text>

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

          <View style={styles.kartuSaldo}>
            <Text style={styles.saldoLabel}>Saldo</Text>
            <Text style={styles.saldoAngka}>{formatSaldo(saldo)}</Text>
            <Text style={styles.saldoInfo}>{dataTampil.length} catatan pada periode ini</Text>
          </View>

          <View style={styles.rowKotak}>
            <View style={styles.kotak}>
              <Text style={styles.kotakLabel}>Pendapatan</Text>
              <Text style={[styles.kotakAngka, { color: '#2E7D32' }]}>{formatRupiah(pendapatan)}</Text>
            </View>
            <View style={styles.kotak}>
              <Text style={styles.kotakLabel}>Pengeluaran</Text>
              <Text style={[styles.kotakAngka, { color: '#C62828' }]}>{formatRupiah(pengeluaran)}</Text>
            </View>
          </View>

          <View style={styles.headerRiwayat}>
            <Text style={styles.riwayatJudul}>Rincian</Text>
            <TouchableOpacity onPress={handleEkspor}>
              <Text style={styles.ekspor}>Ekspor</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterJenisRow}>
            {FILTER_JENIS.map((j) => (
              <TouchableOpacity
                key={j}
                style={[styles.chip, filterJenis === j && styles.chipAktif]}
                onPress={() => setFilterJenis(j)}
              >
                <Text style={[styles.chipText, filterJenis === j && styles.chipTextAktif]}>{j}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={dataRincian}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.kosong}>Belum ada catatan di periode ini.</Text>
            }
            renderItem={({ item }) => {
              const masuk = item.jenis === 'masuk';
              return (
                <View style={styles.kartuTrx}>
                  <View style={[styles.trxBadge, { backgroundColor: masuk ? '#DDF3E0' : '#FBE0E0' }]}>
                    <Text style={[styles.trxBadgeText, { color: masuk ? '#2E7D32' : '#C62828' }]}>
                      {masuk ? 'IN' : 'OUT'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trxProduk}>{item.judul}</Text>
                    <Text style={styles.trxWaktu}>
                      {item.tgl} · {item.jam} · {item.keterangan}
                    </Text>
                  </View>
                  <Text style={[styles.trxTotal, { color: masuk ? '#2E7D32' : '#C62828' }]}>
                    {masuk ? '+' : '-'}{formatRupiah(item.nominal)}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      </SafeAreaView>
    </PageTemplate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  judul: { fontSize: 26, fontWeight: 'bold', color: '#3B2A1E' },
  subjudul: { fontSize: 13, color: '#8A7A6B', marginTop: 2, marginBottom: 14 },
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
  tabText: { fontSize: 12, fontWeight: '600', color: '#8B5A3C' },
  tabTextAktif: { color: '#FFFFFF' },
  tombolHariIni: { marginLeft: 'auto', paddingVertical: 8, paddingHorizontal: 6 },
  tombolHariIniText: { fontSize: 12, fontWeight: '600', color: '#C08A5B' },
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
  panahText: { fontSize: 22, color: '#8B5A3C', fontWeight: 'bold', marginTop: -2 },
  labelPeriode: { fontSize: 14, fontWeight: 'bold', color: '#3B2A1E' },
  kartuSaldo: {
    backgroundColor: '#8B5A3C',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  saldoLabel: { color: '#F3E3D3', fontSize: 12 },
  saldoAngka: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginVertical: 4 },
  saldoInfo: { color: '#F3E3D3', fontSize: 12 },
  rowKotak: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kotak: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14 },
  kotakLabel: { fontSize: 11, color: '#8A7A6B' },
  kotakAngka: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  headerRiwayat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  riwayatJudul: { fontSize: 15, fontWeight: 'bold', color: '#3B2A1E' },
  ekspor: { fontSize: 12, color: '#C08A5B', fontWeight: '600' },
  filterJenisRow: { flexDirection: 'row', marginBottom: 10 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2D2',
    marginRight: 8,
  },
  chipAktif: { backgroundColor: '#8B5A3C', borderColor: '#8B5A3C' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#8B5A3C' },
  chipTextAktif: { color: '#FFFFFF' },
  kosong: { textAlign: 'center', color: '#8A7A6B', marginTop: 20, fontSize: 12 },
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trxBadgeText: { fontSize: 10, fontWeight: 'bold' },
  trxProduk: { fontSize: 13, fontWeight: '600', color: '#3B2A1E' },
  trxWaktu: { fontSize: 11, color: '#8A7A6B', marginTop: 2 },
  trxTotal: { fontSize: 13, fontWeight: 'bold' },
});