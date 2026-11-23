/**
 * forecast-data.ts (Alfiah)
 *
 * Mengubah transaksi (Supabase) menjadi deret "porsi terjual per hari" untuk tiap varian produk.
 * Deret inilah yang dimakan model TFLite (milik Dimas) atau perhitungan rata-rata 7 hari (fallback).
 *
 * Yang dipakai ulang dari kode yang sudah ada:
 *  - keTanggal (dashboard-data.ts): tanggal lokal "YYYY-MM-DD", sama dengan Riwayat dan Laporan.
 *  - bentuk data DetailTransaksi / ItemDetail (utils/detail-transaksi.ts).
 *
 * File ini tidak memanggil Supabase dan tidak menulis apa pun ke basis data.
 */
import { keTanggal } from '@/lib/dashboard-data';
import type { DetailTransaksi } from '@/utils/detail-transaksi';

/**
 * Saklar demo. Bila true, semua data dibaca dari assets/ai/data_contoh.json (data SIMULASI),
 * bukan dari transaksi. Tidak ada yang ditulis ke basis data. Nilai bawaan: false.
 * Diketik `boolean` (bukan literal `false`) agar TypeScript tidak menganggap cabang true tak terjangkau.
 */
export const MODE_DATA_CONTOH: boolean = true;

/** Panjang window yang dimakan model (harus sama dengan metrik.window = 14). */
export const WINDOW_MODEL = 14;
/** Panjang rata-rata untuk fallback dan pembanding (MA7). */
export const WINDOW_RATA = 7;

const BATAS_HARI = 366;

/** Kontrak 4.2: porsi per hari, tanggal menaik (paling lama ke paling baru). */
export type SeriVarian = { nama: string; harga: number; seri: number[] };

// ---------------------------------------------------------------------------
// Struktur dalam: rekap per tanggal. Dibuat sekali per larik transaksi, lalu dipakai ulang.
// ---------------------------------------------------------------------------

type HariRekap = { omzet: number; porsi: Map<string, number> };
type Rekap = { perHari: Map<string, HariRekap>; harga: Map<string, number> };

type DataContoh = {
  keterangan: string;
  satuan: string;
  produk: { nama: string; harga: number; data: { tanggal: string; qty: number }[] }[];
};

const rekapKosong = (): Rekap => ({ perHari: new Map(), harga: new Map() });

const angka = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * "YYYY-MM-DD" -> Date LOKAL jam 12:00. (new Date('2026-11-20') dibaca UTC dan bisa bergeser sehari;
 * jam 12 menghindari masalah di sekitar tengah malam.) Null bila format atau tanggalnya tidak valid.
 */
export function ubahTanggal(tgl: string): Date | null {
  const m = POLA_TANGGAL.exec(tgl);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return keTanggal(d) === tgl ? d : null;
}

