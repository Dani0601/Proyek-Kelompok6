import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

import { useBahan } from '@/context/bahan-context';
import { useProduk, type Produk, type Varian } from '@/context/produk-context';
import { supabase } from '@/lib/supabase';
import type { DetailTransaksi } from '@/utils/detail-transaksi';

type Line = { key: string; produkId: string; varian: Varian; qty: number };

export type Baris = {
  key: string;
  produk: Produk;
  varian: Varian;
  qty: number;
  harga: number;
  /** "Sticky Milk Taro (S)", atau nama saja untuk produk satu harga */
  nama: string;
  /** "Small" / "Large", null untuk produk satu harga */
  ukuran: string | null;
};

export type HasilUbah = { ok: true } | { ok: false; kurang: string[] };
export type HasilStok = { ok: true } | { ok: false; pesan: string };

type KeranjangValue = {
  baris: Baris[];
  jumlahItem: number;
  total: number;
  qtyProduk: (produkId: string) => number;
  ubahQty: (produkId: string, varian: Varian, delta: number) => HasilUbah;
  bisaTambah: (produkId: string, varian: Varian) => boolean;
  /** Pengecekan cepat dengan stok yang sedang tampil di layar. */
  cekStok: () => string[];
  /** Potong stok di tabel `bahan` Supabase (dicek ulang dengan stok terbaru di server). */
  kurangiStok: () => Promise<HasilStok>;
  /** Batalkan pemotongan terakhir (dipakai kalau penyimpanan pesanan gagal). */
  kembalikanStok: () => Promise<void>;
  kosongkan: () => void;
  simpanDetail: (detail: DetailTransaksi) => void;
  cariDetail: (id: string) => DetailTransaksi | undefined;
};

const UKURAN: Record<Varian, string | null> = { single: null, S: 'Small', L: 'Large' };

const KeranjangContext = createContext<KeranjangValue | null>(null);

