import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// diperlukan agar jendela login Google bisa menutup sendiri; aman dipanggil di HP
WebBrowser.maybeCompleteAuthSession();

// Proxy Expo untuk login Google di Expo Go. Ganti @anonymous bila terlogin di Expo (npx expo whoami).
const PROXY_URL = 'https://auth.expo.io/@anonymous/kelompok6';

export type Role = 'owner' | 'kasir';
export type Profil = { email: string; nama: string; role: Role; fotoUrl?: string };

type AuthContextType = {
  profil: Profil | null; // null = belum masuk
  memuat: boolean; // true selama sesi awal dicek
  masukDenganGoogle: () => Promise<void>; // throw Error(pesan) bila gagal / email tidak terdaftar
  /** Pesan gagal masuk yang datang lewat deep link (Android); ditampilkan oleh layar login. */
  galatLogin: string | null;
  bersihkanGalat: () => void;
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
  const [galatLogin, setGalatLogin] = useState<string | null>(null);

  // Saat aplikasi dibuka: cek sesi tersimpan, lalu cek ulang emailnya di tabel pengguna
  // (supaya kasir yang dinonaktifkan tidak lolos dengan sesi lama).
  useEffect(() => {
    let aktif = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const hasil = await cekPengguna(data.session);
          if (hasil.status === 'tidak-terdaftar') {
            await supabase.auth.signOut({ scope: 'local' });
          } else if (hasil.status === 'ok' && aktif) {
            setProfil(hasil.profil);
          }
        }
      } catch {
        // gagal membaca sesi: anggap belum masuk
      } finally {
        if (aktif) setMemuat(false);
      }
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

  // Alamat yang sudah diproses, supaya URL yang sama tidak diproses dua kali
  // (bisa datang dari hasil openAuthSessionAsync DAN dari Linking).
  const urlDiproses = useRef<string | null>(null);

  /** Ubah URL balik dari Google/Supabase menjadi sesi, lalu cek emailnya di tabel pengguna. */
  const masukDariUrl = useCallback(async (url: string) => {
    if (urlDiproses.current === url) return;
    urlDiproses.current = url;

    const param = bacaParam(url);
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

  // Di Android, alamat balik sering datang lewat Linking (deep link) sementara
  // openAuthSessionAsync hanya mengembalikan "dismiss". Tangkap di sini juga.
  useEffect(() => {
    const tangani = (url: string | null) => {
      if (!url || !url.includes('auth/callback')) return;
      if (!url.includes('access_token') && !url.includes('code=')) return;
      masukDariUrl(url).catch((e) =>
        setGalatLogin(e instanceof Error ? e.message : 'Coba lagi.')
      );
    };

    Linking.getInitialURL().then(tangani);
    const sub = Linking.addEventListener('url', ({ url }) => tangani(url));
    return () => sub.remove();
  }, [masukDariUrl]);

  const masukDenganGoogle = useCallback(async () => {
    // Expo Go TIDAK bisa menerima redirect scheme custom (kelompok6://). Jalur yang dipakai di Expo Go
    // adalah PROXY Expo (https://auth.expo.io): Supabase mengarahkan ke alamat https proxy, lalu proxy
    // memantulkan hasilnya ke exp://... (Expo Go). Alamat proxy harus ada di Redirect URLs Supabase.
    // Aplikasi hasil build / web memakai alamat langsung seperti biasa.
    const hostUri = Constants.expoConfig?.hostUri; // mis. 192.168.1.5:8081 (hanya ada saat development)
    const pakaiProxy = __DEV__ && !!hostUri && Platform.OS !== 'web';

    const returnUrl = pakaiProxy
      ? `exp://${hostUri}/--/auth/callback`
      : Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: pakaiProxy ? PROXY_URL : returnUrl, skipBrowserRedirect: true },
    });
    if (error || !data?.url) throw new Error('Gagal membuka login Google. Coba lagi.');

    const urlBuka = pakaiProxy
      ? `${PROXY_URL}/start?${new URLSearchParams({ authUrl: data.url, returnUrl }).toString()}`
      : data.url;

    const hasil = await WebBrowser.openAuthSessionAsync(urlBuka, returnUrl);
    if (hasil.type === 'success' && hasil.url) await masukDariUrl(hasil.url);
    // type lain (dismiss/cancel): bila alamat balik datang lewat Linking, useEffect di atas
    // yang memprosesnya; bila tidak, pengguna tetap di layar login.
  }, [masukDariUrl]);

  const bersihkanGalat = useCallback(() => setGalatLogin(null), []);

  const keluar = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' }); // hanya perangkat ini
    setProfil(null);
  }, []);

  const value = useMemo(
    () => ({ profil, memuat, masukDenganGoogle, galatLogin, bersihkanGalat, keluar }),
    [profil, memuat, masukDenganGoogle, galatLogin, bersihkanGalat, keluar]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
};