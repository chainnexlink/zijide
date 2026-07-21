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

-- Mutual-aid points wallet and immutable ledger used by the native points screen.
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created ON public.point_transactions(user_id, created_at DESC);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own points" ON public.user_points;
CREATE POLICY "Users can read own points" ON public.user_points FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can read own point ledger" ON public.point_transactions;
CREATE POLICY "Users can read own point ledger" ON public.point_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.monitored_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_km INTEGER NOT NULL DEFAULT 30 CHECK (radius_km BETWEEN 5 AND 100),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monitored_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own monitored locations" ON public.monitored_locations;
CREATE POLICY "Users manage own monitored locations" ON public.monitored_locations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.safety_news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  author TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.safety_news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads published safety news" ON public.safety_news;
CREATE POLICY "Public reads published safety news" ON public.safety_news FOR SELECT USING (is_published = true);
INSERT INTO public.safety_news (id,title,summary,content,category,author,tags,published_at,view_count) VALUES
('news-seed001','WarRescue ????????????????????','????????????????','<h2>??????</h2><p>??????????????????????????????????????</p><ol><li>?????????</li><li>?? WarRescue ???????</li><li>?? App ??????????</li></ol>','guide','WarRescue Team',ARRAY['??','??'],'2026-04-13T01:32:51Z',127),
('news-seed002','?????????????','???????????????','<h2>????</h2><p>????????????????????????????????????????????????????</p>','alert','WarRescue Safety',ARRAY['??','??'],'2026-04-14T01:32:51Z',342),
('news-seed003','????????????','????????????????','<h2>??????</h2><p>??????????????????????????????? SOS ??????????????</p>','general','WarRescue Team',ARRAY['???','??'],'2026-04-15T01:25:00Z',89)
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,content=EXCLUDED.content,category=EXCLUDED.category,author=EXCLUDED.author,tags=EXCLUDED.tags,is_published=true,published_at=EXCLUDED.published_at;
