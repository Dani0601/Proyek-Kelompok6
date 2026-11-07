import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Bahan {
  id: string;
  nama: string;
  satuan: 'ml' | 'gram' | 'pcs';
  stok: number;
  minimum: number;
}

const INITIAL_BAHAN: Bahan[] = [
  { id: '1', nama: 'Susu UHT', satuan: 'ml', stok: 18500, minimum: 10000 },
  { id: '2', nama: 'Bubuk Coklat', satuan: 'gram', stok: 1200, minimum: 2000 },
  { id: '3', nama: 'Bubuk Taro', satuan: 'gram', stok: 2500, minimum: 1500 },
  { id: '4', nama: 'Keju Parut', satuan: 'gram', stok: 800, minimum: 1000 },
  { id: '5', nama: 'Cup Large 22 oz', satuan: 'pcs', stok: 150, minimum: 100 },
  { id: '6', nama: 'Cup Small 12 oz', satuan: 'pcs', stok: 80, minimum: 100 },
];

/** Satu catatan pengadaan stok (stok masuk) beserta nominal harga pembeliannya. */
export interface StokMasuk {
  id: string;
  bahanId: string;
  jumlah: number;
  /** Total harga pembelian dalam rupiah. */
  harga: number;
  catatan: string;
  /** Waktu pencatatan (ISO). */
  tanggal: string;
}

type StokMasukRow = {
  id: string;
  bahan_id: string;
  jumlah: number;
  harga: number;
  catatan: string | null;
  tanggal: string;
};

interface BahanContextType {
  bahanList: Bahan[];
  riwayatStokMasuk: StokMasuk[];
  memuat: boolean;
  refreshBahan: () => Promise<void>;
  tambahBahan: (bahan: Omit<Bahan, 'id'>) => Promise<void>;
  updateBahan: (id: string, bahan: Partial<Bahan>) => Promise<void>;
  catatStokMasuk: (id: string, jumlah: number, harga: number, catatan?: string) => Promise<void>;
}

const BahanContext = createContext<BahanContextType | undefined>(undefined);

export function BahanProvider({ children }: { children: React.ReactNode }) {
  const [bahanList, setBahanList] = useState<Bahan[]>(INITIAL_BAHAN);
  const [riwayatStokMasuk, setRiwayatStokMasuk] = useState<StokMasuk[]>([]);
  const [memuat, setMemuat] = useState(false);

  const refreshBahan = useCallback(async () => {
    try {
      setMemuat(true);
      // 1. Fetch bahan dari Supabase
      const { data: dataBahan, error: errBahan } = await supabase
        .from('bahan')
        .select('*')
        .order('id', { ascending: true });

      if (!errBahan && dataBahan && dataBahan.length > 0) {
        setBahanList(
          dataBahan.map((b: any) => ({
            id: String(b.id),
            nama: b.nama,
            satuan: b.satuan,
            stok: Number(b.stok ?? 0),
            minimum: Number(b.minimum ?? 0),
          }))
        );
      }

      // 2. Fetch stok masuk dari Supabase
      const { data: dataMasuk, error: errMasuk } = await supabase
        .from('stok_masuk')
        .select('*')
        .order('tanggal', { ascending: false });

      if (!errMasuk && dataMasuk) {
        setRiwayatStokMasuk(
          (dataMasuk as StokMasukRow[]).map((m) => ({
            id: m.id,
            bahanId: m.bahan_id,
            jumlah: Number(m.jumlah),
            harga: Number(m.harga),
            catatan: m.catatan ?? '',
            tanggal: m.tanggal,
          }))
        );
      }
    } catch (e) {
      console.log('Catatan koneksi bahan Supabase (fallback ke lokal):', e);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    refreshBahan();
  }, [refreshBahan]);

  const tambahBahan = async (bahan: Omit<Bahan, 'id'>) => {
    const newId = (bahanList.length + 1).toString();
    const itemBaru: Bahan = { ...bahan, id: newId };

    // Update state optimistik
    setBahanList((prev) => [...prev, itemBaru]);

    try {
      const { error } = await supabase.from('bahan').insert({
        id: newId,
        nama: bahan.nama,
        satuan: bahan.satuan,
        stok: bahan.stok,
        minimum: bahan.minimum,
      });
      if (!error) {
        await refreshBahan();
      }
    } catch {}
  };

  const updateBahan = async (id: string, updated: Partial<Bahan>) => {
    // Update state optimistik
    setBahanList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updated } : b))
    );

    try {
      const payload: Record<string, any> = {};
      if (updated.nama !== undefined) payload.nama = updated.nama;
      if (updated.satuan !== undefined) payload.satuan = updated.satuan;
      if (updated.stok !== undefined) payload.stok = updated.stok;
      if (updated.minimum !== undefined) payload.minimum = updated.minimum;

      await supabase.from('bahan').update(payload).eq('id', id);
    } catch {}
  };

  const catatStokMasuk = async (id: string, jumlah: number, harga: number, catatan = '') => {
    const target = bahanList.find((b) => b.id === id);
    const stokBaru = (target?.stok ?? 0) + jumlah;

    // Update state optimistik
    setBahanList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, stok: stokBaru } : b))
    );
    const masukBaru: StokMasuk = {
      id: Date.now().toString(),
      bahanId: id,
      jumlah,
      harga,
      catatan: catatan.trim(),
      tanggal: new Date().toISOString(),
    };
    setRiwayatStokMasuk((prev) => [masukBaru, ...prev]);

    try {
      // Update stok di tabel bahan
      await supabase.from('bahan').update({ stok: stokBaru }).eq('id', id);

      // Simpan catatan di tabel stok_masuk
      await supabase.from('stok_masuk').insert({
        bahan_id: id,
        jumlah,
        harga,
        catatan: catatan.trim(),
      });
    } catch {}
  };

  return (
    <BahanContext.Provider
      value={{
        bahanList,
        riwayatStokMasuk,
        memuat,
        refreshBahan,
        tambahBahan,
        updateBahan,
        catatStokMasuk,
      }}
    >
      {children}
    </BahanContext.Provider>
  );
}

export function useBahan() {
  const context = useContext(BahanContext);
  if (!context) {
    throw new Error('useBahan must be used within a BahanProvider');
  }
  return context;
}
