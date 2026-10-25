import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { StickyMilkColors } from '@/constants/design-tokens';
import { KeranjangProvider } from '@/context/keranjang-context';

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
    <KeranjangProvider>
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
            tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="kasir"
          options={{
            title: 'Antrean',
            tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="transaksi"
          options={{
            title: 'Transaksi',
            tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="riwayat"
          options={{
            title: 'Riwayat',
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
          }}
        />

        {/* Layar Pilih Menu: tidak muncul sebagai tab, dan tab bar disembunyikan saat layar ini terbuka */}
        <Tabs.Screen
          name="pilih-menu"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </KeranjangProvider>
  );
}