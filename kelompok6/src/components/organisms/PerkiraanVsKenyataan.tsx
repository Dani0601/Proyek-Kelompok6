import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatRupiah } from '@/context/produk-context';
import { modeContohAktif } from '@/lib/ai/forecast-data';
import {
  evaluasiHarian,
  rangkumanMingguan,
  type BarisEvaluasi,
  type KategoriHari,
} from '@/lib/ai/forecast-evaluasi';
import type { DetailTransaksi } from '@/utils/detail-transaksi';

const HARI_EVALUASI = 7;

const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const KATEGORI: Record<KategoriHari, { teks: string; bg: string; warna: string }> = {
  sesuai: { teks: 'Sesuai', bg: '#DDF3E0', warna: '#2E7D32' },
  'lebih-ramai': { teks: 'Lebih ramai', bg: '#DCEBFA', warna: '#1F5FA8' },
  'lebih-sepi': { teks: 'Lebih sepi', bg: '#FDECC8', warna: '#9A6700' },
};

/** 'YYYY-MM-DD' -> 'Sen, 15 Nov' */
function labelTanggal(tanggal: string): string {
  const [y, m, d] = tanggal.split('-').map(Number);
  if (!y || !m || !d) return tanggal;
  const tgl = new Date(y, m - 1, d);
  return `${NAMA_HARI[tgl.getDay()]}, ${d} ${NAMA_BULAN[m - 1]}`;
}

const bertanda = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${formatRupiah(Math.abs(n))}`;

type Props = { transaksi: DetailTransaksi[] };

export default function PerkiraanVsKenyataan({ transaksi }: Props) {
  const [baris, setBaris] = useState<BarisEvaluasi[]>([]);
  const [menghitung, setMenghitung] = useState(true);
  const [galat, setGalat] = useState(false);

  useEffect(() => {
    let batal = false;
    setMenghitung(true);
    setGalat(false);

    (async () => {
      try {
        const hasil = await evaluasiHarian(transaksi, HARI_EVALUASI);
        if (!batal) setBaris(hasil);
      } catch (e) {
        console.warn('[PerkiraanVsKenyataan] gagal menghitung', e);
        if (!batal) setGalat(true);
      } finally {
        if (!batal) setMenghitung(false);
      }
    })();

    return () => {
      batal = true;
    };
  }, [transaksi]);

  const dataContoh = modeContohAktif();
  const ringkas = rangkumanMingguan(baris);
  const adaYangBukanBukti = baris.some((b) => !b.dihitungSebagaiBukti);

  return (
    <View style={styles.wadah}>
      <Text style={styles.judul}>Perkiraan vs Kenyataan</Text>

      {dataContoh ? (
        <View style={styles.pita}>
          <Text style={styles.pitaTeks}>DATA CONTOH — bukan penjualan nyata</Text>
        </View>
      ) : null}

      {menghitung ? (
        <View style={styles.barisKeadaan}>
          <ActivityIndicator size="small" color="#8B5A3C" />
          <Text style={styles.keadaan}>Menghitung perbandingan…</Text>
        </View>
      ) : galat ? (
        <Text style={[styles.keadaan, { color: '#B3261E' }]}>
          Perbandingan gagal dihitung. Buka ulang halaman ini untuk mencoba lagi.
        </Text>
      ) : baris.length === 0 ? (
        <Text style={styles.keadaan}>
          Belum cukup data untuk membandingkan. Perlu minimal 7 hari penjualan sebelum hari yang dibandingkan.
        </Text>
      ) : (
        <>
          <Text style={styles.ringkasan}>
            Dalam {HARI_EVALUASI} hari terakhir, perkiraan tepat {ringkas.tepat} dari {ringkas.total} hari yang
            dibandingkan. Rata-rata meleset {formatRupiah(ringkas.rataMeleset)} per hari.
          </Text>

          {baris.map((b) => {
            const k = KATEGORI[b.kategori];
            return (
              <View key={b.tanggal} style={styles.baris}>
                <View style={styles.barisAtas}>
                  <Text style={styles.tanggal}>
                    {labelTanggal(b.tanggal)}
                    {b.dihitungSebagaiBukti ? '' : ' *'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: k.bg }]}>
                    <Text style={[styles.badgeTeks, { color: k.warna }]}>{k.teks}</Text>
                  </View>
                </View>
                <Text style={styles.angka}>
                  Perkiraan {formatRupiah(b.perkiraan)} · Kenyataan {formatRupiah(b.kenyataan)}
                </Text>
                <Text style={styles.selisih}>Selisih {bertanda(b.selisih)}</Text>
              </View>
            );
          })}

          <Text style={styles.catatan}>
            Perkiraan tiap hari dihitung ulang dari data hari sebelumnya (uji mundur), bukan perkiraan lama yang
            tersimpan. Sesuai = selisih paling banyak 15% dari penjualan sebenarnya.
          </Text>
          {adaYangBukanBukti ? (
            <Text style={styles.catatan}>
              * Hari bertanda ini ikut data latih atau memakai data contoh, jadi hasilnya belum bisa dianggap bukti
              akurasi.
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wadah: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  judul: { fontSize: 15, fontWeight: 'bold', color: '#3B2A1E', marginBottom: 8 },

  pita: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDECC8',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  pitaTeks: { fontSize: 11, fontWeight: 'bold', color: '#9A6700' },

  barisKeadaan: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keadaan: { fontSize: 12, color: '#8A7A6B', lineHeight: 18 },

  ringkasan: { fontSize: 13, fontWeight: '600', color: '#3B2A1E', lineHeight: 19, marginBottom: 10 },

  baris: { borderTopWidth: 1, borderTopColor: '#F0E2D2', paddingVertical: 10 },
  barisAtas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tanggal: { fontSize: 13, fontWeight: 'bold', color: '#3B2A1E' },
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
  badgeTeks: { fontSize: 11, fontWeight: '600' },
  angka: { fontSize: 12, color: '#3B2A1E' },
  selisih: { fontSize: 11, color: '#8A7A6B', marginTop: 2 },

  catatan: { fontSize: 11, color: '#8A7A6B', lineHeight: 16, marginTop: 8 },
});