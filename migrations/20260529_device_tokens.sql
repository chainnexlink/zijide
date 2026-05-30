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

CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
