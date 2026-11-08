import { supabase } from '@/lib/supabase';
import { KASIR_AKTIF, type DetailTransaksi, type ItemDetail } from '@/utils/detail-transaksi';

type TransaksiRow = {
  id: string;
  antrean_id: string | null;
  total: number;
  bayar: number;
  kembali: number;
  metode: string;
  items: ItemDetail[] | null;
  created_at: string;
};

type BahanRef = { nama: string; satuan: string };
type StokMasukRow = {
  id: string;
  jumlah: number;
  harga: number;
  catatan: string | null;
  tanggal: string;
  bahan: BahanRef | BahanRef[] | null;
};

export type Pengeluaran = {
  id: string;
  nama: string;
  satuan: string;
  jumlah: number;
  harga: number;
  catatan: string;
  tanggal: string; // ISO
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Simpan nota ke tabel transaksi. Aman dipanggil dua kali (upsert). */
export async function simpanTransaksi(d: DetailTransaksi): Promise<boolean> {
  const t = new Date(d.waktu);
  const waktu = Number.isNaN(t.getTime()) ? new Date() : t;
  const id = `TRX-${waktu.getFullYear()}${pad(waktu.getMonth() + 1)}${pad(waktu.getDate())}-${d.id}`;

  const { error } = await supabase.from('transaksi').upsert({
    id,
    antrean_id: d.id,
    total: d.total,
    bayar: d.uangDiterima,
    kembali: d.kembalian,
    metode: d.metode,
    items: d.items,
    created_at: waktu.toISOString(),
  });

  if (error) {
    console.log('GAGAL SIMPAN TRANSAKSI:', error.message);
    return false;
  }
  return true;
}

/** Ambil semua transaksi, terbaru dulu. Mengembalikan null kalau gagal. */
export async function ambilTransaksi(): Promise<DetailTransaksi[] | null> {
  const { data, error } = await supabase
    .from('transaksi')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.log('GAGAL AMBIL TRANSAKSI:', error?.message);
    return null;
  }

  return (data as TransaksiRow[]).map((r) => ({
    id: r.antrean_id ?? r.id,
    waktu: r.created_at,
    kasir: KASIR_AKTIF,
    metode: r.metode as DetailTransaksi['metode'],
    items: r.items ?? [],
    subtotal: Number(r.total),
    total: Number(r.total),
    uangDiterima: Number(r.bayar),
    kembalian: Number(r.kembali),
    status: 'Selesai',
  }));
}

/** Ambil pengadaan stok (pengeluaran) beserta nama bahan. Mengembalikan null kalau gagal. */
export async function ambilStokMasuk(): Promise<Pengeluaran[] | null> {
  const { data, error } = await supabase
    .from('stok_masuk')
    .select('id, jumlah, harga, catatan, tanggal, bahan(nama, satuan)')
    .order('tanggal', { ascending: false });

  if (error || !data) {
    console.log('GAGAL AMBIL STOK MASUK:', error?.message);
    return null;
  }

  return (data as unknown as StokMasukRow[]).map((r) => {
    const b = Array.isArray(r.bahan) ? r.bahan[0] : r.bahan;
    return {
      id: r.id,
      nama: b?.nama ?? 'bahan',
      satuan: b?.satuan ?? '',
      jumlah: Number(r.jumlah),
      harga: Number(r.harga),
      catatan: r.catatan ?? '',
      tanggal: r.tanggal,
    };
  });
}