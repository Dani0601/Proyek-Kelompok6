/**
 * forecast-service.ts (Alfiah)
 *
 * Menentukan SUMBER perkiraan (model / sederhana / kurang-data), menghitung porsi per varian,
 * omzet = Σ (porsi × harga), dan kisaran omzet. Dipakai oleh Istafty (UI).
 *
 * Bergantung pada forecast-model.ts (Dimas) hanya lewat kontrak 4.2:
 *   metrik, muatModel(), prediksiModel(window14Porsi), dan (bila ada) modelLayak().
 * Semua pemanggilan model dibungkus try/catch: model gagal = jatuh ke perkiraan sederhana, bukan crash.
 */
import * as ForecastModel from './forecast-model';
import {
  WINDOW_MODEL,
  ambilSeriPerVarian,
  daftarOmzetHarian,
  geserHari,
  hitungHariData,
  hitungHariDataSampai,
  modeContohAktif,
  omzetPadaTanggal,
  rata7,
  tentukanAcuan,
  ubahTanggal,
  type SeriVarian,
} from './forecast-data';
import { keTanggal } from '@/lib/dashboard-data';
import type { DetailTransaksi } from '@/utils/detail-transaksi';

export type Sumber = 'model' | 'sederhana' | 'kurang-data';

export type PerkiraanVarian = { nama: string; harga: number; porsi: number; rata7: number };

export type HasilPerkiraan = {
  sumber: Sumber;
  omzet: number | null; // Rupiah = Σ porsi × harga
  bawah: number | null;
  atas: number | null;
  omzetRata7: number | null; // Σ rata7 × harga (pembanding / "biasanya")
  produk: PerkiraanVarian[];
  hariData: number;
  maePorsi: number | null; // hanya untuk sumber 'model'
  dataContoh: boolean; // true bila memakai data_contoh.json (mode demo)
  catatan: string;
};

/** Syarat tangga keputusan (laporan 3.3). */
const HARI_MIN_MODEL = 14;
const HARI_MIN_SEDERHANA = 7;
const HARI_MAKS_BERANTAI = 30;

const bulat = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);
const angkaTakNegatif = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// ---------------------------------------------------------------------------
// Memeriksa apakah model boleh dipakai
// ---------------------------------------------------------------------------

type StatusModel = { siap: true; mae: number } | { siap: false; alasan: 'tidak-tersedia' | 'kalah' };

/**
 * Model dipakai hanya bila: metrik terbaca dan wajar, window = 14, MAE model < MAE MA7
 * (dan modelLayak() milik Dimas, bila ada, bernilai true), serta muatModel() berhasil.
 */
async function periksaModel(): Promise<StatusModel> {
  try {
    const m = ForecastModel.metrik;
    const mae = m?.model?.MAE;
    const maeMa7 = m?.baseline_ma7?.MAE;
    if (!angkaTakNegatif(mae) || !angkaTakNegatif(maeMa7) || m.window !== WINDOW_MODEL) {
      return { siap: false, alasan: 'tidak-tersedia' };
    }

    // modelLayak() ada di 5.2 langkah 6 laporan tetapi belum di daftar kontrak 4.2: dipakai kalau tersedia.
    const fn = (ForecastModel as unknown as { modelLayak?: unknown }).modelLayak;
    const layakMenurutDimas = typeof fn === 'function' ? Boolean((fn as () => unknown)()) : true;
    if (!layakMenurutDimas || !(mae < maeMa7)) return { siap: false, alasan: 'kalah' };

    if ((await ForecastModel.muatModel()) !== true) return { siap: false, alasan: 'tidak-tersedia' };
    return { siap: true, mae };
  } catch (e) {
    console.warn('[forecast] model tidak bisa dipakai', e);
    return { siap: false, alasan: 'tidak-tersedia' };
  }
}

// ---------------------------------------------------------------------------
// Perhitungan inti
// ---------------------------------------------------------------------------

/**
 * Perkiraan `langkah` hari ke depan untuk semua varian. Hasil hari ke-n dimasukkan ke window hari ke-(n+1).
 * pakaiModel=true -> prediksiModel; false -> rata-rata 7 hari bergulir. Mengembalikan null bila model gagal
 * di tengah jalan (supaya pemanggil mengulang seluruhnya dengan fallback, tidak mencampur dua sumber).
 */
