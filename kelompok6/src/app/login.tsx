import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '@/components/atoms/AppButton';
import { StickyMilkColors, StickyMilkFonts } from '@/constants/design-tokens';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const { masukDenganGoogle, galatLogin, bersihkanGalat } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMasuk = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      // berhasil -> penjaga rute di _layout.tsx memindahkan ke dashboard sesuai role
      await masukDenganGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal masuk. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // pesan dari proses login langsung (error) atau dari deep link (galatLogin)
  const pesanGagal = error ?? galatLogin;
  const tutupDialog = () => {
    setError(null);
    bersihkanGalat();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="cafe" size={42} color="#FFFFFF" />
          </View>

          <Text style={styles.brand}>Sticky Milk</Text>
          <Text style={styles.tagline}>Fresh Drinks, Happy Moments</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Selamat Datang!</Text>
          <Text style={styles.subtitle}>
            Masuk dengan akun Google untuk mengakses sistem kasir & manajemen Sticky Milk.
            Hanya email yang sudah didaftarkan owner yang dapat masuk.
          </Text>

          <AppButton
            style={styles.loginButton}
            onPress={handleMasuk}
            disabled={loading}
            accessibilityLabel="Masuk dengan Google"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>Masuk dengan Google</Text>
              </>
            )}
          </AppButton>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sistem Informasi Penjualan</Text>
            <Text style={styles.footerBrand}>Sticky Milk © 2026</Text>
          </View>
        </View>
      </ScrollView>

      {/* Dialog gagal masuk (gaya sama dengan dialog hapus di halaman Produk) */}
      <Modal
        transparent
        visible={!!pesanGagal}
        animationType="fade"
        onRequestClose={tutupDialog}
      >
        <View style={dlg.overlay}>
          <View style={dlg.dialog}>
            <View style={dlg.icon}>
              <Ionicons name="alert-circle-outline" size={24} color={StickyMilkColors.danger} />
            </View>
            <Text style={dlg.title}>Gagal masuk</Text>
            <Text style={dlg.text}>{pesanGagal}</Text>
            <TouchableOpacity style={dlg.button} activeOpacity={0.85} onPress={tutupDialog}>
              <Text style={dlg.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: '#8B5E3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  brand: {
    fontFamily: StickyMilkFonts.heading,
    fontSize: 28,
    color: '#5B3925',
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: StickyMilkFonts.body,
    fontSize: 13,
    color: '#98745C',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#5B3925',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontFamily: StickyMilkFonts.heading,
    fontSize: 24,
    color: '#3D2A1F',
  },
  subtitle: {
    fontFamily: StickyMilkFonts.body,
    fontSize: 14,
    color: '#8A817A',
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 25,
  },
  loginButton: {
    minHeight: 54,
    backgroundColor: '#8B5E3C',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    fontFamily: StickyMilkFonts.headingSemi,
    color: '#FFFFFF',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontFamily: StickyMilkFonts.body,
    fontSize: 12,
    color: '#8A817A',
  },
  footerBrand: {
    fontFamily: StickyMilkFonts.bodySemi,
    fontSize: 12,
    color: '#B2A397',
    marginTop: 5,
  },
});

const dlg = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: StickyMilkColors.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  dialog: { width: '100%', backgroundColor: StickyMilkColors.cream, borderRadius: 24, padding: 24, alignItems: 'center' },
  icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: StickyMilkColors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: StickyMilkColors.textDark, marginBottom: 6, textAlign: 'center' },
  text: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: StickyMilkColors.textMuted, textAlign: 'center', marginBottom: 20 },
  button: { width: '100%', height: 50, borderRadius: 25, backgroundColor: StickyMilkColors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#FFFFFF' },
});