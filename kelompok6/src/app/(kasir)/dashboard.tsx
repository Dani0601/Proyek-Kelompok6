import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const ANTREAN_AKTIF = [
  { id: 'A-010', produk: 'Coklat (L) × 2', status: 'Siap' },
  { id: 'A-011', produk: 'Matcha (S) × 1', status: 'Diproses' },
  { id: 'A-012', produk: 'Durian (L) × 3', status: 'Menunggu' },
];

const WARNA_STATUS: Record<string, { bg: string; teks: string }> = {
  Menunggu: { bg: '#FDECC8', teks: '#9A6700' },
  Diproses: { bg: '#DCEBFA', teks: '#1F5FA8' },
  Siap: { bg: '#DDF3E0', teks: '#2E7D32' },
};

export default function DashboardKasir() {
  const router = useRouter();

  const menunggu = ANTREAN_AKTIF.filter((a) => a.status === 'Menunggu').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sapaan}>Halo, Kasir 👋</Text>
          <Text style={styles.judul}>Dashboard</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>K</Text>
        </View>
      </View>

      <View style={styles.kartuTotal}>
        <Text style={styles.totalLabel}>Penjualan Saya Hari Ini</Text>
        <Text style={styles.totalAngka}>Rp 640.000</Text>
      </View>

      <View style={styles.rowKotak}>
        <View style={styles.kotak}>
          <Text style={styles.kotakLabel}>Menunggu</Text>
          <Text style={styles.kotakAngka}>{menunggu}</Text>
        </View>
        <View style={styles.kotak}>
          <Text style={styles.kotakLabel}>Transaksi</Text>
          <Text style={styles.kotakAngka}>7</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.tombolBaru}
        onPress={() => router.push('/(kasir)/transaksi')}
      >
        <Text style={styles.tombolBaruText}>+ Transaksi Baru</Text>
      </TouchableOpacity>

      <View style={styles.headerAntrean}>
        <Text style={styles.antreanJudul}>Antrean aktif</Text>
        <TouchableOpacity onPress={() => router.push('/(kasir)/kasir')}>
          <Text style={styles.lihatSemua}>Lihat semua</Text>
        </TouchableOpacity>
      </View>

      {ANTREAN_AKTIF.map((item) => {
        const warna = WARNA_STATUS[item.status];
        return (
          <View key={item.id} style={styles.kartuAntrean}>
            <View style={styles.nomorBox}>
              <Text style={styles.nomor}>{item.id}</Text>
            </View>
            <Text style={styles.produk}>{item.produk}</Text>
            <View style={[styles.badge, { backgroundColor: warna.bg }]}>
              <Text style={[styles.badgeText, { color: warna.teks }]}>{item.status}</Text>
            </View>
          </View>
        );
      })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF6EC' },
  container: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sapaan: { fontSize: 12, color: '#8A7A6B' },
  judul: { fontSize: 26, fontWeight: 'bold', color: '#3B2A1E' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E3D3', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: 'bold', color: '#8B5A3C' },
  kartuTotal: { backgroundColor: '#8B5A3C', borderRadius: 20, padding: 18, marginBottom: 14 },
  totalLabel: { color: '#F3E3D3', fontSize: 12 },
  totalAngka: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  rowKotak: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  kotak: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14 },
  kotakLabel: { fontSize: 11, color: '#8A7A6B' },
  kotakAngka: { fontSize: 20, fontWeight: 'bold', color: '#3B2A1E', marginTop: 2 },
  tombolBaru: { backgroundColor: '#8B5A3C', borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginBottom: 18 },
  tombolBaruText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  headerAntrean: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  antreanJudul: { fontSize: 15, fontWeight: 'bold', color: '#3B2A1E' },
  lihatSemua: { fontSize: 12, color: '#C08A5B', fontWeight: '600' },
  kartuAntrean: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 10 },
  nomorBox: { backgroundColor: '#F3E3D3', borderRadius: 10, padding: 10, marginRight: 12 },
  nomor: { fontWeight: 'bold', color: '#8B5A3C' },
  produk: { flex: 1, fontSize: 13, fontWeight: '600', color: '#3B2A1E' },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});