import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabaseUrl = 'https://aurowjqmjofpitsmlhmg.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1cm93anFtam9mcGl0c21saG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTk3MzMsImV4cCI6MjA5Mjc5NTczM30.mYh03ZrP1vB1Gtdn2AhfWEgSnOGPGjknpKblAABf8Gw';

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
  },
});
