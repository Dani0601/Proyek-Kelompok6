import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { StickyMilkColors } from '@/constants/design-tokens';

const COLORS = {
  brown: StickyMilkColors.primary,
  muted: StickyMilkColors.mutedTab,
  border: StickyMilkColors.tabBorder,
};

const styles = StyleSheet.create({
  tabBar: { minHeight: 62, paddingTop: 5, paddingBottom: 5, borderTopColor: COLORS.border, backgroundColor: StickyMilkColors.surface },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  tabItem: { paddingVertical: 2 },
});

export default function KasirTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brown,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="kasir"
        options={{
          title: 'Antrean',
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transaksi"
        options={{
          title: 'Transaksi',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color as string} size={size} />,
        }}
      />

      {/* Layar Pilih Menu: disembunyikan tombol tab-nya tanpa merusak routing */}
      <Tabs.Screen
        name="pilih-menu"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}