import type { Metode } from '@/context/order-context';

export type ItemDetail = { nama: string; qty: number; harga: number };

export type DetailTransaksi = {
  id: string; // nomor antrean, contoh "A-014"
  waktu: string; // ISO string; teks biasa (mis. dari Riwayat) juga boleh
  kasir: string;
  metode: Metode;
  items: ItemDetail[];
  subtotal: number;
  total: number;
  uangDiterima: number;
  kembalian: number;
  status: string; // "Selesai"
};

// TODO: ganti dengan nama kasir dari data login kalau sudah ada
export const KASIR_AKTIF = 'Kasir Sticky Milk';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** ISO -> "18 Okt 2026 · 10:41". Kalau bukan tanggal valid, dikembalikan apa adanya. */
export const formatTanggal = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())} ${BULAN[d.getMonth()]} ${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Membaca JSON dari parameter route; null kalau rusak atau kosong. */
export const parseDetail = (raw?: string): DetailTransaksi | null => {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d.id !== 'string' || !Array.isArray(d.items)) return null;
    return d as DetailTransaksi;
  } catch {
    return null;
  }
};