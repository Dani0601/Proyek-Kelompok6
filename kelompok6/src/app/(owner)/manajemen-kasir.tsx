import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import ProductList from '@/components/organisms/ProductList';
import { StickyMilkColors } from '@/constants/design-tokens';
import { useAuth } from '@/context/auth-context';
import { showAlert, showConfirm } from '@/utils/show-alert';
import { useKasir, type Kasir } from '../../context/kasir-context';

const COLORS = {
  brown: StickyMilkColors.primary,
  textDark: StickyMilkColors.textDark,
  textMuted: StickyMilkColors.textMuted,
  border: StickyMilkColors.borderWarm,
  danger: StickyMilkColors.danger,
  dangerSoft: StickyMilkColors.dangerSoft,
  green: '#10B981',
  greenSoft: '#D1FAE5',
  sand: StickyMilkColors.sand,
};

export default function ManajemenKasirScreen() {
  const router = useRouter();
  const { profil } = useAuth();
  const { kasirList, memuat, galat, refreshKasir, ubahKasir, hapusKasir } = useKasir();
  const [refreshing, setRefreshing] = useState(false);
  const [sibuk, setSibuk] = useState<string | null>(null); // id akun yang sedang diproses

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  // layar tab tetap hidup di belakang, jadi muat ulang setiap kali tab dibuka
  useFocusEffect(
    useCallback(() => {
      refreshKasir();
    }, [refreshKasir])
  );

  if (!fontsLoaded) return null;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshKasir();
    setRefreshing(false);
  };

  const gantiAktif = async (k: Kasir, nilai: boolean) => {
    setSibuk(k.id);
    try {
      await ubahKasir(k.id, { aktif: nilai });
    } catch (e) {
      showAlert('Gagal', e instanceof Error ? e.message : 'Gagal mengubah status akun.');
    } finally {
      setSibuk(null);
    }
  };

  const konfirmasiHapus = (k: Kasir) => {
    showConfirm(
      'Hapus akun?',
      `${k.email} tidak akan bisa masuk lagi ke aplikasi.`,
      async () => {
        setSibuk(k.id);
        try {
          await hapusKasir(k.id);
        } catch (e) {
          showAlert('Gagal', e instanceof Error ? e.message : 'Gagal menghapus akun.');
        } finally {
          setSibuk(null);
        }
      }
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Manajemen Kasir</Text>
            <Text style={styles.subtitle}>{kasirList.length} akun terdaftar</Text>
          </View>
          <TouchableOpacity
            style={styles.addCircle}
            activeOpacity={0.8}
            onPress={() => router.push('/(owner)/tambah-kasir')}
            accessibilityLabel="Tambah akun"
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!!galat && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{galat}</Text>
            <TouchableOpacity onPress={refreshKasir} activeOpacity={0.7}>
              <Text style={styles.retryText}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        )}

        <ProductList itemSpacing={12}>
          {kasirList.map((k) => {
            const saya = k.email === profil?.email;
            const namaTampil = k.nama || k.email.split('@')[0];
            return (
              <View key={k.id} style={[styles.card, !k.aktif && styles.cardNonaktif]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{namaTampil.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.nama} numberOfLines={1}>
                      {namaTampil}
                    </Text>
                    {saya && <Text style={styles.anda}>Anda</Text>}
                  </View>
                  <Text style={styles.email} numberOfLines={1}>
                    {k.email}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, k.role === 'owner' ? styles.badgeOwner : styles.badgeKasir]}>
                      <Text style={[styles.badgeText, k.role === 'owner' && { color: '#FFFFFF' }]}>
                        {k.role === 'owner' ? 'Owner' : 'Kasir'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: k.aktif ? COLORS.greenSoft : COLORS.dangerSoft },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: k.aktif ? '#047857' : COLORS.danger }]}>
                        {k.aktif ? 'Aktif' : 'Nonaktif'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Akun yang sedang dipakai tidak boleh menonaktifkan / menghapus dirinya sendiri */}
                {!saya && (
                  <View style={styles.actions}>
                    {sibuk === k.id ? (
                      <ActivityIndicator color={COLORS.brown} />
                    ) : (
                      <>
                        <Switch
                          value={k.aktif}
                          onValueChange={(v) => gantiAktif(k, v)}
                          trackColor={{ false: COLORS.sand, true: COLORS.brown }}
                          thumbColor="#FFFFFF"
                          accessibilityLabel={`Aktifkan ${k.email}`}
                        />
                        <TouchableOpacity
                          onPress={() => konfirmasiHapus(k)}
                          style={styles.trashBtn}
                          activeOpacity={0.7}
                          accessibilityLabel={`Hapus ${k.email}`}
                        >
                          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ProductList>

        {memuat && kasirList.length === 0 && (
          <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.brown} />
        )}

        {!memuat && !galat && kasirList.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Belum ada akun. Tekan + untuk mendaftarkan kasir.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StickyMilkColors.cream },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: COLORS.textDark },
  subtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  addCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.brown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: COLORS.danger },
  retryText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: COLORS.danger,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
  },
  cardNonaktif: { opacity: 0.65 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: StickyMilkColors.thumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: COLORS.brown },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nama: { flexShrink: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: COLORS.textDark },
  anda: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: COLORS.brown,
    backgroundColor: StickyMilkColors.iconButton,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  email: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  badgeKasir: { backgroundColor: COLORS.sand },
  badgeOwner: { backgroundColor: COLORS.brown },
  badgeText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: COLORS.textDark },
  actions: { alignItems: 'center', gap: 6 },
  trashBtn: { padding: 4 },
  empty: { alignItems: 'center', marginTop: 48, gap: 10 },
  emptyText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
