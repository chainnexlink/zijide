import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aurowjqmjofpitsmlhmg.supabase.co';
// The anon key is a public client identifier (RLS still protects the data). Build
// environments can override both values without changing the application bundle.
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1cm93anFtam9mcGl0c21saG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTk3MzMsImV4cCI6MjA5Mjc5NTczM30.mYh03ZrP1vB1Gtdn2AhfWEgSnOGPGjknpKblAABf8Gw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
