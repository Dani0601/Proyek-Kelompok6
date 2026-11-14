import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { OrderProvider, useOrders } from '@/context/order-context';
import { BahanProvider, useBahan } from '@/context/bahan-context';
import { ProdukProvider, useProduk } from '@/context/produk-context';

import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

/**
 * Provider data dipasang sebelum login dan langsung mengambil data. Setelah RLS diketatkan
 * (tahap 2b), pengambilan itu ditolak untuk pengguna yang belum login. Komponen ini memuat
 * ulang semuanya tepat setelah login (dan saat berganti akun).
 */
function SinkronData() {
  const { profil } = useAuth();
  const { refresh: segarkanPesanan } = useOrders();
  const { refreshBahan } = useBahan();
  const { refresh: segarkanProduk } = useProduk();
  const email = profil?.email;

  useEffect(() => {
    if (!email) return;
    segarkanPesanan();
    refreshBahan();
    segarkanProduk();
  }, [email, segarkanPesanan, refreshBahan, segarkanProduk]);

  return null;
}

/** Penjaga rute: setiap grup hanya terbuka untuk role yang sesuai. */
function Navigator() {
  const { profil } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={profil === null}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={profil?.role === 'owner'}>
        <Stack.Screen name="(owner)" />
      </Stack.Protected>
      <Stack.Protected guard={profil?.role === 'kasir'}>
        <Stack.Screen name="(kasir)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) return null;

  // KeranjangProvider tidak lagi di sini: hanya dipakai grup (kasir), yang sudah membungkusnya sendiri.
  return (
    <AuthProvider>
      <OrderProvider>
        <BahanProvider>
          <ProdukProvider>
            <SinkronData />
            <StatusBar style="dark" />
            <Navigator />
          </ProdukProvider>
        </BahanProvider>
      </OrderProvider>
    </AuthProvider>
  );
}