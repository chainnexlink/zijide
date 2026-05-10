-- ===========================================
-- City Alerts & Reporters Tables
-- ===========================================

-- city_alerts: 同城预警记录
CREATE TABLE IF NOT EXISTS public.city_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  country TEXT,
  alert_type TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'yellow',
  description TEXT,
  user_count INT NOT NULL DEFAULT 0,
  trigger_threshold INT NOT NULL DEFAULT 3,
  is_confirmed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  first_report_time TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.profiles(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  reward_granted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- city_alert_reporters: 同城预警触发者记录
CREATE TABLE IF NOT EXISTS public.city_alert_reporters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_alert_id UUID NOT NULL REFERENCES public.city_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  reported_at TIMESTAMPTZ DEFAULT now(),
  report_order INT NOT NULL DEFAULT 0,
  reward_given BOOLEAN DEFAULT false,
  reward_amount INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_city_alerts_city ON public.city_alerts(city);
CREATE INDEX IF NOT EXISTS idx_city_alerts_active ON public.city_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_city_alert_reporters_alert ON public.city_alert_reporters(city_alert_id);
CREATE INDEX IF NOT EXISTS idx_city_alert_reporters_user ON public.city_alert_reporters(user_id);

ALTER TABLE public.city_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_alert_reporters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active city alerts" ON public.city_alerts FOR SELECT USING (true);
CREATE POLICY "Admins manage city alerts" ON public.city_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read reporters" ON public.city_alert_reporters FOR SELECT USING (true);
CREATE POLICY "Admins manage reporters" ON public.city_alert_reporters FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can insert own reports" ON public.city_alert_reporters FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- ===========================================
-- Support Messages Table (Customer Service)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  admin_id UUID REFERENCES public.profiles(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_user ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_unread ON public.support_messages(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own messages" ON public.support_messages FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users send own messages" ON public.support_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND sender_role = 'user'
);
CREATE POLICY "Admins send replies" ON public.support_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  AND sender_role = 'admin'
);
CREATE POLICY "Admins update messages" ON public.support_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
