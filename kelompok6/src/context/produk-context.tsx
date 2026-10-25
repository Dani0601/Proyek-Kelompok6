import React, { createContext, useContext, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { DesignTokens } from '@/constants/design-tokens';

export type Kategori = 'Minuman' | 'Topping';
/** 'single' = produk satu harga, 'S' / 'L' = produk dengan ukuran. */
export type Varian = 'single' | 'S' | 'L';

export interface ResepItem {
  bahanId: string;
  jumlah: number;
}

export interface Produk {
  id: string;
  nama: string;
  kategori: Kategori;
  hasSizes: boolean;
  harga: Partial<Record<Varian, number>>;
  /** Resep (bahan per porsi) terpisah untuk tiap varian, karena ukuran cup berbeda. */
  resep: Partial<Record<Varian, ResepItem[]>>;
  /** Foto produk: bisa gambar dari assets (require) atau { uri } dari galeri. */
  foto?: ImageSourcePropType;
  accent: string;
}

// Foto dummy: ganti file di assets/images/menu/ dengan foto aslimu (nama file tetap sama).
const FOTO = {
  stickyCoklat: require('../../assets/images/menu/sticky-milk-coklat.png'),
  stickyTaro: require('../../assets/images/menu/sticky-milk-taro.png'),
  durian: require('../../assets/images/menu/smoothies-durian.png'),
  mangga: require('../../assets/images/menu/smoothies-mangga.png'),
  oreo: require('../../assets/images/menu/toping-oreo.png'),
};

const INITIAL_PRODUK: Produk[] = [
  {
    id: '1',
    nama: 'Sticky Milk Coklat',
    kategori: 'Minuman',
    hasSizes: true,
    harga: { S: 10000, L: 19000 },
    resep: {
      S: [
        { bahanId: '1', jumlah: 150 },
        { bahanId: '2', jumlah: 25 },
        { bahanId: '6', jumlah: 1 },
        { bahanId: '7', jumlah: 1 },
      ],
      L: [
        { bahanId: '1', jumlah: 250 },
        { bahanId: '2', jumlah: 40 },
        { bahanId: '5', jumlah: 1 },
        { bahanId: '7', jumlah: 1 },
      ],
    },
    foto: FOTO.stickyCoklat,
    accent: DesignTokens.color.accent,
  },
  {
    id: '2',
    nama: 'Sticky Milk Taro',
    kategori: 'Minuman',
    hasSizes: true,
    harga: { S: 9000, L: 17000 },
    resep: {
      S: [
        { bahanId: '1', jumlah: 150 },
        { bahanId: '3', jumlah: 25 },
        { bahanId: '6', jumlah: 1 },
        { bahanId: '7', jumlah: 1 },
      ],
      L: [
        { bahanId: '1', jumlah: 250 },
        { bahanId: '3', jumlah: 40 },
        { bahanId: '5', jumlah: 1 },
        { bahanId: '7', jumlah: 1 },
      ],
    },
    foto: FOTO.stickyTaro,
    accent: DesignTokens.color.accent,
  },
  { id: '3', nama: 'Smoothies Durian', kategori: 'Minuman', hasSizes: false, harga: { single: 26000 }, resep: { single: [] }, foto: FOTO.durian, accent: DesignTokens.color.mango },
  { id: '4', nama: 'Smoothies Mangga', kategori: 'Minuman', hasSizes: false, harga: { single: 21000 }, resep: { single: [] }, foto: FOTO.mangga, accent: DesignTokens.color.accent },
  { id: '5', nama: 'Topping Oreo', kategori: 'Topping', hasSizes: false, harga: { single: 3000 }, resep: { single: [] }, foto: FOTO.oreo, accent: DesignTokens.color.accent },
];

interface ProdukContextType {
  produkList: Produk[];
  getProduk: (id: string) => Produk | undefined;
  tambahProduk: (produk: Omit<Produk, 'id' | 'accent'>) => void;
  updateProduk: (id: string, produk: Partial<Omit<Produk, 'id'>>) => void;
  hapusProduk: (id: string) => void;
}

const ProdukContext = createContext<ProdukContextType | undefined>(undefined);

export function ProdukProvider({ children }: { children: React.ReactNode }) {
  const [produkList, setProdukList] = useState<Produk[]>(INITIAL_PRODUK);

  const getProduk = (id: string) => produkList.find((p) => p.id === id);

  const tambahProduk = (produk: Omit<Produk, 'id' | 'accent'>) => {
    // id berbasis waktu supaya tidak bentrok setelah ada produk yang dihapus
    const id = Date.now().toString();
    setProdukList((prev) => [...prev, { ...produk, id, accent: DesignTokens.color.accent }]);
  };

  const updateProduk = (id: string, updated: Partial<Omit<Produk, 'id'>>) => {
    setProdukList((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  };

  const hapusProduk = (id: string) => {
    setProdukList((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <ProdukContext.Provider value={{ produkList, getProduk, tambahProduk, updateProduk, hapusProduk }}>
      {children}
    </ProdukContext.Provider>
  );
}

export function useProduk() {
  const context = useContext(ProdukContext);
  if (!context) {
    throw new Error('useProduk must be used within a ProdukProvider');
  }
  return context;
}

// ---------- Helper bersama ----------
export const formatRupiah = (n: number | undefined) =>
  'Rp ' + String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const priceLabel = (p: Produk) =>
  p.hasSizes
    ? `S ${formatRupiah(p.harga.S)} · L ${formatRupiah(p.harga.L)}`
    : formatRupiah(p.harga.single);