/** Geser tanggal sebanyak n hari (negatif = ke belakang) tanpa mengubah objek aslinya. */
export function geserHari(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

// ---------------------------------------------------------------------------
// Mode data contoh
// ---------------------------------------------------------------------------

// Khusus pengujian: memaksa mode dan/atau mengganti isi data contoh tanpa mengubah konstanta.
let modeUji: boolean | null = null;
let dataUjiAktif = false;
let dataUji: unknown = null;

/** Hanya untuk pengujian (jangan dipanggil dari aplikasi). `mode: null` mengembalikan ke MODE_DATA_CONTOH. */
export function aturUntukUji(opsi: { mode?: boolean | null; dataContoh?: unknown; reset?: boolean }) {
  if (opsi.reset) {
    modeUji = null;
    dataUjiAktif = false;
    dataUji = null;
    cacheContoh = undefined;
    return;
  }
  if ('mode' in opsi) modeUji = opsi.mode ?? null;
  if ('dataContoh' in opsi) {
    dataUjiAktif = true;
    dataUji = opsi.dataContoh;
    cacheContoh = undefined;
  }
}

export const modeContohAktif = (): boolean => modeUji ?? MODE_DATA_CONTOH;

let cacheContoh: { rekap: Rekap; tanggalAkhir: string | null } | null | undefined;

/** Memeriksa bentuk data_contoh.json; baris yang rusak dibuang, bukan membuat aplikasi crash. */
function bangunDariContoh(mentah: unknown): { rekap: Rekap; tanggalAkhir: string | null } | null {
  const data = mentah as Partial<DataContoh> | null;
  if (!data || !Array.isArray(data.produk)) return null;

  const rekap = rekapKosong();
  let tanggalAkhir: string | null = null;

  for (const p of data.produk) {
    const nama = typeof p?.nama === 'string' ? p.nama.trim() : '';
    const harga = Number(p?.harga);
    if (!nama || !Array.isArray(p?.data)) continue;
    if (Number.isFinite(harga) && harga > 0) rekap.harga.set(nama, harga);

    for (const baris of p.data) {
      const tgl = typeof baris?.tanggal === 'string' ? baris.tanggal : '';
      const qty = Number(baris?.qty);
      if (!ubahTanggal(tgl) || !Number.isFinite(qty) || qty <= 0) continue; // hari tanpa penjualan tidak dicatat
      const hari = rekap.perHari.get(tgl) ?? { omzet: 0, porsi: new Map<string, number>() };
      hari.porsi.set(nama, (hari.porsi.get(nama) ?? 0) + qty);
      hari.omzet += qty * (rekap.harga.get(nama) ?? 0);
      rekap.perHari.set(tgl, hari);
      if (tanggalAkhir === null || tgl > tanggalAkhir) tanggalAkhir = tgl;
    }
  }
  return { rekap, tanggalAkhir };
}

function ambilContoh() {
  if (cacheContoh !== undefined) return cacheContoh;
  let mentah: unknown = null;
  try {
    // File milik Dani (assets/ai/data_contoh.json). Alias '@/assets/...' sama seperti require gambar di proyek ini.
    // Catatan: Metro memeriksa require ini saat bundling, jadi file harus ada di assets/ai/ sebelum build.
    mentah = dataUjiAktif ? dataUji : require('@/assets/ai/data_contoh.json');
  } catch (e) {
    console.warn('[forecast] data_contoh.json tidak bisa dibaca', e);
  }
  cacheContoh = bangunDariContoh(mentah);
  return cacheContoh;
}

/**
 * Tanggal "hari ini" untuk perhitungan. Bila `acuan` valid dipakai apa adanya. Bila tidak ada:
 * mode biasa = sekarang; mode data contoh = tanggal terakhir di data contoh (supaya window tidak berisi
 * hari nol palsu, sebab data contoh berhenti di tanggal tertentu).
 */
export function tentukanAcuan(acuan?: Date): Date {
  if (acuan instanceof Date && !Number.isNaN(acuan.getTime())) return new Date(acuan.getTime());
  if (modeContohAktif()) {
    const akhir = ambilContoh()?.tanggalAkhir;
    const d = akhir ? ubahTanggal(akhir) : null;
    if (d) return d;
  }
  return new Date();
}

// ---------------------------------------------------------------------------
// Rekap dari transaksi nyata
// ---------------------------------------------------------------------------

const cacheRekap = new WeakMap<object, { panjang: number; rekap: Rekap }>();

function bangunDariTransaksi(transaksi: DetailTransaksi[]): Rekap {
  const rekap = rekapKosong();
  const waktuHarga = new Map<string, number>(); // kapan harga tiap varian terakhir terlihat

  for (const t of transaksi) {
    const ms = new Date(t?.waktu).getTime();
    if (Number.isNaN(ms)) continue; // waktu rusak: transaksi diabaikan
    const tgl = keTanggal(new Date(ms));
    const hari = rekap.perHari.get(tgl) ?? { omzet: 0, porsi: new Map<string, number>() };
    hari.omzet += angka(t.total);
    rekap.perHari.set(tgl, hari); // tanggal dihitung "hari data" meski daftar item kosong

    for (const it of Array.isArray(t.items) ? t.items : []) {
      const nama = typeof it?.nama === 'string' ? it.nama.trim() : '';
      const qty = Number(it?.qty);
      if (!nama || !Number.isFinite(qty) || qty <= 0) continue;
      hari.porsi.set(nama, (hari.porsi.get(nama) ?? 0) + qty);

      // Harga varian = harga pada transaksi terbaru yang memuat varian itu.
      const harga = Number(it.harga);
      if (Number.isFinite(harga) && harga > 0 && ms >= (waktuHarga.get(nama) ?? -Infinity)) {
        rekap.harga.set(nama, harga);
        waktuHarga.set(nama, ms);
      }
    }
  }
  return rekap;
}

function ambilRekap(transaksi: DetailTransaksi[]): Rekap {
  if (modeContohAktif()) return ambilContoh()?.rekap ?? rekapKosong();
  if (!Array.isArray(transaksi)) return rekapKosong(); // mis. Supabase gagal dan pemanggil mengirim null
  const ada = cacheRekap.get(transaksi);
  if (ada && ada.panjang === transaksi.length) return ada.rekap;
  const rekap = bangunDariTransaksi(transaksi);
  cacheRekap.set(transaksi, { panjang: transaksi.length, rekap });
  return rekap;
}

// ---------------------------------------------------------------------------
// Fungsi kontrak 4.2
// ---------------------------------------------------------------------------

/**
 * Deret porsi terjual per varian untuk `hari` hari terakhir yang berakhir di `acuan` (ikut dihitung).
 *  - Urutan tanggal menaik; hari tanpa penjualan = 0.
 *  - Varian dibedakan oleh nama persis di transaksi, jadi "Sticky Milk Coklat (S)" dan "(L)" terpisah.
 *  - Hanya varian yang terjual minimal sekali dalam window yang dikembalikan, diurutkan menurut nama.
 *  - harga = harga item pada transaksi terbaru untuk varian itu (lihat catatan di laporan Tahap 1).
 */
export function ambilSeriPerVarian(transaksi: DetailTransaksi[], hari: number, acuan?: Date): SeriVarian[] {
  const n = Math.min(Math.floor(hari), BATAS_HARI);
  if (!Number.isFinite(n) || n < 1) return [];

  const rekap = ambilRekap(transaksi);
  const akhir = tentukanAcuan(acuan);
  const tanggal: string[] = [];
  for (let i = n - 1; i >= 0; i--) tanggal.push(keTanggal(geserHari(akhir, -i))); // lama -> baru

  const nama = new Set<string>();
  for (const tgl of tanggal) for (const k of rekap.perHari.get(tgl)?.porsi.keys() ?? []) nama.add(k);

  return [...nama]
    .sort((a, b) => a.localeCompare(b, 'id'))
    .map((k) => ({
      nama: k,
      harga: rekap.harga.get(k) ?? 0,
      seri: tanggal.map((tgl) => rekap.perHari.get(tgl)?.porsi.get(k) ?? 0),
    }));
}

/**
 * Jumlah TANGGAL berbeda yang punya transaksi (seluruh toko). Bukan jumlah nota:
 * 30 nota pada satu hari = 1 hari data.
 */
export function hitungHariData(transaksi: DetailTransaksi[]): number {
  return ambilRekap(transaksi).perHari.size;
}

/** Sama seperti hitungHariData, tetapi hanya tanggal sampai `acuan` (dipakai backtest agar tidak "mengintip" masa depan). */
export function hitungHariDataSampai(transaksi: DetailTransaksi[], acuan?: Date): number {
  const rekap = ambilRekap(transaksi);
  if (!(acuan instanceof Date) || Number.isNaN(acuan.getTime())) return rekap.perHari.size;
  const batas = keTanggal(acuan);
  let jumlah = 0;
  for (const tgl of rekap.perHari.keys()) if (tgl <= batas) jumlah++;
  return jumlah;
}

// ---------------------------------------------------------------------------
// Pembantu (dipakai forecast-service dan forecast-evaluasi)
// ---------------------------------------------------------------------------

/** Fallback sederhana: rata-rata porsi pada (maksimal) 7 hari terakhir deret. Deret kosong = 0. */
export function rata7(deret: number[]): number {
  const ekor = deret.slice(-WINDOW_RATA);
  if (ekor.length === 0) return 0;
  return ekor.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0) / ekor.length;
}

/** Omzet kenyataan satu tanggal ("YYYY-MM-DD") = jumlah `total` semua transaksi hari itu. */
export function omzetPadaTanggal(transaksi: DetailTransaksi[], tanggal: string): number {
  return ambilRekap(transaksi).perHari.get(tanggal)?.omzet ?? 0;
}

/** Omzet per tanggal untuk semua tanggal yang punya transaksi, urut menaik. */
export function daftarOmzetHarian(transaksi: DetailTransaksi[]): { tanggal: string; omzet: number }[] {
  return [...ambilRekap(transaksi).perHari.entries()]
    .map(([tanggal, h]) => ({ tanggal, omzet: h.omzet }))
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0));
}