async function jalankanRantai(seri: SeriVarian[], langkah: number, pakaiModel: boolean): Promise<number[][] | null> {
  const jendela = seri.map((s) => s.seri.slice(-WINDOW_MODEL));
  const hasil: number[][] = [];
  for (let k = 0; k < langkah; k++) {
    const baris: number[] = [];
    for (const w of jendela) {
      if (pakaiModel) {
        try {
          const y = await ForecastModel.prediksiModel([...w]);
          if (!Number.isFinite(y)) return null;
          baris.push(Math.max(0, y));
        } catch (e) {
          console.warn('[forecast] prediksiModel gagal', e);
          return null;
        }
      } else {
        baris.push(rata7(w));
      }
    }
    baris.forEach((y, i) => {
      jendela[i].push(y); // hasil hari ini menjadi masukan hari berikutnya
      jendela[i].shift();
    });
    hasil.push(baris);
  }
  return hasil;
}

type Alasan = 'data' | 'tidak-tersedia' | 'kalah' | 'sepi' | null;

function susunCatatan(sumber: Sumber, hariData: number, alasan: Alasan, dataContoh: boolean, berantai: boolean): string {
  let teks: string;
  if (sumber === 'model') {
    teks = `Dihitung AI di HP ini dari ${hariData} hari data penjualan. Ini perkiraan, bukan jaminan.`;
  } else if (sumber === 'kurang-data') {
    teks = `Data belum cukup. Perlu minimal 14 hari penjualan (saat ini baru ${hariData} hari).`;
  } else if (alasan === 'tidak-tersedia') {
    teks = 'Perkiraan sederhana (rata-rata 7 hari terakhir) karena perhitungan AI belum bisa dipakai di perangkat ini.';
  } else if (alasan === 'kalah') {
    teks =
      'Perkiraan sederhana (rata-rata 7 hari terakhir) karena pada pengujian, perhitungan AI tidak lebih baik daripada rata-rata 7 hari.';
  } else if (alasan === 'sepi') {
    teks = 'Perkiraan sederhana (rata-rata 7 hari terakhir). Tidak ada penjualan dalam 14 hari terakhir, jadi perkiraannya Rp 0.';
  } else {
    teks = `Perkiraan sederhana (rata-rata 7 hari terakhir). Data baru ${hariData} hari; perkiraan AI aktif setelah ada minimal 14 hari penjualan.`;
  }
  if (berantai) teks += ' Perkiraan kasar: makin jauh harinya, makin besar ketidakpastiannya.';
  if (dataContoh) teks += ' DATA CONTOH (simulasi), bukan penjualan nyata.';
  return teks;
}

function hasilKurangData(hariData: number, dataContoh: boolean, berantai: boolean): HasilPerkiraan {
  return {
    sumber: 'kurang-data',
    omzet: null,
    bawah: null,
    atas: null,
    omzetRata7: null,
    produk: [],
    hariData,
    maePorsi: null,
    dataContoh,
    catatan: susunCatatan('kurang-data', hariData, 'data', dataContoh, berantai),
  };
}

type Dasar = { hariData: number; seri: SeriVarian[]; rata: number[]; omzetRata7: number };

function siapkanDasar(transaksi: DetailTransaksi[], acuan: Date): Dasar {
  const hariData = hitungHariDataSampai(transaksi, acuan); // hanya tanggal <= acuan
  const seri = ambilSeriPerVarian(transaksi, WINDOW_MODEL, acuan);
  const rata = seri.map((s) => rata7(s.seri));
  const omzetRata7 = bulat(seri.reduce((jml, s, i) => jml + rata[i] * s.harga, 0));
  return { hariData, seri, rata, omzetRata7 };
}

