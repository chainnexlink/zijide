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
