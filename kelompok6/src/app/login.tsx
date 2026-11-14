import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '@/components/atoms/AppButton';
import { StickyMilkFonts } from '@/constants/design-tokens';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const { masukDenganGoogle } = useAuth();

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

          {error ? (
            <View style={styles.generalErrorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#D93025" />
              <Text style={styles.generalErrorText}>{error}</Text>
            </View>
          ) : null}

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
  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8E8',
    borderColor: '#F8B4B4',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  generalErrorText: {
    flex: 1,
    fontFamily: StickyMilkFonts.body,
    fontSize: 13,
    color: '#D93025',
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