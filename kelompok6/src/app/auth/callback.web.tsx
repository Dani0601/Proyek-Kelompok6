import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

/**
 * Alamat balik login Google khusus WEB.
 * Di browser, login berjalan di jendela popup. Setelah Google dan Supabase mengembalikan
 * token di URL, halaman ini dimuat di popup itu. maybeCompleteAuthSession() mengirim URL
 * tersebut ke jendela utama (yang sedang menunggu di auth-context) lalu menutup popup.
 */
export default function AuthCallbackWeb() {
  const router = useRouter();

  useEffect(() => {
    const hasil = WebBrowser.maybeCompleteAuthSession();

    // Kalau halaman ini terbuka bukan sebagai popup (mis. popup diblokir lalu dialihkan
    // di tab yang sama), tidak ada jendela utama yang menunggu: kembali ke beranda.
    const timer = setTimeout(() => {
      if (hasil.type !== 'success' || !window.opener) router.replace('/');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#8B5E3C" />
      <Text style={styles.text}>Menyelesaikan login...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFF7ED',
  },
  text: {
    fontSize: 14,
    color: '#8A817A',
  },
});