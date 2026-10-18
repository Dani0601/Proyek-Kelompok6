import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const DATA_PESANAN = [
  { id: 'A-010', produk: 'Coklat (L) x 2', status: 'Siap' },
  { id: 'A-011', produk: 'Matcha (S) x 1', status: 'Diproses' },
  { id: 'A-012', produk: 'Durian (L) x 3', status: 'Menunggu' },
  { id: 'A-013', produk: 'Redvelvet (S) x 2', status: 'Menunggu' },
];

const FILTER = ['Semua', 'Menunggu', 'Diproses', 'Siap'];

export default function KasirScreen() {
  const [filter, setFilter] = useState('Semua');

  const dataTampil =
    filter === 'Semua'
      ? DATA_PESANAN
      : DATA_PESANAN.filter((p) => p.status === filter);

  return (
    <View style={styles.container}>
      <Text style={styles.judul}>Antrean Pesanan</Text>
      <Text style={styles.subjudul}>
        {DATA_PESANAN.length} pesanan aktif hari ini
      </Text>

      <View style={styles.filterRow}>
        {FILTER.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabAktif]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabText, filter === f && styles.tabTextAktif]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={dataTampil}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.kartu}>
            <View style={styles.nomorBox}>
              <Text style={styles.nomor}>{item.id}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.produk}>{item.produk}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <TouchableOpacity style={styles.tombol}>
              <Text style={styles.tombolText}>Proses</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF6EC', padding: 20, paddingTop: 50 },
  judul: { fontSize: 20, fontWeight: 'bold', color: '#3B2A1E' },
  subjudul: { fontSize: 12, color: '#8A7A6B', marginBottom: 16 },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  tabAktif: { backgroundColor: '#8B5A3C' },
  tabText: { fontSize: 12, color: '#8B5A3C' },
  tabTextAktif: { color: '#FFFFFF' },
  kartu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  nomorBox: {
    backgroundColor: '#F3E3D3',
    borderRadius: 10,
    padding: 10,
    marginRight: 12,
  },
  nomor: { fontWeight: 'bold', color: '#8B5A3C' },
  produk: { fontSize: 14, fontWeight: '600', color: '#3B2A1E' },
  status: { fontSize: 11, color: '#8A7A6B', marginTop: 2 },
  tombol: {
    backgroundColor: '#8B5A3C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tombolText: { color: '#FFFFFF', fontSize: 12 },
});