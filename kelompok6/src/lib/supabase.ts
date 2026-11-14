import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Ganti URL dan Anon Key dengan milik project Supabase Anda (bisa lewat .env EXPO_PUBLIC_* atau langsung di sini)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fsmatvpxqtlmwwovvhkk.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_RvLQ4mnIjinskNJXjLP8OA_6_HI6G9-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, // sesi tersimpan: tetap masuk setelah aplikasi ditutup
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // token dibaca manual di auth-context
  },
});

// Perpanjang token hanya saat aplikasi terlihat (anjuran Supabase untuk React Native)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}