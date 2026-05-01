-- ============================================================
-- Alert Crawl State Table
-- Tracks incremental crawl state for real-time monitoring
-- ============================================================

CREATE TABLE IF NOT EXISTS public.alert_crawl_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name text UNIQUE NOT NULL,
  last_crawl_at timestamptz DEFAULT now(),
  items_found integer DEFAULT 0,
  avg_delay_seconds integer DEFAULT 0,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_crawl_state_source 
  ON public.alert_crawl_state(source_name);

-- Add time tracking columns to alerts table (if not exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'source_id') THEN
    ALTER TABLE public.alerts ADD COLUMN source_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'source_url') THEN
    ALTER TABLE public.alerts ADD COLUMN source_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'source_published_at') THEN
    ALTER TABLE public.alerts ADD COLUMN source_published_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'detected_at') THEN
    ALTER TABLE public.alerts ADD COLUMN detected_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'detection_delay_seconds') THEN
    ALTER TABLE public.alerts ADD COLUMN detection_delay_seconds integer;
  END IF;
END $$;

-- Indexes for time analysis queries
CREATE INDEX IF NOT EXISTS idx_alerts_source_id ON public.alerts(source_id);
CREATE INDEX IF NOT EXISTS idx_alerts_source_published ON public.alerts(source_published_at);
CREATE INDEX IF NOT EXISTS idx_alerts_detected_at ON public.alerts(detected_at);

-- Enable RLS
ALTER TABLE public.alert_crawl_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on alert_crawl_state" 
  ON public.alert_crawl_state FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read alert_crawl_state" 
  ON public.alert_crawl_state FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Cron Job: Real-time monitor runs every 5 minutes
-- ============================================================
-- SELECT cron.schedule(
--   'realtime-alert-monitor',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-alert?action=realtime_monitor',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
