import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/context/auth-context';

/** Satu akun di tabel `pengguna` (kasir maupun owner). */
export interface Kasir {
  id: string;
  email: string;
  nama: string;
  role: Role;
  aktif: boolean;
}

type PenggunaRow = {
  id: string;
  email: string;
  nama: string | null;
  role: Role;
  aktif: boolean;
};

const keKasir = (r: PenggunaRow): Kasir => ({
  id: r.id,
  email: r.email,
  nama: r.nama ?? '',
  role: r.role,
  aktif: r.aktif,
});

type GalatDb = { message?: string; code?: string } | null | undefined;

/** Ubah error Supabase menjadi pesan yang mudah dibaca pengguna. */
const pesanError = (e: GalatDb, cadangan: string) => {
  if (!e) return cadangan;
  // pelanggaran kolom unique pada email
  if (e.code === '23505') return 'Email sudah terdaftar.';
  // pesan dari trigger "owner terakhir" ditampilkan apa adanya
  if (e.message?.includes('satu-satunya owner aktif')) return e.message;
  // RLS menolak (bukan owner)
  if (e.code === '42501') return 'Hanya owner yang boleh mengelola akun.';
  return e.message ? `${cadangan} (${e.message})` : cadangan;
};

interface KasirContextType {
  kasirList: Kasir[];
  memuat: boolean;
  /** Pesan error terakhir saat memuat data (null jika baik-baik saja). */
  galat: string | null;
  refreshKasir: () => Promise<void>;
  tambahKasir: (email: string, nama?: string, role?: Role) => Promise<void>;
  ubahKasir: (id: string, data: { nama?: string; aktif?: boolean }) => Promise<void>;
  hapusKasir: (id: string) => Promise<void>;
}

const KasirContext = createContext<KasirContextType | undefined>(undefined);

export function KasirProvider({ children }: { children: React.ReactNode }) {
  const [kasirList, setKasirList] = useState<Kasir[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  /** Baca ulang seluruh tabel `pengguna` (RLS: hanya owner yang melihat semua baris). */
  const refreshKasir = useCallback(async () => {
    setMemuat(true);
    try {
      const { data, error } = await supabase
        .from('pengguna')
        .select('id, email, nama, role, aktif')
        .order('role', { ascending: false }) // 'owner' di atas 'kasir'
        .order('created_at', { ascending: true });

      if (error) {
        setGalat(pesanError(error, 'Gagal memuat daftar akun.'));
      } else {
        setKasirList(((data ?? []) as PenggunaRow[]).map(keKasir));
        setGalat(null);
      }
    } catch (e) {
      setGalat(pesanError(e as Error, 'Tidak dapat terhubung ke Supabase.'));
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    refreshKasir();
  }, [refreshKasir]);

  const tambahKasir = async (email: string, nama = '', role: Role = 'kasir') => {
    const { error } = await supabase.from('pengguna').insert({
      email: email.trim().toLowerCase(),
      nama: nama.trim() || null,
      role,
      aktif: true,
    });
    if (error) throw new Error(pesanError(error, 'Gagal menambah akun.'));
    await refreshKasir();
  };

  const ubahKasir = async (id: string, data: { nama?: string; aktif?: boolean }) => {
    const payload: { nama?: string | null; aktif?: boolean } = {};
    if (data.nama !== undefined) payload.nama = data.nama.trim() || null;
    if (data.aktif !== undefined) payload.aktif = data.aktif;
    if (Object.keys(payload).length === 0) return;

    // tampilan diperbarui lebih dulu; dikembalikan bila database menolak
    const sebelum = kasirList.find((k) => k.id === id);
    setKasirList((prev) => prev.map((k) => (k.id === id ? { ...k, ...data } : k)));

    // .select('id') agar update yang diam-diam ditolak RLS (0 baris) ikut terdeteksi
    const { data: hasil, error } = await supabase
      .from('pengguna')
      .update(payload)
      .eq('id', id)
      .select('id');
    if (error || !hasil || hasil.length === 0) {
      if (sebelum) setKasirList((prev) => prev.map((k) => (k.id === id ? sebelum : k)));
      throw new Error(pesanError(error, 'Gagal menyimpan perubahan akun.'));
    }
  };

  const hapusKasir = async (id: string) => {
    const { data, error } = await supabase.from('pengguna').delete().eq('id', id).select('id');
    if (error || !data || data.length === 0) {
      throw new Error(pesanError(error, 'Gagal menghapus akun.'));
    }
    setKasirList((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <KasirContext.Provider
      value={{ kasirList, memuat, galat, refreshKasir, tambahKasir, ubahKasir, hapusKasir }}
    >
      {children}
    </KasirContext.Provider>
  );
}

export function useKasir() {
  const context = useContext(KasirContext);
  if (!context) {
    throw new Error('useKasir must be used within a KasirProvider');
  }
  return context;
}
