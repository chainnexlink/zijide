-- ============================================================
-- 数据库补丁 2026-06-10(闭环修复)
-- 在 Supabase SQL Editor 对项目 aurowjqmjofpitsmlhmg 整段粘贴运行一次即可。
-- 全部幂等(IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS),可重复运行。
-- 跑完后重新部署边缘函数:mutual-aid、apple-iap、redeem-points。
-- ============================================================

-- ---------- 1) 积分钱包表(此前漏进一键部署脚本 → 互助积分进不了钱包的真因) ----------
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earn_rescue','earn_alert','earn_referral','earn_admin','spend_subscription','spend_other')),
  reason text,
  reference_id text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at DESC);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
CREATE POLICY "Users can view own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
CREATE POLICY "Users can view own transactions" ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);

-- ---------- 2) 原子入账/扣分函数(仅 service_role 可调) ----------
CREATE OR REPLACE FUNCTION public.credit_user_points(
  p_user_id uuid, p_amount integer, p_type text,
  p_reason text DEFAULT NULL, p_reference_id text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN RETURN; END IF;
  INSERT INTO public.user_points (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, p_amount, GREATEST(p_amount, 0), GREATEST(-p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_points.balance + EXCLUDED.balance,
        total_earned = public.user_points.total_earned + GREATEST(p_amount, 0),
        total_spent = public.user_points.total_spent + GREATEST(-p_amount, 0),
        updated_at = now();
  INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id)
  VALUES (p_user_id, p_amount, p_type, p_reason, p_reference_id);
END; $$;
REVOKE ALL ON FUNCTION public.credit_user_points(uuid,integer,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_user_points(uuid,integer,text,text,text) TO service_role;

-- ---------- 3) subscription_orders 审计列 ----------
ALTER TABLE subscription_orders ADD COLUMN IF NOT EXISTS is_intro_offer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE subscription_orders ADD COLUMN IF NOT EXISTS points_used INTEGER NOT NULL DEFAULT 0;

-- ---------- 4) 家庭组成员写权限(修「家庭组建不起来」) ----------
DROP POLICY IF EXISTS "成员加入家庭" ON public.family_members;
CREATE POLICY "成员加入家庭" ON public.family_members FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "成员退出或管理员移除" ON public.family_members;
CREATE POLICY "成员退出或管理员移除" ON public.family_members FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.family_groups g WHERE g.id = family_members.family_id AND g.admin_id = auth.uid())
);
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- ---------- 5) 收藏避难所表(修「收藏不保存」) ----------
CREATE TABLE IF NOT EXISTS public.favorite_shelters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shelter_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, shelter_id)
);
CREATE INDEX IF NOT EXISTS idx_favorite_shelters_user ON public.favorite_shelters(user_id);
ALTER TABLE public.favorite_shelters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "用户管理自己的收藏" ON public.favorite_shelters;
CREATE POLICY "用户管理自己的收藏" ON public.favorite_shelters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- 6) 避难所纠错表(修「纠错反馈静默丢失」) ----------
CREATE TABLE IF NOT EXISTS public.shelter_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shelter_id text,
  shelter_name text,
  reason text NOT NULL,
  reported_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shelter_reports_status ON public.shelter_reports(status);
ALTER TABLE public.shelter_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "用户提交纠错" ON public.shelter_reports;
CREATE POLICY "用户提交纠错" ON public.shelter_reports FOR INSERT WITH CHECK (reported_by = auth.uid());
DROP POLICY IF EXISTS "用户查看自己的纠错" ON public.shelter_reports;
CREATE POLICY "用户查看自己的纠错" ON public.shelter_reports FOR SELECT USING (reported_by = auth.uid());

-- ---------- 7) 客服会话/消息写权限(实测发现:登录用户发起客服会话被 403,联系客服闭环全断) ----------
ALTER TABLE public.customer_service_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_service_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "用户创建客服会话" ON public.customer_service_sessions;
CREATE POLICY "用户创建客服会话" ON public.customer_service_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "用户查看自己的客服会话" ON public.customer_service_sessions;
CREATE POLICY "用户查看自己的客服会话" ON public.customer_service_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "用户更新自己的客服会话" ON public.customer_service_sessions;
CREATE POLICY "用户更新自己的客服会话" ON public.customer_service_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "用户发送客服消息" ON public.customer_service_messages;
CREATE POLICY "用户发送客服消息" ON public.customer_service_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND sender_type = 'user');
DROP POLICY IF EXISTS "用户查看自己的客服消息" ON public.customer_service_messages;
CREATE POLICY "用户查看自己的客服消息" ON public.customer_service_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());
