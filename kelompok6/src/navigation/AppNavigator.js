import React from 'react';
import { OrderProvider } from '../screens/kasir/OrderContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import OwnerDashboardScreen from '../screens/owner/DashboardScreen';
import OwnerProdukScreen from '../screens/owner/ProdukScreen';
import OwnerTransaksiScreen from '../screens/owner/TransaksiScreen';
import OwnerLaporanScreen from '../screens/owner/LaporanScreen';
import OwnerProfilScreen from '../screens/owner/ProfilScreen';
import KasirScreen from '../screens/kasir/KasirScreen';
import KasirTransaksiScreen from '../screens/kasir/TransaksiScreen';
import KasirRiwayatScreen from '../screens/kasir/RiwayatScreen';
import KasirProfilScreen from '../screens/kasir/ProfilScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  brown: '#8B5E3C',
  muted: '#A79B91',
  border: '#EEE7E1',
  cream: '#FFF7ED',
};
const styles = StyleSheet.create({
  tabBar: { minHeight: 62, paddingTop: 5, paddingBottom: 5, borderTopColor: COLORS.border, backgroundColor: '#FFFFFF' },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  tabItem: { paddingVertical: 2 },
});
const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: COLORS.brown,
  tabBarInactiveTintColor: COLORS.muted,
  tabBarStyle: styles.tabBar,
  tabBarLabelStyle: styles.tabLabel,
  tabBarItemStyle: styles.tabItem,
};

function OwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={OwnerDashboardScreen} options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Produk" component={OwnerProdukScreen} options={{ tabBarLabel: 'Produk', tabBarIcon: ({ color, size }) => <Ionicons name="cafe-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Transaksi" component={OwnerTransaksiScreen} options={{ tabBarLabel: 'Transaksi', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Laporan" component={OwnerLaporanScreen} options={{ tabBarLabel: 'Laporan', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Profil" component={OwnerProfilScreen} options={{ tabBarLabel: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

function CashierTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Kasir" component={KasirScreen} options={{ tabBarLabel: 'Kasir', tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Transaksi" component={KasirTransaksiScreen} options={{ tabBarLabel: 'Transaksi', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Riwayat" component={KasirRiwayatScreen} options={{ tabBarLabel: 'Riwayat', tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} /> }} />
      <Tab.Screen name="Profil" component={KasirProfilScreen} options={{ tabBarLabel: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <OrderProvider>
        <StatusBar style="dark" backgroundColor={COLORS.cream} />
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
            <Stack.Screen name="CashierTabs" component={CashierTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </OrderProvider>
    </SafeAreaProvider>
  );
}


