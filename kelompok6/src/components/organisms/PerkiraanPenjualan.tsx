import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StickyMilkColors } from '@/constants/design-tokens';
import { formatRupiah } from '@/context/produk-context';
import { tentukanAcuan } from '@/lib/ai/forecast-data';
import { metrik } from '@/lib/ai/forecast-model';
import {
  hariPalingRamai,
  hitungPerkiraan,
  perkiraanBerantai,
  type HasilPerkiraan,
} from '@/lib/ai/forecast-service';
import type { DetailTransaksi } from '@/utils/detail-transaksi';

const COLORS = {
  card: StickyMilkColors.surface,
  brown: StickyMilkColors.primary,
  caramel: StickyMilkColors.accent,
  sand: StickyMilkColors.sand,
  textDark: StickyMilkColors.textDark,
  textMuted: StickyMilkColors.textMuted,
  border: StickyMilkColors.borderWarm,
  hijau: '#2E7D32',
  kuning: '#9A6700',
  merah: '#B3261E',
};

const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};

const NAMA_HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const TINGGI_MAKS = 70;
const TINGGI_MIN = 6;

/** Gabungkan varian ukuran: "Coklat S" dan "Coklat L" menjadi "Coklat". */
const gabungUkuran = (nama: string) => nama.replace(/\s*\(?\b(S|L)\b\)?\s*$/i, '').trim() || nama;

const dua = (n: number) => String(n).padStart(2, '0');

const angka = (n?: number) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(3).replace('.', ',') : '-');

function labelSumber(h: HasilPerkiraan): { teks: string; warna: string } {
  if (h.sumber === 'model') return { teks: 'Dihitung AI di HP ini', warna: COLORS.hijau };
  if (h.sumber === 'sederhana') {
    return { teks: 'Perkiraan sederhana (rata-rata 7 hari terakhir)', warna: COLORS.kuning };
  }
  return { teks: 'Data belum cukup. Perlu minimal 14 hari penjualan', warna: COLORS.textMuted };
}

/** Tren hanya bermakna untuk hasil model; pada perkiraan sederhana angkanya selalu sama dengan "biasanya". */
function teksTren(h: HasilPerkiraan): { teks: string; warna: string } | null {
  if (h.sumber !== 'model' || h.omzet === null || h.omzetRata7 === null || h.omzetRata7 <= 0) return null;
  const persen = Math.round((Math.abs(h.omzet - h.omzetRata7) / h.omzetRata7) * 100);
  if (persen < 1) return { teks: 'Sama seperti biasanya', warna: COLORS.textMuted };
  if (h.omzet > h.omzetRata7) return { teks: `▲ ${persen}% lebih ramai dari biasanya`, warna: COLORS.hijau };
  return { teks: `▼ ${persen}% lebih sepi dari biasanya`, warna: COLORS.kuning };
}

function Pita() {
  return (
    <View style={styles.pita}>
      <Text style={styles.pitaTeks}>DATA CONTOH — bukan penjualan nyata</Text>
    </View>
  );
}

type Props = {
  transaksi: DetailTransaksi[];
  /** true selama transaksi masih dimuat, supaya tidak sempat tampil "Data belum cukup". */
  memuat?: boolean;
};

