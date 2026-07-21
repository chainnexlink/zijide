-- Native App parity fields and user-owned preferences.
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS min_severity text DEFAULT 'yellow' CHECK (min_severity IN ('yellow','orange','red'));
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS email_enabled boolean DEFAULT false;
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false;
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS critical_alerts_enabled boolean DEFAULT true;
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS precise_location_enabled boolean DEFAULT true;
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS background_monitor_enabled boolean DEFAULT true;
ALTER TABLE public.user_alert_settings ADD COLUMN IF NOT EXISTS dnd_repeat text DEFAULT 'daily';

ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS battery_level integer CHECK (battery_level BETWEEN 0 AND 100);
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS safety_status text DEFAULT 'unknown' CHECK (safety_status IN ('safe','attention','danger','unknown'));

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  map_type text NOT NULL DEFAULT 'standard' CHECK (map_type IN ('standard','satellite','hybrid','terrain')),
  route_preference text NOT NULL DEFAULT 'safest' CHECK (route_preference IN ('fastest','safest','shortest')),
  avoid_highways boolean NOT NULL DEFAULT false,
  avoid_tolls boolean NOT NULL DEFAULT false,
  avoid_ferries boolean NOT NULL DEFAULT false,
  distance_unit text NOT NULL DEFAULT 'km' CHECK (distance_unit IN ('km','mi')),
  show_danger_zones boolean NOT NULL DEFAULT true,
  show_shelters boolean NOT NULL DEFAULT true,
  show_routes boolean NOT NULL DEFAULT true,
  recent_cities jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own preferences" ON public.user_preferences;
CREATE POLICY "users manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public avatars; users can only write inside their own folder.
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "users upload own avatars" ON storage.objects;
CREATE POLICY "users upload own avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "users update own avatars" ON storage.objects;
CREATE POLICY "users update own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "public reads avatars" ON storage.objects;
CREATE POLICY "public reads avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
