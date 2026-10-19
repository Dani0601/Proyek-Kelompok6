import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  cream: '#FFF7ED',
};

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={COLORS.cream} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(kasir)" />
      </Stack>
    </>
  );
}