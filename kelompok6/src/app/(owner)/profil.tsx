import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';

import AppButton from '@/components/atoms/AppButton';
import PageTemplate from '@/components/templates/PageTemplate';
import { DesignTokens } from '@/constants/design-tokens';

const C = DesignTokens.color;

const FONTS = {
  heading: 'Poppins_700Bold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};

const APP_VERSION = '1.0.0';

// Data akun (ganti dengan data login asli kalau sudah ada)
const AKUN = {
  nama: 'Owner Sticky Milk',
  email: 'owner@stickymilk.id',
  peran: 'Owner',
};

type IconName = keyof typeof Ionicons.glyphMap;

type MenuItem = {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
};

/** Satu baris menu: lingkaran ikon, judul + subjudul, dan panah. Memakai AppButton agar state pressed konsisten. */
function MenuRow({ item }: { item: MenuItem }) {
  return (
    <AppButton
      onPress={item.onPress}
      accessibilityLabel={item.title}
      style={styles.menuRow}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={item.icon} size={17} color={C.primary} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
    </AppButton>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Poppins_700Bold, Nunito_400Regular, Nunito_700Bold });
  if (!fontsLoaded) return null;

  // TODO: sambungkan onPress ke halaman masing-masing kalau sudah dibuat
  const menu: MenuItem[] = [
    {
      id: 'password',
      icon: 'lock-closed-outline',
      title: 'Ubah Password',
      subtitle: 'Ganti kata sandi akun',
      onPress: () => {},
    },
    {
      id: 'toko',
      icon: 'storefront-outline',
      title: 'Info Toko',
      subtitle: 'Nama toko, alamat, dan kontak',
      onPress: () => {},
    },
    {
      id: 'tentang',
      icon: 'information-circle-outline',
      title: 'Tentang Aplikasi',
      subtitle: `Versi ${APP_VERSION}`,
      onPress: () => {},
    },
  ];

  const handleKeluar = () => router.replace('/');

  return (
    <PageTemplate>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Profil</Text>
          <Text style={styles.subtitle}>Akun dan pengaturan</Text>

          {/* Kartu identitas */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{AKUN.nama.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{AKUN.nama}</Text>
            <Text style={styles.email}>{AKUN.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{AKUN.peran}</Text>
            </View>
          </View>

          {/* Daftar menu */}
          <View style={styles.menuCard}>
            {menu.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                <MenuRow item={item} />
              </View>
            ))}
          </View>

          {/* Tombol keluar */}
          <AppButton
            onPress={handleKeluar}
            accessibilityLabel="Keluar"
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={22} color={C.danger} />
            <Text style={styles.logoutText}>Keluar</Text>
          </AppButton>

          <Text style={styles.footer}>Sticky Milk · versi {APP_VERSION}</Text>
        </ScrollView>
      </SafeAreaView>
    </PageTemplate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 32 },

  title: { fontFamily: FONTS.heading, fontSize: 28, color: C.text },
  subtitle: { fontFamily: FONTS.body, fontSize: 14, color: C.textMuted, marginTop: 2 },

  /* kartu identitas */
  profileCard: {
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 24,
    paddingTop: 13,
    paddingBottom: 14,
    marginTop: 18,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: DesignTokens.radius.pill,
    backgroundColor: C.thumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: FONTS.heading, fontSize: 28, color: C.primary },
  name: { fontFamily: FONTS.heading, fontSize: 20, color: C.text, marginTop: 12 },
  email: { fontFamily: FONTS.body, fontSize: 14, color: C.textMuted, marginTop: 2 },
  roleBadge: {
    backgroundColor: C.sand,
    borderRadius: DesignTokens.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 3,
    marginTop: 10,
  },
  roleText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: C.primary },

  /* kartu menu */
  menuCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    marginTop: 18,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 18,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: DesignTokens.radius.pill,
    backgroundColor: C.thumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, marginLeft: 12 },
  menuTitle: { fontFamily: FONTS.heading, fontSize: 15, color: C.text },
  menuSubtitle: { fontFamily: FONTS.body, fontSize: 13, color: C.textMuted, marginTop: 1 },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 41,
    marginRight: 18,
  },

  /* tombol keluar */
  logoutBtn: {
    flexDirection: 'row',
    gap: 10,
    height: 48,
    borderRadius: DesignTokens.radius.pill,
    borderWidth: 1.5,
    borderColor: C.danger,
    marginTop: 22,
  },
  logoutText: { fontFamily: FONTS.heading, fontSize: 17, color: C.danger },

  footer: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
});