export function KeranjangProvider({ children }: { children: ReactNode }) {
  const { produkList } = useProduk();
  // refresh() opsional: dipakai kalau bahan-context menyediakannya
  const bahanCtx = useBahan() as ReturnType<typeof useBahan> & { refresh?: () => Promise<void> | void };
  const { bahanList } = bahanCtx;

  const [lines, setLines] = useState<Line[]>([]);
  const [detailList, setDetailList] = useState<DetailTransaksi[]>([]);
  const terakhirDipotong = useRef<Record<string, number> | null>(null);

  // total kebutuhan bahan { bahanId: jumlah } dari resep tiap produk x jumlah
  const kebutuhan = (list: Line[]) => {
    const total: Record<string, number> = {};
    for (const l of list) {
      const p = produkList.find((x) => x.id === l.produkId);
      if (!p || l.qty <= 0) continue;
      for (const r of p.resep[l.varian] ?? []) {
        total[r.bahanId] = (total[r.bahanId] ?? 0) + r.jumlah * l.qty;
      }
    }
    return total;
  };

  // nama bahan yang stoknya tidak cukup (bahan yang tidak ditemukan diabaikan)
  const bahanKurang = (list: Line[]) =>
    Object.entries(kebutuhan(list)).flatMap(([bahanId, jumlah]) => {
      const b = bahanList.find((x) => x.id === bahanId);
      return b && b.stok < jumlah ? [b.nama] : [];
    });

  // hasil daftar baris kalau qty produk+varian diubah sebesar delta
  const terapkan = (produkId: string, varian: Varian, delta: number): Line[] => {
    const key = `${produkId}:${varian}`;
    const ada = lines.find((l) => l.key === key);
    const qty = Math.max(0, (ada?.qty ?? 0) + delta);
    return ada
      ? lines.map((l) => (l.key === key ? { ...l, qty } : l))
      : [...lines, { key, produkId, varian, qty }];
  };

  const baris: Baris[] = lines.flatMap((l) => {
    const produk = produkList.find((p) => p.id === l.produkId);
    const harga = produk?.harga[l.varian];
    if (!produk || harga === undefined) return [];
    return [
      {
        key: l.key,
        produk,
        varian: l.varian,
        qty: l.qty,
        harga,
        nama: l.varian === 'single' ? produk.nama : `${produk.nama} (${l.varian})`,
        ukuran: UKURAN[l.varian],
      },
    ];
  });

  const jumlahItem = baris.reduce((s, b) => s + b.qty, 0);
  const total = baris.reduce((s, b) => s + b.harga * b.qty, 0);

  const qtyProduk = (produkId: string) =>
    baris.filter((b) => b.produk.id === produkId).reduce((s, b) => s + b.qty, 0);

  const ubahQty = (produkId: string, varian: Varian, delta: number): HasilUbah => {
    const next = terapkan(produkId, varian, delta);
    if (delta > 0) {
      const kurang = bahanKurang(next);
      if (kurang.length > 0) return { ok: false, kurang };
    }
    setLines(next);
    return { ok: true };
  };

  const bisaTambah = (produkId: string, varian: Varian) =>
    bahanKurang(terapkan(produkId, varian, 1)).length === 0;

  const cekStok = () => bahanKurang(lines);

  /**
   * Ubah stok di tabel `bahan`. delta negatif = potong, positif = kembalikan.
   * Stok dibaca ulang dari server, lalu ditulis dengan syarat nilainya belum berubah
   * (compare-and-set), supaya dua kasir yang bayar bersamaan tidak saling menimpa.
   */
  const terapkanStokDB = async (delta: Record<string, number>): Promise<HasilStok> => {
    const ids = Object.keys(delta);
    if (ids.length === 0) return { ok: true };

    const { data, error } = await supabase.from('bahan').select('id, nama, stok').in('id', ids);
    if (error || !data) {
      return { ok: false, pesan: 'Gagal membaca stok dari server. Periksa koneksi internet.' };
    }

    const kurang = data
      .filter((b) => Number(b.stok) + delta[b.id] < 0)
      .map((b) => b.nama as string);
    if (kurang.length > 0) {
      return { ok: false, pesan: `Stok ${kurang.join(', ')} tidak cukup untuk pesanan ini.` };
    }

    const sudah: { id: string; stokLama: number }[] = [];
    for (const b of data) {
      const stokLama = Number(b.stok);
      const { data: upd, error: err } = await supabase
        .from('bahan')
        .update({ stok: stokLama + delta[b.id] })
        .eq('id', b.id)
        .eq('stok', stokLama)
        .select('id');

      if (err || !upd || upd.length === 0) {
        // batalkan bahan yang sudah sempat diubah
        for (const r of sudah) await supabase.from('bahan').update({ stok: r.stokLama }).eq('id', r.id);
        return { ok: false, pesan: 'Stok berubah saat diproses. Silakan coba lagi.' };
      }
      sudah.push({ id: b.id, stokLama });
    }

    await bahanCtx.refresh?.();
    return { ok: true };
  };

  const kurangiStok = async (): Promise<HasilStok> => {
    const delta: Record<string, number> = {};
    for (const [id, jumlah] of Object.entries(kebutuhan(lines))) delta[id] = -jumlah;

    const hasil = await terapkanStokDB(delta);
    if (hasil.ok) terakhirDipotong.current = delta;
    return hasil;
  };

  const kembalikanStok = async () => {
    const delta = terakhirDipotong.current;
    terakhirDipotong.current = null;
    if (!delta) return;
    const balik: Record<string, number> = {};
    for (const [id, v] of Object.entries(delta)) balik[id] = -v;
    await terapkanStokDB(balik);
  };

  const kosongkan = () => setLines([]);

  const simpanDetail = (detail: DetailTransaksi) =>
    setDetailList((prev) => [detail, ...prev.filter((d) => d.id !== detail.id)]);

  const cariDetail = (id: string) => detailList.find((d) => d.id === id);

  return (
    <KeranjangContext.Provider
      value={{
        baris,
        jumlahItem,
        total,
        qtyProduk,
        ubahQty,
        bisaTambah,
        cekStok,
        kurangiStok,
        kembalikanStok,
        kosongkan,
        simpanDetail,
        cariDetail,
      }}
    >
      {children}
    </KeranjangContext.Provider>
  );
}

export const useKeranjang = () => {
  const ctx = useContext(KeranjangContext);
  if (!ctx) throw new Error('useKeranjang harus dipakai di dalam <KeranjangProvider>');
  return ctx;
};