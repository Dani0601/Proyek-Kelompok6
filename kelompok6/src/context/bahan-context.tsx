import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Bahan {
  id: string;
  nama: string;
  satuan: 'ml' | 'gram' | 'pcs';
  stok: number;
  minimum: number;
}

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

type BahanRow = {
  id: string;
  nama: string;
  satuan: Bahan['satuan'];
  stok: number | string | null;
  minimum: number | string | null;
};

type StokMasukRow = {
  id: string;
  bahan_id: string;
  jumlah: number | string;
  harga: number | string;
  catatan: string | null;
  tanggal: string;
};

const keBahan = (r: BahanRow): Bahan => ({
  id: String(r.id),
  nama: r.nama,
  satuan: r.satuan,
  stok: Number(r.stok ?? 0),
  minimum: Number(r.minimum ?? 0),
});

const keStokMasuk = (m: StokMasukRow): StokMasuk => ({
  id: m.id,
  bahanId: m.bahan_id,
  jumlah: Number(m.jumlah),
  harga: Number(m.harga),
  catatan: m.catatan ?? '',
  tanggal: m.tanggal,
});

/** Ubah error Supabase menjadi pesan yang mudah dibaca pengguna. */
const pesanError = (e: { message?: string } | null | undefined, cadangan: string) => {
  const pesan = e?.message ?? '';
  if (pesan.includes('Could not find the function')) {
    return `${cadangan} Fungsi database belum dibuat: jalankan skrip SQL stok di Supabase.`;
  }
  return pesan ? `${cadangan} (${pesan})` : cadangan;
};

interface BahanContextType {
  bahanList: Bahan[];
  riwayatStokMasuk: StokMasuk[];
  memuat: boolean;
  /** Pesan error terakhir saat memuat data dari Supabase (null jika baik-baik saja). */
  galat: string | null;
  refreshBahan: () => Promise<void>;
  tambahBahan: (bahan: Omit<Bahan, 'id'>) => Promise<void>;
  updateBahan: (id: string, bahan: Partial<Bahan>) => Promise<void>;
  hapusBahan: (id: string) => Promise<void>;
  catatStokMasuk: (id: string, jumlah: number, harga: number, catatan?: string) => Promise<void>;
  updateStokMasuk: (
    id: string,
    data: { jumlah: number; harga: number; catatan?: string }
  ) => Promise<void>;
  hapusStokMasuk: (id: string) => Promise<void>;
}

const BahanContext = createContext<BahanContextType | undefined>(undefined);

export function BahanProvider({ children }: { children: React.ReactNode }) {
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [riwayatStokMasuk, setRiwayatStokMasuk] = useState<StokMasuk[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  /** Baca ulang tabel `bahan` dan `stok_masuk` dari Supabase. */
  const refreshBahan = useCallback(async () => {
    setMemuat(true);
    try {
      const [resBahan, resMasuk] = await Promise.all([
        supabase
          .from('bahan')
          .select('*')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }),
        supabase.from('stok_masuk').select('*').order('tanggal', { ascending: false }),
      ]);

      const gagal = resBahan.error ?? resMasuk.error;
      if (gagal) {
        setGalat(pesanError(gagal, 'Gagal memuat data stok dari Supabase.'));
      } else {
        setBahanList(((resBahan.data ?? []) as BahanRow[]).map(keBahan));
        setRiwayatStokMasuk(((resMasuk.data ?? []) as StokMasukRow[]).map(keStokMasuk));
        setGalat(null);
      }
    } catch (e) {
      setGalat(pesanError(e as Error, 'Tidak dapat terhubung ke Supabase.'));
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    refreshBahan();
  }, [refreshBahan]);

  // ---------- Master bahan baku (tabel `bahan`) ----------

  const tambahBahan = async (bahan: Omit<Bahan, 'id'>) => {
    const { error } = await supabase.from('bahan').insert({
      id: Date.now().toString(), // unik; tidak bentrok dengan id seed '1'..'6'
      nama: bahan.nama.trim(),
      satuan: bahan.satuan,
      stok: bahan.stok,
      minimum: bahan.minimum,
    });
    if (error) throw new Error(pesanError(error, 'Gagal menambah bahan.'));
    await refreshBahan();
  };

  const updateBahan = async (id: string, updated: Partial<Bahan>) => {
    const payload: Record<string, string | number> = {};
    if (updated.nama !== undefined) payload.nama = updated.nama.trim();
    if (updated.satuan !== undefined) payload.satuan = updated.satuan;
    if (updated.stok !== undefined) payload.stok = updated.stok;
    if (updated.minimum !== undefined) payload.minimum = updated.minimum;
    if (Object.keys(payload).length === 0) return;

    // Tampilan diperbarui lebih dulu agar terasa cepat (juga dipakai kasir saat memotong stok).
    const sebelum = bahanList.find((b) => b.id === id);
    setBahanList((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));

    // .select('id') dipakai supaya update yang diam-diam ditolak RLS (0 baris) ikut terdeteksi.
    const { data, error } = await supabase.from('bahan').update(payload).eq('id', id).select('id');
    if (error || !data || data.length === 0) {
      if (sebelum) setBahanList((prev) => prev.map((b) => (b.id === id ? sebelum : b)));
      throw new Error(pesanError(error, 'Gagal menyimpan perubahan bahan.'));
    }
  };

  const hapusBahan = async (id: string) => {
    const { data, error } = await supabase.from('bahan').delete().eq('id', id).select('id');
    if (error || !data || data.length === 0) {
      throw new Error(pesanError(error, 'Gagal menghapus bahan.'));
    }
    setBahanList((prev) => prev.filter((b) => b.id !== id));
    // Riwayat pengadaan bahan ini ikut terhapus di database (on delete cascade).
    setRiwayatStokMasuk((prev) => prev.filter((m) => m.bahanId !== id));
  };

  // ---------- Pengadaan stok masuk (tabel `stok_masuk`) ----------
  // Ditulis lewat fungsi database (RPC) supaya catatan dan perubahan stok terjadi
  // dalam SATU transaksi: tidak mungkin stok naik tanpa catatan, atau sebaliknya.

  const catatStokMasuk = async (id: string, jumlah: number, harga: number, catatan = '') => {
    const { error } = await supabase.rpc('catat_stok_masuk', {
      p_bahan_id: id,
      p_jumlah: jumlah,
      p_harga: harga,
      p_catatan: catatan.trim() || null,
    });
    if (error) throw new Error(pesanError(error, 'Gagal mencatat stok masuk.'));
    await refreshBahan();
  };

  const updateStokMasuk = async (
    id: string,
    data: { jumlah: number; harga: number; catatan?: string }
  ) => {
    const { error } = await supabase.rpc('ubah_stok_masuk', {
      p_id: id,
      p_jumlah: data.jumlah,
      p_harga: data.harga,
      p_catatan: (data.catatan ?? '').trim() || null,
    });
    if (error) throw new Error(pesanError(error, 'Gagal mengubah catatan pengadaan.'));
    await refreshBahan();
  };

  const hapusStokMasuk = async (id: string) => {
    const { error } = await supabase.rpc('hapus_stok_masuk', { p_id: id });
    if (error) throw new Error(pesanError(error, 'Gagal menghapus catatan pengadaan.'));
    await refreshBahan();
  };

  return (
    <BahanContext.Provider
      value={{
        bahanList,
        riwayatStokMasuk,
        memuat,
        galat,
        refreshBahan,
        tambahBahan,
        updateBahan,
        hapusBahan,
        catatStokMasuk,
        updateStokMasuk,
        hapusStokMasuk,
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