function bentukHasil(p: {
  sumber: Sumber;
  dasar: Dasar;
  porsi: number[];
  mae: number | null;
  alasan: Alasan;
  dataContoh: boolean;
  berantai: boolean;
  denganKisaran: boolean;
}): HasilPerkiraan {
  const { dasar, porsi } = p;
  const produk: PerkiraanVarian[] = dasar.seri.map((s, i) => ({
    nama: s.nama,
    harga: s.harga,
    porsi: porsi[i],
    rata7: dasar.rata[i],
  }));
  const omzetMentah = produk.reduce((jml, v) => jml + v.porsi * v.harga, 0);
  const omzet = bulat(omzetMentah);

  // Kisaran kasar: omzet ± √Σ(harga_i × MAE)², galat antarproduk dianggap saling bebas. Hanya untuk model.
  let bawah: number | null = null;
  let atas: number | null = null;
  if (p.sumber === 'model' && p.mae !== null && p.denganKisaran) {
    const lebar = Math.sqrt(produk.reduce((jml, v) => jml + (v.harga * (p.mae as number)) ** 2, 0));
    bawah = Math.max(0, bulat(omzetMentah - lebar));
    atas = bulat(omzetMentah + lebar);
  }

  return {
    sumber: p.sumber,
    omzet,
    bawah,
    atas,
    omzetRata7: dasar.omzetRata7,
    produk,
    hariData: dasar.hariData,
    maePorsi: p.sumber === 'model' ? p.mae : null,
    dataContoh: p.dataContoh,
    catatan: susunCatatan(p.sumber, dasar.hariData, p.alasan, p.dataContoh, p.berantai),
  };
}

/**
 * Menjalankan tangga keputusan lalu `langkah` hari ke depan. hitungPerkiraan = langkah 1.
 */
async function hitungBerlapis(
  transaksi: DetailTransaksi[],
  langkah: number,
  acuan: Date | undefined,
  berantai: boolean
): Promise<HasilPerkiraan[]> {
  const dataContoh = modeContohAktif();
  const tgl = tentukanAcuan(acuan);
  const dasar = siapkanDasar(transaksi, tgl);

  // < 7 hari data: semua nilai null.
  if (dasar.hariData < HARI_MIN_SEDERHANA) {
    return Array.from({ length: langkah }, () => hasilKurangData(dasar.hariData, dataContoh, berantai));
  }

  let sumber: Sumber = 'sederhana';
  let alasan: Alasan = 'data';
  let mae: number | null = null;
  let rantai: number[][] | null = null;

  if (dasar.seri.length === 0) {
    alasan = 'sepi'; // ada riwayat, tetapi tidak ada penjualan dalam window
  } else if (dasar.hariData >= HARI_MIN_MODEL) {
    const status = await periksaModel();
    if (status.siap) {
      rantai = await jalankanRantai(dasar.seri, langkah, true);
      if (rantai) {
        sumber = 'model';
        alasan = null;
        mae = status.mae;
      } else {
        alasan = 'tidak-tersedia'; // model gagal saat dipanggil
      }
    } else {
      alasan = status.alasan;
    }
  }

  if (!rantai) rantai = (await jalankanRantai(dasar.seri, langkah, false)) ?? [];

  // Kisaran berbasis MAE hanya sah untuk perkiraan 1 hari ke depan (MAE diukur per 1 hari).
  return rantai.map((porsi, k) =>
    bentukHasil({ sumber, dasar, porsi, mae, alasan, dataContoh, berantai, denganKisaran: k === 0 })
  );
}

// ---------------------------------------------------------------------------
// Fungsi kontrak 4.2
// ---------------------------------------------------------------------------

/**
 * Perkiraan omzet hari setelah `acuan` (bawaan: hari ini -> "besok").
 *
 * Tangga keputusan (hariData = jumlah tanggal berbeda yang punya transaksi, sampai acuan):
 *   < 7 hari                                       -> 'kurang-data' (semua angka null)
 *   7-13 hari                                      -> 'sederhana'   (rata-rata 7 hari per varian)
 *   >= 14 hari, model siap dan MAE model < MA7     -> 'model'
 *   >= 14 hari, model gagal dimuat/dipanggil, atau MAE model >= MA7 -> 'sederhana'
 * Fungsi ini tidak melempar galat karena model; data kosong juga aman.
 */
export async function hitungPerkiraan(transaksi: DetailTransaksi[], acuan?: Date): Promise<HasilPerkiraan> {
  const [hasil] = await hitungBerlapis(transaksi, 1, acuan, false);
  return hasil;
}

