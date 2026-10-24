import React, { createContext, useContext, useState } from 'react';

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

interface BahanContextType {
  bahanList: Bahan[];
  tambahBahan: (bahan: Omit<Bahan, 'id'>) => void;
  updateBahan: (id: string, bahan: Partial<Bahan>) => void;
  catatStokMasuk: (id: string, jumlah: number, catatan?: string) => void;
}

const BahanContext = createContext<BahanContextType | undefined>(undefined);

export function BahanProvider({ children }: { children: React.ReactNode }) {
  const [bahanList, setBahanList] = useState<Bahan[]>(INITIAL_BAHAN);

  const tambahBahan = (bahan: Omit<Bahan, 'id'>) => {
    const newId = (bahanList.length + 1).toString();
    setBahanList(prev => [...prev, { ...bahan, id: newId }]);
  };

  const updateBahan = (id: string, updated: Partial<Bahan>) => {
    setBahanList(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updated } : b))
    );
  };

  const catatStokMasuk = (id: string, jumlah: number) => {
    setBahanList(prev =>
      prev.map(b => (b.id === id ? { ...b, stok: b.stok + jumlah } : b))
    );
  };

  return (
    <BahanContext.Provider
      value={{
        bahanList,
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
