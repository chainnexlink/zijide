-- ============================================================
-- Shelter AI Update Logs Table
-- Records each AI-driven shelter data update
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shelter_update_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country text NOT NULL,
  added integer DEFAULT 0,
  updated integer DEFAULT 0,
  removed integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  ai_response_summary text,
  created_at timestamptz DEFAULT now()
);

-- Index for querying recent logs
CREATE INDEX IF NOT EXISTS idx_shelter_update_logs_created 
  ON public.shelter_update_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shelter_update_logs_country 
  ON public.shelter_update_logs(country);

-- Enable RLS
ALTER TABLE public.shelter_update_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/read logs
CREATE POLICY "Service role full access on shelter_update_logs" 
  ON public.shelter_update_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can read logs
CREATE POLICY "Authenticated users can read shelter_update_logs" 
  ON public.shelter_update_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- Cron Job: Weekly shelter update (requires pg_cron extension)
-- Runs every Monday at 03:00 UTC
-- ============================================================
-- SELECT cron.schedule(
--   'weekly-shelter-ai-update',
--   '0 3 * * 1',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/shelter-ai',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{"action": "weekly_update"}'::jsonb
--   );
--   $$
-- );
