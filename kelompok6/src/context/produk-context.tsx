import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { DesignTokens } from '@/constants/design-tokens';

export type Kategori = 'Minuman' | 'Topping';
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
  resep: Partial<Record<Varian, ResepItem[]>>;
  foto?: ImageSourcePropType;
  accent: string;
}

type ProdukRow = {
  id: string;
  nama: string;
  kategori: Kategori;
  has_sizes: boolean;
  harga_single: number | null;
  harga_s: number | null;
  harga_l: number | null;
  foto_url: string | null;
  resep: Partial<Record<Varian, ResepItem[]>> | null;
};

const BUCKET = 'produk';

const keProduk = (row: ProdukRow): Produk => ({
  id: row.id,
  nama: row.nama,
  kategori: row.kategori,
  hasSizes: row.has_sizes,
  harga: row.has_sizes
    ? { S: Number(row.harga_s ?? 0), L: Number(row.harga_l ?? 0) }
    : { single: Number(row.harga_single ?? 0) },
  resep: (row.resep ?? {}) as Partial<Record<Varian, ResepItem[]>>,
  foto: row.foto_url ? { uri: row.foto_url } : undefined,
  accent: DesignTokens.color.accent,
});

const namaFile = (uri: string) => {
  const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
};

const uploadFoto = async (uri: string) => {
  const bytes = await new File(uri).bytes();
  const path = namaFile(uri);
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
};

const pathDariUrl = (url: string) => url.split(`/object/public/${BUCKET}/`)[1];
const uriDariFoto = (foto: ImageSourcePropType | undefined) => (foto as { uri?: string } | undefined)?.uri;

interface ProdukContextType {
  produkList: Produk[];
  memuat: boolean;
  refresh: () => Promise<void>;
  getProduk: (id: string) => Produk | undefined;
  tambahProduk: (produk: Omit<Produk, 'id' | 'accent'>) => Promise<void>;
  updateProduk: (id: string, produk: Partial<Omit<Produk, 'id'>>) => Promise<void>;
  hapusProduk: (id: string) => Promise<void>;
}

const ProdukContext = createContext<ProdukContextType | undefined>(undefined);

export function ProdukProvider({ children }: { children: React.ReactNode }) {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [memuat, setMemuat] = useState(true);

  const refresh = useCallback(async () => {
    setMemuat(true);
    const { data, error } = await supabase.from('produk').select('*').order('created_at', { ascending: true });
    if (!error && data) setProdukList((data as ProdukRow[]).map(keProduk));
    setMemuat(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getProduk = (id: string) => produkList.find((p) => p.id === id);

  const tambahProduk = async (produk: Omit<Produk, 'id' | 'accent'>) => {
    const uri = uriDariFoto(produk.foto);
    let foto_url: string | null = null;
    if (uri && !uri.startsWith('http')) foto_url = (await uploadFoto(uri)).url;
    const payload = {
      nama: produk.nama,
      kategori: produk.kategori,
      has_sizes: produk.hasSizes,
      harga_single: produk.hasSizes ? null : produk.harga.single ?? null,
      harga_s: produk.hasSizes ? produk.harga.S ?? null : null,
      harga_l: produk.hasSizes ? produk.harga.L ?? null : null,
      foto_url,
      resep: produk.resep ?? {},
    };
    const { error } = await supabase.from('produk').insert(payload);
    if (error) throw error;
    await refresh();
  };

  const updateProduk = async (id: string, updated: Partial<Omit<Produk, 'id'>>) => {
    const lama = produkList.find((p) => p.id === id);
    if (!lama) throw new Error('Produk tidak ditemukan.');
    const gabung = { ...lama, ...updated };
    const uriBaru = uriDariFoto(gabung.foto);
    const uriLama = uriDariFoto(lama.foto);
    let foto_url: string | null = uriLama?.startsWith('http') ? uriLama : null;
    let hapusLama: string | null = null;
    if (uriBaru && uriBaru !== uriLama) {
      foto_url = (await uploadFoto(uriBaru)).url;
      if (uriLama?.startsWith('http')) hapusLama = pathDariUrl(uriLama);
    } else if (!uriBaru && uriLama?.startsWith('http')) {
      hapusLama = pathDariUrl(uriLama);
      foto_url = null;
    }
    const payload = {
      nama: gabung.nama,
      kategori: gabung.kategori,
      has_sizes: gabung.hasSizes,
      harga_single: gabung.hasSizes ? null : gabung.harga.single ?? null,
      harga_s: gabung.hasSizes ? gabung.harga.S ?? null : null,
      harga_l: gabung.hasSizes ? gabung.harga.L ?? null : null,
      foto_url,
      resep: gabung.resep ?? {},
    };
    const { error } = await supabase.from('produk').update(payload).eq('id', id);
    if (error) throw error;
    if (hapusLama) await supabase.storage.from(BUCKET).remove([hapusLama]);
    await refresh();
  };

  const hapusProduk = async (id: string) => {
    const lama = produkList.find((p) => p.id === id);
    const uri = uriDariFoto(lama?.foto);
    const { error } = await supabase.from('produk').delete().eq('id', id);
    if (error) throw error;
    if (uri?.startsWith('http')) await supabase.storage.from(BUCKET).remove([pathDariUrl(uri)]);
    await refresh();
  };

  return (
    <ProdukContext.Provider value={{ produkList, memuat, refresh, getProduk, tambahProduk, updateProduk, hapusProduk }}>
      {children}
    </ProdukContext.Provider>
  );
}

export function useProduk() {
  const context = useContext(ProdukContext);
  if (!context) throw new Error('useProduk must be used within a ProdukProvider');
  return context;
}

// ---------- Helper bersama ----------
export const formatRupiah = (n: number | undefined) =>
  'Rp ' + String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const priceLabel = (p: Produk) =>
  p.hasSizes
    ? `S ${formatRupiah(p.harga.S)} · L ${formatRupiah(p.harga.L)}`
    : formatRupiah(p.harga.single);
