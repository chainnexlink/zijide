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
('news-seed001','WarRescue 使用指南：如何在空袭预警时快速找到避难所','如何使用避难所导航和离线地图功能','<h2>快速逃生指南</h2><p>当收到红色预警时，请保持冷静，立即查看最近的避难所并选择安全评分较高的路线。</p><ol><li>保持冷静，不要慌乱</li><li>打开 WarRescue 查看最近避难所</li><li>选择 App 内安全路线并开始导航</li></ol>','guide','WarRescue Team',ARRAY['指南','安全'],'2026-04-13T01:32:51Z',127),
('news-seed002','地区风险等级与行动建议说明','了解红色、橙色和黄色预警的区别','<h2>风险等级</h2><p>红色代表立即避险；橙色代表减少外出并准备转移；黄色代表保持警惕并检查应急物资。信息应以当地官方来源为准。</p>','alert','WarRescue Safety',ARRAY['安全','预警'],'2026-04-14T01:32:51Z',342),
('news-seed003','家庭位置实时共享功能详解','在紧急情况下快速确认家人安全状态','<h2>家庭位置共享</h2><p>家庭成员可共享位置、电量、在线时间和安全状态。进入危险区或触发 SOS 时，家庭联动会同步相关信息。</p>','general','WarRescue Team',ARRAY['新功能','家庭'],'2026-04-15T01:25:00Z',89)
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,content=EXCLUDED.content,category=EXCLUDED.category,author=EXCLUDED.author,tags=EXCLUDED.tags,is_published=true,published_at=EXCLUDED.published_at;

-- In-app support requests are private to the submitting user. Staff access is
-- intentionally handled with the service role rather than a broad user policy.
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 1000),
  app_version TEXT,
  platform TEXT,
  device_model TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','resolved','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_created ON public.user_feedback(user_id, created_at DESC);
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users create own feedback" ON public.user_feedback;
CREATE POLICY "Users create own feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users read own feedback" ON public.user_feedback;
CREATE POLICY "Users read own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
