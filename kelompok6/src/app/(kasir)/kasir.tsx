import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrders, type Status } from '@/context/order-context';

import PageTemplate from '@/components/templates/PageTemplate';
import { StickyMilkFonts } from '@/constants/design-tokens';
const FILTER: ('Semua' | Status)[] = ['Semua', 'Menunggu', 'Diproses', 'Siap'];

const WARNA_STATUS: Record<Status, { bg: string; teks: string }> = {
  Menunggu: { bg: '#FDECC8', teks: '#9A6700' },
  Diproses: { bg: '#DCEBFA', teks: '#1F5FA8' },
  Siap: { bg: '#DDF3E0', teks: '#2E7D32' },
};

export default function KasirScreen() {
  const [filter, setFilter] = useState<'Semua' | Status>('Semua');
  const { pesanan, ubahStatus } = useOrders();

  const dataTampil =
    filter === 'Semua' ? pesanan : pesanan.filter((p) => p.status === filter);

  return (
    <PageTemplate>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.judul}>Antrean Pesanan</Text>
          <Text style={styles.subjudul}>{pesanan.length} pesanan aktif hari ini</Text>

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
        renderItem={({ item }) => {
          const warna = WARNA_STATUS[item.status];
          const selesai = item.status === 'Siap';
          return (
            <View style={styles.kartu}>
              <View style={styles.nomorBox}>
                <Text style={styles.nomor}>{item.id}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.produk}>{item.produk}</Text>
                <View style={[styles.badge, { backgroundColor: warna.bg }]}>
                  <Text style={[styles.badgeText, { color: warna.teks }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.tombol, selesai && styles.tombolNonaktif]}
                onPress={() => ubahStatus(item.id)}
                disabled={selesai}
              >
                <Text style={styles.tombolText}>
                  {item.status === 'Menunggu'
                    ? 'Proses'
                    : item.status === 'Diproses'
                    ? 'Selesai'
                    : 'Siap'}
                </Text>
              </TouchableOpacity>
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
  judul: { fontFamily: StickyMilkFonts.heading, fontSize: 26, color: '#3B2A1E' },
  subjudul: { fontFamily: StickyMilkFonts.body, fontSize: 13, color: '#8A7A6B', marginTop: 2, marginBottom: 16 },
  filterRow: { flexDirection: 'row', marginBottom: 16 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  tabAktif: { backgroundColor: '#8B5A3C' },
  tabText: { fontFamily: StickyMilkFonts.bodySemi, fontSize: 12, color: '#8B5A3C' },
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
  nomor: { fontFamily: StickyMilkFonts.headingSemi, color: '#8B5A3C' },
  produk: { fontFamily: StickyMilkFonts.bodyBold, fontSize: 14, color: '#3B2A1E' },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  badgeText: { fontFamily: StickyMilkFonts.bodyBold, fontSize: 11 },
  tombol: {
    backgroundColor: '#8B5A3C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tombolNonaktif: { backgroundColor: '#C9B8A8' },
  tombolText: { fontFamily: StickyMilkFonts.headingSemi, color: '#FFFFFF', fontSize: 12 },
});
