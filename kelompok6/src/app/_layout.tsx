import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { OrderProvider } from '@/context/order-context';
import { BahanProvider } from '@/context/bahan-context';
import { ProdukProvider } from '@/context/produk-context';
import { KeranjangProvider } from '@/context/keranjang-context';

import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

const COLORS = {
  cream: '#FFF7ED',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <OrderProvider>
      <BahanProvider>
        <ProdukProvider>
          <KeranjangProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(owner)" />
              <Stack.Screen name="(kasir)" />
            </Stack>
          </KeranjangProvider>
        </ProdukProvider>
      </BahanProvider>
    </OrderProvider>
  );
}