import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://aurowjqmjofpitsmlhmg.supabase.co';
export const supabaseAnonKey = 'sb_publishable_2-04_JYuvII6o4lbECixUA_z2smDsnu';

// Authorization comes from the signed-in user's JWT and admin_users role.
// A shared administrator secret must never be embedded in a browser bundle.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
