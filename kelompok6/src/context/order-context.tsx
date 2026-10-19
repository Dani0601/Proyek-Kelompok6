import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Status = 'Menunggu' | 'Diproses' | 'Siap';
export type Metode = 'Tunai' | 'QRIS';

export type Pesanan = {
  id: string;
  produk: string;
  status: Status;
  metode: Metode;
};

type OrderContextValue = {
  pesanan: Pesanan[];
  nomorBerikutnya: string;
  tambahPesanan: (data: { produk: string; metode: Metode }) => void;
  ubahStatus: (id: string) => void;
};

const DATA_AWAL: Pesanan[] = [
  { id: 'A-010', produk: 'Coklat (L) × 2', status: 'Siap', metode: 'Tunai' },
  { id: 'A-011', produk: 'Matcha (S) × 1', status: 'Diproses', metode: 'QRIS' },
  { id: 'A-012', produk: 'Durian (L) × 3', status: 'Menunggu', metode: 'QRIS' },
  { id: 'A-013', produk: 'Redvelvet (S) × 2', status: 'Menunggu', metode: 'Tunai' },
];

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [pesanan, setPesanan] = useState<Pesanan[]>(DATA_AWAL);

  // nomor antrean berikutnya, otomatis lanjut dari nomor terbesar (A-014, A-015, dst)
  const nomorBerikutnya = useMemo(() => {
    const maks = pesanan.reduce(
      (m, p) => Math.max(m, parseInt(p.id.split('-')[1], 10) || 0),
      0
    );
    return `A-${String(maks + 1).padStart(3, '0')}`;
  }, [pesanan]);

  const tambahPesanan = ({ produk, metode }: { produk: string; metode: Metode }) => {
    setPesanan((lama) => [
      ...lama,
      { id: nomorBerikutnya, produk, metode, status: 'Menunggu' },
    ]);
  };

  const ubahStatus = (id: string) => {
    setPesanan((lama) =>
      lama.map((p) => {
        if (p.id !== id) return p;
        if (p.status === 'Menunggu') return { ...p, status: 'Diproses' };
        if (p.status === 'Diproses') return { ...p, status: 'Siap' };
        return p;
      })
    );
  };

  return (
    <OrderContext.Provider value={{ pesanan, nomorBerikutnya, tambahPesanan, ubahStatus }}>
      {children}
    </OrderContext.Provider>
  );
}

export const useOrders = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders harus dipakai di dalam <OrderProvider>');
  return ctx;
};