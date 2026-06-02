-- ============================================================
-- 创建缺失的核心表（QA 2026-06-02 发现：代码在写、但从未建表 → insert 一直静默失败）
--  · notifications            —— 6 个边缘函数写站内通知（SOS各阶段/家人/互助/预警）
--  · family_notifications     —— sos-service broadcastToFamily 写
--  · family_location_history  —— family-service 写
-- 在 Supabase SQL Editor 跑一次即可。边缘函数用 service_role 写入会绕过 RLS。
-- 依赖已存在对象：profiles(id)、family_groups(id)、is_admin(uuid)。
-- ============================================================

-- ---------- 1) 站内通知（核心；前端通知面板将来可直接读这张表）----------
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text,
  type        text,
  data        jsonb DEFAULT '{}'::jsonb,
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  read_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own notifications"   ON public.notifications;
CREATE POLICY "read own notifications"   ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "update own notifications" ON public.notifications;
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete own notifications" ON public.notifications;
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admin full access notifications" ON public.notifications;
CREATE POLICY "admin full access notifications" ON public.notifications FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- 2) 家庭通知（低频；当前前端不读，先建表止血 + 管理员可见）----------
CREATE TABLE IF NOT EXISTS public.family_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  type        text,
  sos_id      uuid,
  message     text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.family_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin full access family_notifications" ON public.family_notifications;
CREATE POLICY "admin full access family_notifications" ON public.family_notifications FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- 3) 家庭位置历史（family-service 写；当前前端不读）----------
CREATE TABLE IF NOT EXISTS public.family_location_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id   uuid REFERENCES public.family_groups(id) ON DELETE CASCADE,
  latitude    double precision,
  longitude   double precision,
  accuracy    double precision,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_family_loc_hist_family_time
  ON public.family_location_history(family_id, created_at DESC);
ALTER TABLE public.family_location_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin full access family_location_history" ON public.family_location_history;
CREATE POLICY "admin full access family_location_history" ON public.family_location_history FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
