import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// diperlukan agar jendela login Google bisa menutup sendiri; aman dipanggil di HP
WebBrowser.maybeCompleteAuthSession();

export type Role = 'owner' | 'kasir';
export type Profil = { email: string; nama: string; role: Role; fotoUrl?: string };

type AuthContextType = {
  profil: Profil | null; // null = belum masuk
  memuat: boolean; // true selama sesi awal dicek
  masukDenganGoogle: () => Promise<void>; // throw Error(pesan) bila gagal / email tidak terdaftar
  keluar: () => Promise<void>;
};

type HasilCek =
  | { status: 'ok'; profil: Profil }
  | { status: 'tidak-terdaftar' }
  | { status: 'gagal' }; // tidak bisa memastikan (mis. tidak ada internet)

const AuthContext = createContext<AuthContextType | null>(null);

const decode = (s: string) => {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
};

/** Baca parameter dari bagian "?" dan "#" sebuah URL. */
const bacaParam = (url: string) => {
  const hasil: Record<string, string> = {};
  const [tanpaHash, hash = ''] = url.split('#');
  const query = tanpaHash.includes('?') ? tanpaHash.split('?')[1] : '';
  for (const bagian of [query, hash]) {
    for (const pasangan of bagian.split('&')) {
      if (!pasangan) continue;
      const [k, ...v] = pasangan.split('=');
      hasil[decode(k)] = decode(v.join('='));
    }
  }
  return hasil;
};

/** Cari email sesi di tabel pengguna (harus terdaftar dan aktif). */
async function cekPengguna(session: Session): Promise<HasilCek> {
  const email = session.user.email?.trim().toLowerCase();
  if (!email) return { status: 'tidak-terdaftar' };

  const { data, error } = await supabase
    .from('pengguna')
    .select('nama, role')
    .eq('email', email)
    .eq('aktif', true)
    .maybeSingle();

  if (error) return { status: 'gagal' };
  if (!data || (data.role !== 'owner' && data.role !== 'kasir')) {
    return { status: 'tidak-terdaftar' };
  }

  const meta = (session.user.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    status: 'ok',
    profil: {
      email,
      nama: data.nama?.trim() || meta.full_name || meta.name || email.split('@')[0],
      role: data.role as Role,
      fotoUrl: meta.avatar_url || meta.picture,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [memuat, setMemuat] = useState(true);

  // Saat aplikasi dibuka: cek sesi tersimpan, lalu cek ulang emailnya di tabel pengguna
  // (supaya kasir yang dinonaktifkan tidak lolos dengan sesi lama).
  useEffect(() => {
    let aktif = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const hasil = await cekPengguna(data.session);
        if (hasil.status === 'tidak-terdaftar') {
          await supabase.auth.signOut({ scope: 'local' });
        } else if (hasil.status === 'ok' && aktif) {
          setProfil(hasil.profil);
        }
      }
      if (aktif) setMemuat(false);
    })();

    // jangan memanggil database di sini; cukup bereaksi saat sesi berakhir
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setProfil(null);
    });

    return () => {
      aktif = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const masukDenganGoogle = useCallback(async () => {
    // Expo Go: exp://192.168.x.x:8081/--/auth/callback, dev build: kelompok6://auth/callback
    const redirectTo = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) throw new Error('Gagal membuka login Google. Coba lagi.');

    const hasil = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (hasil.type !== 'success' || !hasil.url) return; // jendela ditutup pengguna

    const param = bacaParam(hasil.url);
    if (param.error || param.error_description) return; // ditolak/dibatalkan: kembali ke login

    let session: Session | null = null;
    if (param.access_token && param.refresh_token) {
      const res = await supabase.auth.setSession({
        access_token: param.access_token,
        refresh_token: param.refresh_token,
      });
      session = res.data.session;
    } else if (param.code) {
      const res = await supabase.auth.exchangeCodeForSession(param.code);
      session = res.data.session;
    } else {
      return;
    }
    if (!session) throw new Error('Gagal masuk. Coba lagi.');

    const cek = await cekPengguna(session);
    if (cek.status === 'tidak-terdaftar') {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Email belum terdaftar. Hubungi owner.');
    }
    if (cek.status === 'gagal') {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Tidak dapat memeriksa akun. Periksa koneksi internet lalu coba lagi.');
    }
    setProfil(cek.profil);
  }, []);

  const keluar = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' }); // hanya perangkat ini
    setProfil(null);
  }, []);

  const value = useMemo(
    () => ({ profil, memuat, masukDenganGoogle, keluar }),
    [profil, memuat, masukDenganGoogle, keluar]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
};