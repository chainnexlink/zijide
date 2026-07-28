import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { safeStorage } from '../utils/safeStorage';

export const supabaseUrl = 'https://aurowjqmjofpitsmlhmg.supabase.co';
export const supabaseAnonKey = 'sb_publishable_2-04_JYuvII6o4lbECixUA_z2smDsnu';

// Custom lock that bypasses navigator.locks API to avoid StrictMode conflicts.
// Safe for Capacitor single-tab WebView (no cross-tab sync needed).
const noopLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn();
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    lock: noopLock,
    // 使用安全存储：iOS WKWebView 在隐私模式/禁存储时访问 localStorage 会抛错，
    // 若让 supabase 直接用 localStorage，getSession 会抛错导致首屏卡死/崩溃。
    storage: safeStorage,
  },
});
