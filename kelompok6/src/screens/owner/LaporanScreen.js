import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const FILTER = ['Hari ini', 'Minggu ini', 'Bulan ini'];

// 'periode' menentukan transaksi muncul di tab mana:
// hari   = Hari ini, Minggu ini, Bulan ini
// minggu = Minggu ini, Bulan ini
// bulan  = Bulan ini saja
const DATA_TRANSAKSI = [
  { id: 'A-013', produk: 'Redvelvet (S) × 2', waktu: '18 Okt 2026 · 10:41', metode: 'Tunai', total: 18000, periode: 'hari' },
  { id: 'A-012', produk: 'Durian (L) × 3', waktu: '18 Okt 2026 · 10:32', metode: 'QRIS', total: 51000, periode: 'hari' },
  { id: 'A-011', produk: 'Matcha (S) × 1', waktu: '18 Okt 2026 · 10:20', metode: 'QRIS', total: 9000, periode: 'hari' },
  { id: 'A-010', produk: 'Coklat (L) × 2', waktu: '18 Okt 2026 · 10:05', metode: 'Tunai', total: 38000, periode: 'hari' },
  { id: 'A-009', produk: 'Mangga (L) × 2', waktu: '16 Okt 2026 · 15:12', metode: 'Tunai', total: 42000, periode: 'minggu' },
  { id: 'A-008', produk: 'Taro (S) × 3', waktu: '15 Okt 2026 · 11:48', metode: 'QRIS', total: 27000, periode: 'minggu' },
  { id: 'A-007', produk: 'Durian (S) × 1', waktu: '10 Okt 2026 · 09:30', metode: 'Tunai', total: 15000, periode: 'bulan' },
  { id: 'A-006', produk: 'Coklat (L) × 4', waktu: '03 Okt 2026 · 16:05', metode: 'QRIS', total: 76000, periode: 'bulan' },
];

const formatRupiah = (angka) =>
  'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const formatJuta = (angka) => {
  if (angka >= 1000000) {
    return 'Rp ' + (angka / 1000000).toFixed(1).replace('.', ',') + ' jt';
  }
  return formatRupiah(angka);
};

const cocokPeriode = (periode, filter) => {
  if (filter === 'Hari ini') return periode === 'hari';
  if (filter === 'Minggu ini') return periode === 'hari' || periode === 'minggu';
  return true;
};

export default function LaporanScreen() {
  const [filter, setFilter] = useState('Hari ini');

  const dataTampil = DATA_TRANSAKSI.filter((t) => cocokPeriode(t.periode, filter));

  const totalPenjualan = dataTampil.reduce((jumlah, t) => jumlah + t.total, 0);
  const jumlahTransaksi = dataTampil.length;
  const rataRata = jumlahTransaksi > 0 ? Math.round(totalPenjualan / jumlahTransaksi) : 0;
  const totalTunai = dataTampil
    .filter((t) => t.metode === 'Tunai')
    .reduce((jumlah, t) => jumlah + t.total, 0);
  const totalQris = dataTampil
    .filter((t) => t.metode === 'QRIS')
    .reduce((jumlah, t) => jumlah + t.total, 0);

  const handleEkspor = () => {
    Alert.alert('Ekspor', 'Fitur ekspor belum tersedia pada versi ini.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.judul}>Riwayat dan Laporan</Text>
      <Text style={styles.subjudul}>Transaksi terdahulu dan rekap penjualan</Text>

      <View style={styles.filterRow}>
        {FILTER.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabAktif]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabText, filter === f && styles.tabTextAktif]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.kartuTotal}>
        <Text style={styles.totalLabel}>Total penjualan</Text>
        <Text style={styles.totalAngka}>{formatRupiah(totalPenjualan)}</Text>
        <Text style={styles.totalInfo}>
          {jumlahTransaksi} transaksi · rata-rata {formatRupiah(rataRata)}
        </Text>
      </View>

      <View style={styles.kartuMetode}>
        <View>
          <Text style={styles.metodeLabel}>Tunai</Text>
          <Text style={styles.metodeAngka}>{formatJuta(totalTunai)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.metodeLabel}>QRIS</Text>
          <Text style={styles.metodeAngka}>{formatJuta(totalQris)}</Text>
        </View>
      </View>

      <View style={styles.headerRiwayat}>
        <Text style={styles.riwayatJudul}>Riwayat transaksi</Text>
        <TouchableOpacity onPress={handleEkspor}>
          <Text style={styles.ekspor}>Ekspor</Text>
        </TouchableOpacity>
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
              <Text style={styles.trxWaktu}>{item.waktu} · {item.metode}</Text>
            </View>
            <Text style={styles.trxTotal}>{formatRupiah(item.total)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF6EC', padding: 20, paddingTop: 50 },
  judul: { fontSize: 22, fontWeight: 'bold', color: '#3B2A1E' },
  subjudul: { fontSize: 12, color: '#8A7A6B', marginBottom: 14 },
  filterRow: { flexDirection: 'row', marginBottom: 14 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2D2',
    marginRight: 8,
  },
  tabAktif: { backgroundColor: '#8B5A3C', borderColor: '#8B5A3C' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#8B5A3C' },
  tabTextAktif: { color: '#FFFFFF' },
  kartuTotal: {
    backgroundColor: '#8B5A3C',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  totalLabel: { color: '#F3E3D3', fontSize: 12 },
  totalAngka: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginVertical: 4 },
  totalInfo: { color: '#F3E3D3', fontSize: 12 },
  kartuMetode: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  metodeLabel: { fontSize: 11, color: '#8A7A6B' },
  metodeAngka: { fontSize: 14, fontWeight: 'bold', color: '#3B2A1E' },
  headerRiwayat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  riwayatJudul: { fontSize: 15, fontWeight: 'bold', color: '#3B2A1E' },
  ekspor: { fontSize: 12, color: '#C08A5B', fontWeight: '600' },
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
    backgroundColor: '#F3E3D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trxBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#8B5A3C' },
  trxProduk: { fontSize: 13, fontWeight: '600', color: '#3B2A1E' },
  trxWaktu: { fontSize: 11, color: '#8A7A6B', marginTop: 2 },
  trxTotal: { fontSize: 13, fontWeight: 'bold', color: '#8B5A3C' },
});