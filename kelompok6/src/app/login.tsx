import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppButton from '@/components/atoms/AppButton';
import AppInput from '@/components/atoms/AppInput';
import { StickyMilkFonts } from '@/constants/design-tokens';

// Data dummy akun (sementara sebelum integrasi backend)
const DUMMY_USERS = [
  {
    username: 'owner',
    email: 'owner@stickymilk.id',
    password: 'password123',
    role: 'owner' as const,
    route: '/(owner)/dashboard' as const,
  },
  {
    username: 'kasir',
    email: 'kasir@stickymilk.id',
    password: 'password123',
    role: 'kasir' as const,
    route: '/(kasir)/dashboard' as const,
  },
];

export default function LoginScreen() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; general?: string }>({});
  const [focusedField, setFocusedField] = useState('');

  const handleLogin = () => {
    const trimmedIdentifier = identifier.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const newErrors: { identifier?: string; password?: string; general?: string } = {};

    if (!trimmedIdentifier) {
      newErrors.identifier = 'Email atau username wajib diisi.';
    }

    if (!trimmedPassword) {
      newErrors.password = 'Password wajib diisi.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Validasi dengan data dummy
    const user = DUMMY_USERS.find(
      (u) =>
        (u.email.toLowerCase() === trimmedIdentifier || u.username.toLowerCase() === trimmedIdentifier) &&
        u.password === trimmedPassword
    );

    if (user) {
      setErrors({});
      router.replace(user.route);
    } else {
      setErrors({
        general: 'Email/username atau password salah. Silakan coba lagi.',
      });
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
            <Ionicons
              name="cafe"
              size={42}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.brand}>Sticky Milk</Text>
          <Text style={styles.tagline}>
            Fresh Drinks, Happy Moments
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Selamat Datang!</Text>
          <Text style={styles.subtitle}>
            Masuk untuk mengakses sistem kasir & manajemen Sticky Milk.
          </Text>

          {errors.general ? (
            <View style={styles.generalErrorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color="#D93025" />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email atau Username</Text>

          <View
            style={[
              styles.inputContainer,
              focusedField === 'identifier' && styles.inputFocused,
              (errors.identifier || errors.general) && styles.inputError,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color="#8A8A8A"
            />

            <AppInput
              style={styles.input}
              placeholder="Masukkan email atau username"
              placeholderTextColor="#A0A0A0"
              value={identifier}
              onChangeText={(value: string) => {
                setIdentifier(value);
                if (errors.identifier || errors.general) {
                  setErrors((prev) => ({
                    ...prev,
                    identifier: '',
                    general: '',
                  }));
                }
              }}
              onFocus={() => setFocusedField('identifier')}
              onBlur={() => setFocusedField('')}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel="Email atau Username"
              invalid={!!errors.identifier}
            />
          </View>

          {errors.identifier ? (
            <Text style={styles.errorText}>{errors.identifier}</Text>
          ) : null}

          <Text style={styles.label}>Password</Text>

          <View
            style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputFocused,
              (errors.password || errors.general) && styles.inputError,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#8A8A8A"
            />

            <AppInput
              style={styles.input}
              placeholder="Masukkan password"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={(value: string) => {
                setPassword(value);
                if (errors.password || errors.general) {
                  setErrors((prev) => ({
                    ...prev,
                    password: '',
                    general: '',
                  }));
                }
              }}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              accessibilityLabel="Password"
              invalid={!!errors.password}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword
                  ? 'Sembunyikan password'
                  : 'Tampilkan password'
              }
            >
              <Ionicons
                name={
                  showPassword ? 'eye-off-outline' : 'eye-outline'
                }
                size={21}
                color="#8A8A8A"
              />
            </TouchableOpacity>
          </View>

          {errors.password ? (
            <Text style={styles.errorText}>
              {errors.password}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() =>
              Alert.alert(
                'Lupa Password',
                'Fitur ini belum tersedia pada versi UTS. Silakan gunakan kredensial demo.'
              )
            }
          >
            <Text style={styles.forgotText}>Lupa password?</Text>
          </TouchableOpacity>

          <AppButton style={styles.loginButton} onPress={handleLogin} accessibilityLabel="Masuk">
            <Text style={styles.loginButtonText}>Masuk</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </AppButton>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Sistem Informasi Penjualan
            </Text>
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
  label: {
    fontFamily: StickyMilkFonts.bodyBold,
    fontSize: 14,
    color: '#4D3A2D',
    marginBottom: 9,
    marginTop: 12,
  },
  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DED4',
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: '#FFFCF9',
  },
  inputFocused: {
    borderColor: '#8B5E3C',
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: '#D93025',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: StickyMilkFonts.body,
    fontSize: 14,
    color: '#3D2A1F',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  errorText: {
    fontFamily: StickyMilkFonts.body,
    color: '#D93025',
    fontSize: 12,
    marginTop: 6,
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
  demoBox: {
    marginTop: 20,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EFE3D3',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  demoTitle: {
    fontFamily: StickyMilkFonts.bodyBold,
    fontSize: 12,
    color: '#8B5E3C',
  },
  demoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DED4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  demoItemRole: {
    fontFamily: StickyMilkFonts.bodyBold,
    fontSize: 12,
    color: '#5B3925',
  },
  demoItemCred: {
    fontFamily: StickyMilkFonts.body,
    fontSize: 12,
    color: '#8B5E3C',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 14,
    marginBottom: 22,
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: StickyMilkFonts.bodySemi,
    fontSize: 13,
    color: '#8B5E3C',
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