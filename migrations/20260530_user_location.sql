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
