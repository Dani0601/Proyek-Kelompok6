import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';

export type Metode = 'Tunai' | 'QRIS';
export type StatusPesanan = 'Menunggu' | 'Diproses' | 'Siap';

export type Pesanan = {
  id: string; // nomor antrean, mis. "A-014"
  produk: string;
  status: StatusPesanan;
  metode: Metode;
  dibuat: string; // created_at (ISO)
};

type PesananRow = {
  id: string;
  produk: string;
  status: StatusPesanan;
  metode: Metode;
  created_at: string;
};

export type HasilTambah = { ok: true; id: string } | { ok: false; pesan: string };
export type HasilUbahStatus = { ok: true } | { ok: false; pesan: string };

type OrderValue = {
  pesanan: Pesanan[];
  memuat: boolean;
  error: string | null;
  nomorBerikutnya: string;
  tambahPesanan: (p: { produk: string; metode: Metode }) => Promise<HasilTambah>;
  ubahStatus: (id: string) => Promise<HasilUbahStatus>;
  refresh: () => Promise<void>;
};

const BERIKUTNYA: Record<StatusPesanan, StatusPesanan | null> = {
  Menunggu: 'Diproses',
  Diproses: 'Siap',
  Siap: null,
};

const toPesanan = (r: PesananRow): Pesanan => ({
  id: r.id,
  produk: r.produk,
  status: r.status,
  metode: r.metode,
  dibuat: r.created_at,
});

const nomorDariId = (id: string) => parseInt(id.split('-')[1] ?? '', 10) || 0;
const buatId = (n: number) => `A-${String(n).padStart(3, '0')}`;

// antrean hanya menampilkan pesanan hari ini ("aktif hari ini")
const awalHariIni = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const urutkan = (list: Pesanan[]) => [...list].sort((a, b) => a.dibuat.localeCompare(b.dibuat));

const OrderContext = createContext<OrderValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [nomorTerakhir, setNomorTerakhir] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [hariIni, terakhir] = await Promise.all([
      supabase
        .from('pesanan')
        .select('id, produk, status, metode, created_at')
        .gte('created_at', awalHariIni())
        .order('created_at', { ascending: true }),
      supabase.from('pesanan').select('id').order('created_at', { ascending: false }).limit(1),
    ]);

    if (hariIni.error || !hariIni.data) {
      setError('Gagal memuat antrean. Periksa koneksi internet.');
    } else {
      setError(null);
      setPesanan((hariIni.data as PesananRow[]).map(toPesanan));
    }
    if (terakhir.data?.[0]) setNomorTerakhir(nomorDariId(terakhir.data[0].id));
    setMemuat(false);
  }, []);

  useEffect(() => {
    refresh();

    // Sinkron antar perangkat (kasir <-> peracik). Realtime harus diaktifkan untuk tabel "pesanan".
    const channel = supabase
      .channel('pesanan-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id;
          if (id) setPesanan((prev) => prev.filter((p) => p.id !== id));
          return;
        }
        const baru = toPesanan(payload.new as PesananRow);
        setNomorTerakhir((n) => Math.max(n, nomorDariId(baru.id)));
        setPesanan((prev) =>
          prev.some((p) => p.id === baru.id)
            ? prev.map((p) => (p.id === baru.id ? baru : p))
            : urutkan([...prev, baru])
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  // hanya perkiraan untuk ditampilkan; nomor sebenarnya ditentukan saat insert
  const nomorBerikutnya = useMemo(() => {
    const maksLokal = pesanan.reduce((m, p) => Math.max(m, nomorDariId(p.id)), 0);
    return buatId(Math.max(nomorTerakhir, maksLokal) + 1);
  }, [pesanan, nomorTerakhir]);

  const tambahPesanan: OrderValue['tambahPesanan'] = async ({ produk, metode }) => {
    // nomor dihitung dari data terbaru di server; ulangi kalau bentrok dengan kasir lain (kode 23505 = id kembar)
    for (let percobaan = 0; percobaan < 3; percobaan++) {
      const { data: terakhir, error: e1 } = await supabase
        .from('pesanan')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);
      if (e1) return { ok: false, pesan: 'Gagal membaca nomor antrean. Periksa koneksi internet.' };

      const id = buatId((terakhir?.[0] ? nomorDariId(terakhir[0].id) : 0) + 1);

      const { data, error: e2 } = await supabase
        .from('pesanan')
        .insert({ id, produk, metode, status: 'Menunggu' })
        .select('id, produk, status, metode, created_at')
        .single();

      if (!e2 && data) {
        const baru = toPesanan(data as PesananRow);
        setNomorTerakhir((n) => Math.max(n, nomorDariId(id)));
        setPesanan((prev) => (prev.some((p) => p.id === baru.id) ? prev : urutkan([...prev, baru])));
        return { ok: true, id };
      }
      if (e2?.code !== '23505') return { ok: false, pesan: 'Gagal menyimpan pesanan ke server.' };
    }
    return { ok: false, pesan: 'Nomor antrean bentrok dengan kasir lain. Silakan coba lagi.' };
  };

  const ubahStatus: OrderValue['ubahStatus'] = async (id) => {
    const saatIni = pesanan.find((p) => p.id === id);
    if (!saatIni) return { ok: false, pesan: 'Pesanan tidak ditemukan.' };
    const berikut = BERIKUTNYA[saatIni.status];
    if (!berikut) return { ok: true }; // sudah Siap

    // tampilkan dulu supaya terasa cepat
    setPesanan((prev) => prev.map((p) => (p.id === id ? { ...p, status: berikut } : p)));

    // update bersyarat: hanya jika status di server masih sama (cegah lompat dua tingkat)
    const { data, error: err } = await supabase
      .from('pesanan')
      .update({ status: berikut })
      .eq('id', id)
      .eq('status', saatIni.status)
      .select('id');

    if (err || !data || data.length === 0) {
      await refresh(); // kembalikan ke kondisi sebenarnya di server
      return {
        ok: false,
        pesan: err
          ? 'Gagal menyimpan status. Periksa koneksi internet.'
          : 'Status pesanan sudah diubah dari perangkat lain. Data diperbarui.',
      };
    }
    return { ok: true };
  };

  return (
    <OrderContext.Provider
      value={{ pesanan, memuat, error, nomorBerikutnya, tambahPesanan, ubahStatus, refresh }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export const useOrders = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders harus dipakai di dalam <OrderProvider>');
  return ctx;
};