import { createClient } from '@supabase/supabase-js';

// Ganti URL dan Anon Key dengan milik project Supabase Anda (bisa lewat .env EXPO_PUBLIC_* atau langsung di sini)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://fsmatvpxqtlmwwovvhkk.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_RvLQ4mnIjinskNJXjLP8OA_6_HI6G9-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

