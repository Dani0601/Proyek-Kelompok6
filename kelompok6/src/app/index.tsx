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

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [focusedField, setFocusedField] = useState('');
  const [role, setRole] = useState<'owner' | 'kasir'>('owner');

  const handleLogin = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email atau username wajib diisi.';
    }

    if (!password.trim()) {
      newErrors.password = 'Password wajib diisi.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    if (role === 'owner') {
      router.replace('/(owner)/dashboard');
    } else {
      router.replace('/(kasir)/dashboard');
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
            Masuk untuk mengelola penjualan Sticky Milk.
          </Text>

          <Text style={styles.label}>Email atau Username</Text>

          <View
            style={[
              styles.inputContainer,
              focusedField === 'email' && styles.inputFocused,
              errors.email && styles.inputError,
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
              value={email}
              onChangeText={(value: string) => {
                setEmail(value);
                if (errors.email) {
                  setErrors((prev) => ({
                    ...prev,
                    email: '',
                  }));
                }
              }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel="Email atau Username"
              invalid={!!errors.email}
            />
          </View>

          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}

          <Text style={styles.label}>Password</Text>

          <View
            style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputFocused,
              errors.password && styles.inputError,
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
                if (errors.password) {
                  setErrors((prev) => ({
                    ...prev,
                    password: '',
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

          <Text style={styles.label}>Masuk sebagai</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleOption, role === 'owner' && styles.roleOptionActive]}
              onPress={() => setRole('owner')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: role === 'owner' }}
            >
              <Ionicons name="storefront-outline" size={18} color={role === 'owner' ? '#FFFFFF' : '#8B5E3C'} />
              <Text style={[styles.roleText, role === 'owner' && styles.roleTextActive]}>Owner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleOption, role === 'kasir' && styles.roleOptionActive]}
              onPress={() => setRole('kasir')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: role === 'kasir' }}
            >
              <Ionicons name="cart-outline" size={18} color={role === 'kasir' ? '#FFFFFF' : '#8B5E3C'} />
              <Text style={[styles.roleText, role === 'kasir' && styles.roleTextActive]}>Kasir</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() =>
              Alert.alert(
                'Lupa Password',
                'Fitur ini belum tersedia pada versi UTS.'
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
    fontSize: 30,
    fontWeight: '800',
    color: '#5B3925',
    letterSpacing: 0.5,
  },
  tagline: {
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
    fontSize: 25,
    fontWeight: '800',
    color: '#3D2A1F',
  },
  subtitle: {
    fontSize: 14,
    color: '#8A817A',
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 14,
    color: '#3D2A1F',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  errorText: {
    color: '#D93025',
    fontSize: 12,
    marginTop: 6,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  roleOption: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8DED4',
    borderRadius: 12,
    backgroundColor: '#FFFCF9',
  },
  roleOptionActive: {
    backgroundColor: '#8B5E3C',
    borderColor: '#8B5E3C',
  },
  roleText: {
    color: '#8B5E3C',
    fontSize: 14,
    fontWeight: '700',
  },
  roleTextActive: { color: '#FFFFFF' },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 14,
    marginBottom: 22,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 12,
    color: '#8A817A',
  },
  footerBrand: {
    fontSize: 12,
    color: '#B2A397',
    marginTop: 5,
  },
});