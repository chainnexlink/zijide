-- WarRescue 数据库一键部署 v2（修复版，幂等，可重复粘贴运行）
-- 含 updated_at 触发器函数 + 4 个迁移；跑完见《上架傻瓜手册.md》引导超管

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- P1: 真实预警管线修复 + 定时采集
--
-- 目的：
--  1) 补齐 alerts 表中云函数真正需要、但核心表缺失的列（confidence / verification_*）
--     —— 历史上云函数一直在写 is_active/expires_at/confidence 等不存在的列，导致插入失败。
--  2) 统一“活跃预警 = end_time IS NULL”的判定（与前端 Dashboard 的查询一致），
--     不再使用 is_active；过期由 ai-alert?action=process 写 end_time 实现。
--  3) 按 source_id 建唯一索引，杜绝重复采集。
--  4) 用 pg_cron + pg_net 启用定时真实采集（原迁移里这段是注释掉的）。
--
-- 本文件可重复执行（幂等）。
-- ============================================================

-- ---------- 1. 补齐 alerts 列 ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='confidence') THEN
    ALTER TABLE public.alerts ADD COLUMN confidence NUMERIC(4,3) DEFAULT 0.700;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='verification_confidence') THEN
    ALTER TABLE public.alerts ADD COLUMN verification_confidence NUMERIC(4,3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='verification_notes') THEN
    ALTER TABLE public.alerts ADD COLUMN verification_notes TEXT;
  END IF;
  -- 以下列本应由 20260426_alert_realtime_monitor.sql 添加；此处兜底，防止该迁移未执行
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='source_id') THEN
    ALTER TABLE public.alerts ADD COLUMN source_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='source_url') THEN
    ALTER TABLE public.alerts ADD COLUMN source_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='source_published_at') THEN
    ALTER TABLE public.alerts ADD COLUMN source_published_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='detected_at') THEN
    ALTER TABLE public.alerts ADD COLUMN detected_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alerts' AND column_name='detection_delay_seconds') THEN
    ALTER TABLE public.alerts ADD COLUMN detection_delay_seconds INTEGER;
  END IF;
END $$;

-- ---------- 2. 索引 ----------
-- 活跃预警查询（end_time IS NULL）
CREATE INDEX IF NOT EXISTS idx_alerts_active ON public.alerts(end_time) WHERE end_time IS NULL;
-- 去重：同一 source_id 只保留一条
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_source_id_uniq ON public.alerts(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);

-- ---------- 3. 定时采集（pg_cron + pg_net）----------
-- 一次性设置（请在 Supabase SQL Editor 执行一次，把 <...> 换成真实值；不要把密钥提交进仓库）：
--   alter database postgres set app.settings.functions_url = 'https://<PROJECT_REF>.supabase.co/functions/v1';
--   alter database postgres set app.settings.cron_secret   = '<与 ai-alert 的 CRON_SECRET 环境变量一致的随机串>';
--
-- 说明：cron 通过 x-cron-secret 头携带密钥，避免把 service_role key 写进 cron 配置；
--       其强制校验将随 P4（后台鉴权加固）一并启用，当前 ai-alert 暂未强制（与其它函数现状一致）。
DO $$
BEGIN
  -- 扩展可能在本地/受限环境不可用，失败则跳过（不影响其余迁移）
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron/pg_net 不可用，已跳过定时任务创建：%', SQLERRM;
    RETURN;
  END;

  -- 实时监控：每 2 分钟增量采集真实数据源
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='alert-realtime-monitor') THEN
    PERFORM cron.unschedule('alert-realtime-monitor');
  END IF;
  PERFORM cron.schedule('alert-realtime-monitor', '*/2 * * * *', $job$
    SELECT net.http_post(
      url := current_setting('app.settings.functions_url', true) || '/ai-alert?action=realtime_monitor',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.settings.cron_secret', true)),
      body := '{}'::jsonb
    );
  $job$);

  -- 过期处理：每 5 分钟把超时预警的 end_time 置为当前时间（变为非活跃）
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='alert-process-expired') THEN
    PERFORM cron.unschedule('alert-process-expired');
  END IF;
  PERFORM cron.schedule('alert-process-expired', '*/5 * * * *', $job$
    SELECT net.http_post(
      url := current_setting('app.settings.functions_url', true) || '/ai-alert?action=process',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.settings.cron_secret', true)),
      body := '{}'::jsonb
    );
  $job$);

  -- 清理：每天删除 7 天前的非活跃预警
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='alert-cleanup') THEN
    PERFORM cron.unschedule('alert-cleanup');
  END IF;
  PERFORM cron.schedule('alert-cleanup', '17 3 * * *', $job$
    SELECT net.http_post(
      url := current_setting('app.settings.functions_url', true) || '/ai-alert?action=cleanup',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', current_setting('app.settings.cron_secret', true)),
      body := '{}'::jsonb
    );
  $job$);
END $$;
-- ============================================================
-- P2: 设备推送 Token 表
-- 保存每台设备的 APNs(iOS) / FCM(Android) token，供 push-dispatch 云函数下发推送。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  enabled boolean DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id) WHERE enabled;
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON public.device_tokens(platform) WHERE enabled;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- 用户只能读写自己的设备 token
DROP POLICY IF EXISTS "用户管理自己的设备token" ON public.device_tokens;
CREATE POLICY "用户管理自己的设备token" ON public.device_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- push-dispatch 云函数用 service_role 读取全部 token（service_role 默认绕过 RLS，无需额外策略）

DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON public.device_tokens;
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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
-- ============================================================
-- P5/QA#1：用户最近位置（用于按距离过滤预警/SOS 推送）
--
-- 问题：此前预警推给所有开推送的用户、SOS 推给所有互助订阅者，不分地理位置。
-- 方案：在 user_alert_settings 存用户最近坐标；客户端上报；服务端按
--       距离 ≤ monitor_radius_km 过滤预警；SOS 按距事发点 ≤5km 过滤互助者。
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_alert_settings' AND column_name='last_latitude') THEN
    ALTER TABLE public.user_alert_settings ADD COLUMN last_latitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_alert_settings' AND column_name='last_longitude') THEN
    ALTER TABLE public.user_alert_settings ADD COLUMN last_longitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_alert_settings' AND column_name='location_updated_at') THEN
    ALTER TABLE public.user_alert_settings ADD COLUMN location_updated_at timestamptz;
  END IF;
END $$;

-- 加速“开推送 + 有坐标”的候选筛选
CREATE INDEX IF NOT EXISTS idx_user_alert_settings_geo
  ON public.user_alert_settings(last_latitude, last_longitude) WHERE push_enabled;
