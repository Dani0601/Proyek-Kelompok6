import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

const COLORS = {
  background: '#FFF5EA',
  card: '#FFFFFF',
  brown: '#8B5E3C',
  caramel: '#C48B60',
  sand: '#EEE2D3',
  mango: '#E8B84B',
  textDark: '#3A2418',
  textMuted: '#8E7B6D',
  border: '#F3E6D8',
  iconButton: '#FFF3E6',
};

const FONTS = {
  heading: 'Poppins_700Bold',
  headingSemi: 'Poppins_600SemiBold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
};

const WEEKLY_SALES = [
  { day: 'Sen', height: 40, color: COLORS.sand },
  { day: 'Sel', height: 60, color: COLORS.sand },
  { day: 'Rab', height: 50, color: COLORS.sand },
  { day: 'Kam', height: 80, color: COLORS.caramel },
  { day: 'Jum', height: 65, color: COLORS.sand },
  { day: 'Sab', height: 95, color: COLORS.caramel },
  { day: 'Min', height: 105, color: COLORS.brown },
];

const TOP_PRODUCTS = [
  { id: 1, name: 'Sticky Milk Coklat', sold: 32 },
  { id: 2, name: 'Smoothies Mangga', sold: 27 },
];

export default function DashboardScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Halo, Owner 👋</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
        </View>

        {/* Penjualan hari ini */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Penjualan hari ini</Text>
          <Text style={styles.heroValue}>Rp 1.250.000</Text>
          <Text style={styles.heroTrend}>▲ 12% dari kemarin</Text>
        </View>

        {/* Statistik */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Transaksi</Text>
            <Text style={styles.statValue}>48</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pesanan aktif</Text>
            <Text style={styles.statValue}>7</Text>
          </View>
        </View>

        {/* Grafik 7 hari */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Penjualan 7 hari</Text>
          <View style={styles.chartRow}>
            {WEEKLY_SALES.map((item) => (
              <View key={item.day} style={styles.barColumn}>
                <View style={styles.barArea}>
                  <View
                    style={[
                      styles.bar,
                      { height: item.height, backgroundColor: item.color },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Produk terlaris */}
        <Text style={styles.sectionTitle}>Produk terlaris</Text>
        {TOP_PRODUCTS.map((item) => (
          <View key={item.id} style={styles.topRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{item.id}</Text>
            </View>
            <Text style={styles.topName}>{item.name}</Text>
            <Text style={styles.topSold}>{item.sold} terjual</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greeting: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    lineHeight: 36,
    color: COLORS.textDark,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.brown,
  },

  heroCard: {
    backgroundColor: COLORS.brown,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
  },
  heroLabel: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: '#F3E3D3',
  },
  heroValue: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    lineHeight: 42,
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroTrend: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statLabel: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: 30,
    lineHeight: 42,
    color: COLORS.textDark,
  },

  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 20,
  },
  chartTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  barColumn: { alignItems: 'center', width: 34 },
  barArea: { height: 108, justifyContent: 'flex-end' },
  bar: { width: 24, borderRadius: 8 },
  barLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
  },

  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.brown },
  topName: {
    flex: 1,
    fontFamily: FONTS.headingSemi,
    fontSize: 14,
    color: COLORS.textDark,
  },
  topSold: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
});