/**
 * Perkiraan `hari` hari ke depan (1..30). Hasil hari ke-n ditambahkan ke window untuk hari ke-(n+1).
 *
 * PERINGATAN: galat menumpuk. Hari ke-2 dihitung dari tebakan hari ke-1, dan seterusnya, jadi makin jauh
 * makin tidak pasti. Karena MAE di metrics.json hanya diukur untuk 1 hari ke depan, kisaran (bawah/atas)
 * hanya diisi untuk hari pertama; hari berikutnya null dan catatan menyebutnya "perkiraan kasar".
 * Sumber (model/sederhana) ditentukan sekali dan sama untuk seluruh hari.
 */
export async function perkiraanBerantai(
  transaksi: DetailTransaksi[],
  hari: number,
  acuan?: Date
): Promise<HasilPerkiraan[]> {
  const n = Math.min(Math.floor(hari), HARI_MAKS_BERANTAI);
  if (!Number.isFinite(n) || n < 1) return [];
  return hitungBerlapis(transaksi, n, acuan, true);
}

// ---------------------------------------------------------------------------
// Ringkasan aturan biasa (BUKAN AI)
// ---------------------------------------------------------------------------

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const URUTAN_SENIN = [1, 2, 3, 4, 5, 6, 0];
const HARI_MIN_RAMAI = 28;

export type HariRamai = {
  hari: string; // mis. "Sabtu"
  rataOmzet: number;
  perHari: { hari: string; rataOmzet: number | null }[]; // Senin..Minggu; null bila belum ada datanya
};

/**
 * Hari dalam seminggu dengan rata-rata omzet tertinggi. Aturan biasa (bukan AI).
 * Hanya tanggal yang punya transaksi yang dirata-ratakan. Null bila data < 28 hari (bagian itu disembunyikan).
 */
export function hariPalingRamai(transaksi: DetailTransaksi[]): HariRamai | null {
  if (hitungHariData(transaksi) < HARI_MIN_RAMAI) return null;

  const jumlah = new Array<number>(7).fill(0);
  const total = new Array<number>(7).fill(0);
  for (const { tanggal, omzet } of daftarOmzetHarian(transaksi)) {
    const d = ubahTanggal(tanggal);
    if (!d) continue;
    jumlah[d.getDay()] += 1;
    total[d.getDay()] += omzet;
  }

  const perHari = URUTAN_SENIN.map((w) => ({
    hari: NAMA_HARI[w],
    rataOmzet: jumlah[w] > 0 ? bulat(total[w] / jumlah[w]) : null,
  }));
  let terbaik: { hari: string; rataOmzet: number } | null = null;
  for (const p of perHari) {
    if (p.rataOmzet !== null && (terbaik === null || p.rataOmzet > terbaik.rataOmzet)) {
      terbaik = { hari: p.hari, rataOmzet: p.rataOmzet };
    }
  }
  return terbaik ? { ...terbaik, perHari } : null;
}

export type TrenMinggu = {
  omzet7: number; // 7 hari terakhir (sampai acuan)
  omzetSebelumnya: number; // 7 hari sebelumnya
  selisih: number;
  persen: number | null; // null bila minggu sebelumnya Rp 0
  arah: 'naik' | 'turun' | 'sama';
};

/** Omzet 7 hari terakhir dibanding 7 hari sebelumnya. Aturan biasa (bukan AI). Hari ini (belum selesai) ikut dihitung. */
export function trenMingguIni(transaksi: DetailTransaksi[], acuan?: Date): TrenMinggu {
  const akhir = tentukanAcuan(acuan);
  const jumlah = (dari: number, sampai: number) => {
    let s = 0;
    for (let i = dari; i <= sampai; i++) s += omzetPadaTanggal(transaksi, keTanggal(geserHari(akhir, -i)));
    return s;
  };
  const omzet7 = bulat(jumlah(0, 6));
  const omzetSebelumnya = bulat(jumlah(7, 13));
  const selisih = omzet7 - omzetSebelumnya;
  return {
    omzet7,
    omzetSebelumnya,
    selisih,
    persen: omzetSebelumnya > 0 ? Math.round((Math.abs(selisih) / omzetSebelumnya) * 100) : null,
    arah: selisih > 0 ? 'naik' : selisih < 0 ? 'turun' : 'sama',
  };
}