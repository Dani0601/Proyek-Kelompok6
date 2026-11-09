import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { ambilTransaksi } from '@/lib/transaksi-api';
import type { DetailTransaksi } from '@/utils/detail-transaksi';

const pad = (n: number) => String(n).padStart(2, '0');

/** Tanggal lokal "YYYY-MM-DD" (sama dengan yang dipakai Riwayat dan Laporan). */
export const keTanggal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const jumlahPenjualan = (list: DetailTransaksi[]) => list.reduce((s, t) => s + t.total, 0);

export const transaksiPadaTanggal = (list: DetailTransaksi[], tanggal: Date) => {
  const k = keTanggal(tanggal);
  return list.filter((t) => keTanggal(new Date(t.waktu)) === k);
};

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export type PenjualanHarian = { tanggal: string; label: string; total: number };

/** Total penjualan per hari untuk N hari terakhir; urutan dari yang terlama sampai hari ini. */
export const penjualanHarian = (
  list: DetailTransaksi[],
  jumlahHari = 7,
  acuan = new Date()
): PenjualanHarian[] => {
  const hasil: PenjualanHarian[] = [];
  for (let i = jumlahHari - 1; i >= 0; i--) {
    const d = new Date(acuan);
    d.setDate(d.getDate() - i);
    hasil.push({
      tanggal: keTanggal(d),
      label: HARI[d.getDay()],
      total: jumlahPenjualan(transaksiPadaTanggal(list, d)),
    });
  }
  return hasil;
};

export type ProdukTerlaris = { nama: string; terjual: number };

// "Sticky Milk Coklat (L)" dan "(S)" dihitung sebagai satu produk
const tanpaUkuran = (nama: string) => nama.replace(/\s\((S|L)\)$/, '');

/** Produk dengan jumlah terjual terbanyak dalam N hari terakhir (S dan L digabung). */
export const produkTerlaris = (
  list: DetailTransaksi[],
  { hari = 7, batas = 5, acuan = new Date() } = {}
): ProdukTerlaris[] => {
  const mulai = new Date(acuan);
  mulai.setHours(0, 0, 0, 0);
  mulai.setDate(mulai.getDate() - (hari - 1));

  const hitung = new Map<string, number>();
  for (const t of list) {
    if (new Date(t.waktu) < mulai) continue;
    for (const it of t.items) {
      const nama = tanpaUkuran(it.nama);
      hitung.set(nama, (hitung.get(nama) ?? 0) + Number(it.qty));
    }
  }
  return [...hitung.entries()]
    .map(([nama, terjual]) => ({ nama, terjual }))
    .sort((a, b) => b.terjual - a.terjual)
    .slice(0, batas);
};

/** Teks perbandingan penjualan hari ini dengan kemarin. */
export const labelTren = (hariIni: number, kemarin: number) => {
  if (hariIni === 0 && kemarin === 0) return 'Belum ada penjualan hari ini';
  if (kemarin === 0) return 'Kemarin belum ada penjualan';
  if (hariIni === kemarin) return '= Sama dengan kemarin';
  const persen = Math.round((Math.abs(hariIni - kemarin) / kemarin) * 100);
  return `${hariIni > kemarin ? '▲' : '▼'} ${persen}% dari kemarin`;
};

/** Ambil data transaksi dari Supabase setiap layar dibuka; mendukung tarik-untuk-muat-ulang. */
export function useTransaksiDashboard() {
  const [transaksi, setTransaksi] = useState<DetailTransaksi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [gagal, setGagal] = useState(false);
  const [menyegarkan, setMenyegarkan] = useState(false);

  const terapkan = (hasil: DetailTransaksi[] | null) => {
    if (hasil === null) setGagal(true);
    else {
      setGagal(false);
      setTransaksi(hasil);
    }
    setMemuat(false);
  };

  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      (async () => {
        const hasil = await ambilTransaksi();
        if (aktif) terapkan(hasil);
      })();
      return () => {
        aktif = false;
      };
    }, [])
  );

  const segarkan = async () => {
    setMenyegarkan(true);
    terapkan(await ambilTransaksi());
    setMenyegarkan(false);
  };

  return { transaksi, memuat, gagal, menyegarkan, segarkan };
}