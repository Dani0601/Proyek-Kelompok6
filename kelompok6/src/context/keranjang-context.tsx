import { createContext, useContext, useState, type ReactNode } from 'react';

import { useBahan } from '@/context/bahan-context';
import { useProduk, type Produk, type Varian } from '@/context/produk-context';

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

type KeranjangValue = {
  baris: Baris[];
  jumlahItem: number;
  total: number;
  qtyProduk: (produkId: string) => number;
  ubahQty: (produkId: string, varian: Varian, delta: number) => HasilUbah;
  bisaTambah: (produkId: string, varian: Varian) => boolean;
  cekStok: () => string[];
  kurangiStok: () => void;
  kosongkan: () => void;
};

const UKURAN: Record<Varian, string | null> = { single: null, S: 'Small', L: 'Large' };

const KeranjangContext = createContext<KeranjangValue | null>(null);

export function KeranjangProvider({ children }: { children: ReactNode }) {
  const { produkList } = useProduk();
  const { bahanList, updateBahan } = useBahan();
  const [lines, setLines] = useState<Line[]>([]);

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

  // kurangi stok bahan sesuai resep (otomatis terlihat di stok.tsx milik owner)
  const kurangiStok = () => {
    Object.entries(kebutuhan(lines)).forEach(([bahanId, jumlah]) => {
      const b = bahanList.find((x) => x.id === bahanId);
      if (b) updateBahan(b.id, { stok: Math.max(0, b.stok - jumlah) });
    });
  };

  const kosongkan = () => setLines([]);

  return (
    <KeranjangContext.Provider
      value={{ baris, jumlahItem, total, qtyProduk, ubahQty, bisaTambah, cekStok, kurangiStok, kosongkan }}
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