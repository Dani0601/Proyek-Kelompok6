import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import PageTemplate from '@/components/templates/PageTemplate';
import { ambilTransaksi, ambilStokMasuk } from '@/lib/transaksi-api';

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

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const formatRupiah = (angka: number) =>
  'Rp ' + Math.abs(angka).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const formatSaldo = (angka: number) => (angka < 0 ? '-' : '') + formatRupiah(angka);

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const jamDari = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function LaporanScreen() {
  const [semua, setSemua] = useState<Catatan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [gagal, setGagal] = useState(false);

  const [mode, setMode] = useState<Mode>('Tanggal');
  const [filterJenis, setFilterJenis] = useState<FilterJenis>('Semua');
  const [acuan, setAcuan] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      (async () => {
        const [trx, stok] = await Promise.all([ambilTransaksi(), ambilStokMasuk()]);
        if (!aktif) return;

        if (trx === null || stok === null) {
          setGagal(true);
        } else {
          setGagal(false);
          const pemasukan: Catatan[] = trx.map((t) => {
            const d = new Date(t.waktu);
            return {
              id: `trx-${t.id}-${t.waktu}`,
              jenis: 'masuk',
              judul: `${t.id} · ${t.items.map((i) => `${i.nama} × ${i.qty}`).join(', ')}`,
              tgl: toIso(d),
              jam: jamDari(d),
              keterangan: t.metode,
              nominal: t.total,
            };
          });
          const pengeluaran: Catatan[] = stok.map((s) => {
            const d = new Date(s.tanggal);
            return {
              id: `sm-${s.id}`,
              jenis: 'keluar',
              judul: `Beli ${s.nama} ${s.jumlah} ${s.satuan}`.trim(),
              tgl: toIso(d),
              jam: jamDari(d),
              keterangan: s.catatan || 'Stok masuk',
              nominal: s.harga,
            };
          });
          setSemua([...pemasukan, ...pengeluaran]);
        }
        setMemuat(false);
      })();
      return () => {
        aktif = false;
      };
    }, [])
  );

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

  const dataTampil = semua
    .filter((c) => cocok(c.tgl))
    .sort((a, b) => (b.tgl + b.jam).localeCompare(a.tgl + a.jam));

  const pendapatan = dataTampil.filter((c) => c.jenis === 'masuk').reduce((j, c) => j + c.nominal, 0);
  const pengeluaran = dataTampil.filter((c) => c.jenis === 'keluar').reduce((j, c) => j + c.nominal, 0);
  const saldo = pendapatan - pengeluaran;

  const dataRincian = dataTampil.filter((c) =>
    filterJenis === 'Semua' ? true : filterJenis === 'Pemasukan' ? c.jenis === 'masuk' : c.jenis === 'keluar'
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

          {memuat ? (
            <ActivityIndicator color="#8B5A3C" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={dataRincian}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                gagal ? (
                  <Text style={styles.kosong}>Gagal memuat laporan. Periksa koneksi internet.</Text>
                ) : undefined
              }
              ListEmptyComponent={
                gagal ? undefined : <Text style={styles.kosong}>Belum ada catatan di periode ini.</Text>
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
                      <Text style={styles.trxProduk} numberOfLines={2}>{item.judul}</Text>
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
          )}
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