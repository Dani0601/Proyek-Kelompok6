import React, { createContext, useContext, useMemo, useState } from 'react';

const DATA_AWAL = [
  { id: 'A-010', produk: 'Coklat (L) × 2', status: 'Siap', metode: 'Tunai' },
  { id: 'A-011', produk: 'Matcha (S) × 1', status: 'Diproses', metode: 'Qris' },
  { id: 'A-012', produk: 'Durian (L) × 3', status: 'Menunggu', metode: 'Qris' },
  { id: 'A-013', produk: 'Redvelvet (S) × 2', status: 'Menunggu', metode: 'Tunai' },
];

const OrderContext = createContext(null);

export function OrderProvider({ children }) {
  const [pesanan, setPesanan] = useState(DATA_AWAL);

  // nomor antrean berikutnya, otomatis lanjut dari nomor terbesar (A-014, A-015, dst)
  const nomorBerikutnya = useMemo(() => {
    const maks = pesanan.reduce(
      (m, p) => Math.max(m, parseInt(p.id.split('-')[1], 10) || 0),
      0
    );
    return `A-${String(maks + 1).padStart(3, '0')}`;
  }, [pesanan]);

  const tambahPesanan = ({ produk, metode }) => {
    setPesanan((lama) => [
      ...lama,
      { id: nomorBerikutnya, produk, metode, status: 'Menunggu' },
    ]);
  };

  const ubahStatus = (id) => {
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

export const useOrders = () => useContext(OrderContext);