export default function PerkiraanPenjualan({ transaksi, memuat = false }: Props) {
  const [hasil, setHasil] = useState<HasilPerkiraan | null>(null);
  const [berantai, setBerantai] = useState<HasilPerkiraan[]>([]);
  const [menghitung, setMenghitung] = useState(true);
  const [galat, setGalat] = useState(false);
  const [diperbarui, setDiperbarui] = useState<Date | null>(null);
  const [lembarBuka, setLembarBuka] = useState(false);
  /** Menu yang dipilih di kartu "Siapkan Besok"; null = semua menu (3 teratas). */
  const [menuDipilih, setMenuDipilih] = useState<string | null>(null);

  useEffect(() => {
    if (memuat) return;
    let batal = false;
    setMenghitung(true);
    setGalat(false);

    (async () => {
      try {
        const satu = await hitungPerkiraan(transaksi);
        const tujuh = await perkiraanBerantai(transaksi, 7);
        if (batal) return;
        setHasil(satu);
        setBerantai(tujuh);
        setDiperbarui(new Date());
      } catch (e) {
        console.warn('[PerkiraanPenjualan] gagal menghitung', e);
        if (!batal) setGalat(true);
      } finally {
        if (!batal) setMenghitung(false);
      }
    })();

    return () => {
      batal = true;
    };
  }, [transaksi, memuat]);

  const ramai = useMemo(() => {
    try {
      return hariPalingRamai(transaksi);
    } catch {
      return null;
    }
  }, [transaksi]);

  const siapBesok = useMemo(() => {
    if (!hasil || hasil.sumber === 'kurang-data') return [];
    const peta = new Map<string, { nama: string; porsi: number; rata7: number }>();
    for (const p of hasil.produk) {
      const kunci = gabungUkuran(p.nama);
      const a = peta.get(kunci) ?? { nama: kunci, porsi: 0, rata7: 0 };
      a.porsi += p.porsi;
      a.rata7 += p.rata7;
      peta.set(kunci, a);
    }
    return [...peta.values()].sort((a, b) => b.rata7 - a.rata7);
  }, [hasil]);

  // Bila menu yang dipilih tidak ada lagi (mis. data berubah), kembali ke "Semua".
  const menuAktif = menuDipilih && siapBesok.some((m) => m.nama === menuDipilih) ? menuDipilih : null;

  /** Rincian per varian (mis. S dan L) untuk menu yang dipilih. */
  const rincianMenu = useMemo(() => {
    if (!hasil || !menuAktif) return [];
    return hasil.produk.filter((p) => gabungUkuran(p.nama) === menuAktif);
  }, [hasil, menuAktif]);

  const batang = useMemo(() => {
    if (berantai.length === 0 || berantai[0].sumber === 'kurang-data') return [];
    const acuan = tentukanAcuan();
    const nilai = berantai.map((h) => h.omzet ?? 0);
    const maks = Math.max(...nilai, 0);
    const indeksTertinggi = maks > 0 ? nilai.indexOf(maks) : -1;
    return nilai.map((v, k) => {
      const d = new Date(acuan);
      d.setDate(d.getDate() + k + 1);
      return {
        label: NAMA_HARI_PENDEK[d.getDay()],
        tinggi: maks > 0 ? Math.max(TINGGI_MIN, Math.round((v / maks) * TINGGI_MAKS)) : TINGGI_MIN,
        tertinggi: k === indeksTertinggi,
      };
    });
  }, [berantai]);

  const sedangMenghitung = memuat || menghitung;
  const sumber = hasil ? labelSumber(hasil) : null;
  const tren = hasil ? teksTren(hasil) : null;
  const dataContoh = Boolean(hasil?.dataContoh);

  const keadaan = (
    <View style={styles.barisKeadaan}>
      {sedangMenghitung ? <ActivityIndicator size="small" color={COLORS.brown} /> : null}
      <Text style={[styles.keadaanTeks, galat && !sedangMenghitung ? { color: COLORS.merah } : null]}>
        {sedangMenghitung
          ? 'Menghitung perkiraan…'
          : 'Perkiraan gagal dihitung. Tarik layar ke bawah untuk mencoba lagi.'}
      </Text>
    </View>
  );

  const adaHasil = !sedangMenghitung && !galat && hasil !== null;
  const cukupData = adaHasil && hasil!.sumber !== 'kurang-data';

  return (
    <View style={styles.wadah}>
      {/* Kartu 1: Perkiraan Penjualan Besok */}
      <View style={styles.card}>
        {dataContoh && cukupData ? <Pita /> : null}
        <Text style={styles.judulKartu}>Perkiraan Penjualan Besok</Text>

        {!adaHasil ? (
          keadaan
        ) : cukupData ? (
          <>
            <Text style={styles.angkaBesar}>{formatRupiah(hasil!.omzet ?? 0)}</Text>
            {hasil!.bawah !== null && hasil!.atas !== null ? (
              <Text style={styles.kisaran}>
                Kisaran {formatRupiah(hasil!.bawah)} – {formatRupiah(hasil!.atas)}
              </Text>
            ) : null}
            {tren ? <Text style={[styles.tren, { color: tren.warna }]}>{tren.teks}</Text> : null}
          </>
        ) : (
          <Text style={styles.keadaanTeks}>{hasil!.catatan}</Text>
        )}

        {adaHasil && sumber ? (
          <View style={styles.barisSumber}>
            <View style={[styles.titik, { backgroundColor: sumber.warna }]} />
            <Text style={styles.sumberTeks}>{sumber.teks}</Text>
            <Pressable onPress={() => setLembarBuka(true)} accessibilityLabel="Cara hitung" hitSlop={8}>
              <Text style={styles.caraHitung}>Cara hitung</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Kartu 2: 7 Hari ke Depan */}
      <View style={styles.card}>
        {dataContoh && cukupData ? <Pita /> : null}
        <Text style={styles.judulKartu}>7 Hari ke Depan</Text>

        {!adaHasil ? (
          keadaan
        ) : batang.length > 0 ? (
          <>
            <View style={styles.barisBatang}>
              {batang.map((b, i) => (
                <View key={i} style={styles.kolomBatang}>
                  <View style={styles.areaBatang}>
                    <View
                      style={[
                        styles.batang,
                        { height: b.tinggi, backgroundColor: b.tertinggi ? COLORS.brown : COLORS.sand },
                      ]}
                    />
                  </View>
                  <Text style={styles.labelBatang}>{b.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.catatanKecil}>Perkiraan kasar: makin jauh harinya, makin tidak pasti.</Text>
            {ramai ? <Text style={styles.ramai}>Paling ramai: {ramai.hari}</Text> : null}
          </>
        ) : (
          <Text style={styles.keadaanTeks}>Muncul setelah data penjualan cukup.</Text>
        )}
      </View>

      {/* Kartu 3: Siapkan Besok */}
      <View style={styles.card}>
        {dataContoh && cukupData ? <Pita /> : null}
        <Text style={styles.judulKartu}>Siapkan Besok</Text>

        {!adaHasil ? (
          keadaan
        ) : siapBesok.length > 0 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.barisChip}>
              {[null, ...siapBesok.map((m) => m.nama)].map((nama) => {
                const aktif = nama === menuAktif;
                return (
                  <Pressable
                    key={nama ?? 'semua'}
                    onPress={() => setMenuDipilih(nama)}
                    style={[styles.chip, aktif ? styles.chipAktif : null]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: aktif }}
                    accessibilityLabel={nama ? `Pilih menu ${nama}` : 'Tampilkan semua menu'}>
                    <Text style={[styles.chipTeks, aktif ? styles.chipTeksAktif : null]}>{nama ?? 'Semua'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {menuAktif === null
              ? siapBesok.slice(0, 3).map((p, i) => (
                  <View key={p.nama} style={styles.barisProduk}>
                    <View style={styles.rank}>
                      <Text style={styles.rankTeks}>{i + 1}</Text>
                    </View>
                    <Text style={styles.namaProduk} numberOfLines={1}>
                      {p.nama}
                    </Text>
                    <Text style={styles.porsi}>± {Math.round(p.porsi)} porsi</Text>
                  </View>
                ))
              : rincianMenu.map((p) => (
                  <View key={p.nama} style={styles.barisProduk}>
                    <Text style={styles.namaProduk} numberOfLines={1}>
                      {p.nama}
                    </Text>
                    <Text style={styles.porsi}>
                      ± {Math.round(p.porsi)} porsi
                      <Text style={styles.biasanya}> (biasanya {Math.round(p.rata7)})</Text>
                    </Text>
                  </View>
                ))}
            {sumber ? (
              <View style={styles.barisSumber}>
                <View style={[styles.titik, { backgroundColor: sumber.warna }]} />
                <Text style={styles.sumberTeks}>{sumber.teks}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.keadaanTeks}>Muncul setelah data penjualan cukup.</Text>
        )}
      </View>

      {/* Lembar Cara hitung */}
      <Modal visible={lembarBuka} transparent animationType="fade" onRequestClose={() => setLembarBuka(false)}>
        <Pressable style={styles.latar} onPress={() => setLembarBuka(false)}>
          <Pressable style={styles.lembar} onPress={() => {}}>
            <Text style={styles.judulLembar}>Cara hitung</Text>

            <Text style={styles.isiLembar}>
              Dihitung dari {hasil?.hariData ?? 0} hari data penjualan.
            </Text>
            <Text style={styles.isiLembar}>
              Terakhir diperbarui:{' '}
              {diperbarui
                ? `${dua(diperbarui.getDate())}/${dua(diperbarui.getMonth() + 1)}/${diperbarui.getFullYear()} ${dua(
                    diperbarui.getHours()
                  )}.${dua(diperbarui.getMinutes())}`
                : '-'}
            </Text>
            <Text style={styles.isiLembar}>Ini perkiraan, bukan jaminan.</Text>
            {hasil?.catatan ? <Text style={styles.isiLembar}>{hasil.catatan}</Text> : null}

            <View style={styles.garis} />
            <Text style={styles.teknisJudul}>Rincian teknis (untuk keperluan dosen)</Text>
            <Text style={styles.teknis}>Sumber: {hasil?.sumber ?? '-'}</Text>
            <Text style={styles.teknis}>MAE model (porsi): {angka(metrik?.model?.MAE)}</Text>
            <Text style={styles.teknis}>MAE rata-rata 7 hari (porsi): {angka(metrik?.baseline_ma7?.MAE)}</Text>
            <Text style={styles.teknis}>Jumlah data uji (n_test): {metrik?.n_test ?? '-'}</Text>
            <Text style={styles.teknis}>
              Data latih: SINTETIS{metrik?.data_source ? ` (${metrik.data_source})` : ''}. Hasil ini membuktikan alur AI
              berjalan, bukan akurasi untuk penjualan Sticky Milk yang sebenarnya.
            </Text>

            <Pressable style={styles.tombolTutup} onPress={() => setLembarBuka(false)} accessibilityLabel="Tutup">
              <Text style={styles.tombolTutupTeks}>Tutup</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wadah: { marginTop: 24, gap: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  judulKartu: { fontFamily: FONTS.heading, fontSize: 15, color: COLORS.textDark, marginBottom: 8 },

  pita: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDECC8',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  pitaTeks: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.kuning },

  barisKeadaan: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keadaanTeks: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },

  angkaBesar: { fontFamily: FONTS.heading, fontSize: 30, lineHeight: 40, color: COLORS.brown },
  kisaran: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  tren: { fontFamily: FONTS.bodyBold, fontSize: 13, marginTop: 4 },

  barisSumber: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  titik: { width: 8, height: 8, borderRadius: 4 },
  sumberTeks: { flex: 1, fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  caraHitung: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.caramel,
    textDecorationLine: 'underline',
  },

  barisBatang: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  kolomBatang: { alignItems: 'center', width: 34 },
  areaBatang: { height: TINGGI_MAKS + 2, justifyContent: 'flex-end' },
  batang: { width: 22, borderRadius: 8 },
  labelBatang: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  catatanKecil: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 10 },
  ramai: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.brown, marginTop: 6 },

  barisProduk: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankTeks: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.brown },
  namaProduk: { flex: 1, fontFamily: FONTS.headingSemi, fontSize: 14, color: COLORS.textDark },
  porsi: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textMuted },
  biasanya: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },

  barisChip: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.sand,
  },
  chipAktif: { backgroundColor: COLORS.brown },
  chipTeks: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.brown },
  chipTeksAktif: { color: '#FFFFFF' },

  latar: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  lembar: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
  },
  judulLembar: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.textDark, marginBottom: 10 },
  isiLembar: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textDark, lineHeight: 21, marginBottom: 6 },
  garis: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  teknisJudul: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  teknis: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  tombolTutup: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: COLORS.brown,
    borderRadius: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  tombolTutupTeks: { fontFamily: FONTS.heading, fontSize: 14, color: '#FFFFFF' },
});