-- ============================================================
-- P4: 后台真鉴权（Supabase Auth + 角色表 + 附加 RLS）
--
-- 废弃前端写死的 admin/admin123（localStorage）。改为：
--   · admin_users 表存放“谁是管理员 + 角色”
--   · is_admin()/admin_role() 函数供 RLS 判定
--   · 给关键业务表“附加”管理员可读写策略（与现有用户自助策略 OR 叠加，绝不影响 App 端）
--
-- 安全说明：本迁移**不改动**任何表的 RLS 开关，只新增策略 —— 因此对现有访问零回归。
-- （彻底收紧“匿名可读全部”这类过宽策略，需要导出线上策略后单独审计，列为后续项。）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'viewer')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SECURITY DEFINER：以函数属主身份读取 admin_users，绕过 RLS，避免策略自引用递归
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = uid);
$$;

CREATE OR REPLACE FUNCTION public.admin_role(uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.admin_users WHERE user_id = uid;
$$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read admin_users" ON public.admin_users;
CREATE POLICY "admins read admin_users" ON public.admin_users
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "superadmin manage admin_users" ON public.admin_users;
CREATE POLICY "superadmin manage admin_users" ON public.admin_users
  FOR ALL USING (public.admin_role(auth.uid()) = 'superadmin')
  WITH CHECK (public.admin_role(auth.uid()) = 'superadmin');

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------- 给关键表附加“管理员可读写”策略（仅在该表已存在时）----------
-- 注意：只 CREATE POLICY，不动 RLS 开关 —— 对已启用 RLS 的表，管理员获得访问；
-- 对未启用 RLS 的表，策略暂不生效（保持现状），零回归。
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'profiles','sos_records','rescue_pending','mutual_aid_subscriptions','mutual_aid_responses',
    'family_groups','family_members','alerts','shelters','user_alert_settings','invites',
    'subscriptions','subscription_orders','announcements','device_tokens',
    'customer_service_sessions','customer_service_messages','city_alerts','city_alert_triggers',
    'city_alert_summaries','city_alert_reward_rules','simulation_alerts','simulation_trials',
    'rescue_organizations'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin full access '||t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
        'admin full access '||t, t
      );
    END IF;
  END LOOP;
END $$;

-- ============ 引导第一个超级管理员（部署时执行一次）============
-- 步骤：先用你的邮箱在 App 注册/登录一次（auth.users 里才有该用户），
--       然后把下面改成你的邮箱并执行：
--
-- INSERT INTO public.admin_users (user_id, email, display_name, role)
-- SELECT id, email, '超级管理员', 'superadmin' FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';
