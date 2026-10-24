import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { OrderProvider } from '@/context/order-context';
import { BahanProvider } from '@/context/bahan-context';

const COLORS = {
  cream: '#FFF7ED',
};

export default function RootLayout() {
  return (
    <OrderProvider>
      <BahanProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(owner)" />
          <Stack.Screen name="(kasir)" />
        </Stack>
      </BahanProvider>
    </OrderProvider>
  );
}