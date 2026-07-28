-- Logic-closure hardening: verified alert publication, SOS escalation,
-- mutual-aid settlement, admin RBAC, and missing operational policies.

-- Email ownership must be verified by Supabase Auth. This legacy trigger
-- silently marked every new email as confirmed and suppressed verification mail.
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_email();

-- Referral/coupon routines run only from trusted triggers or the apple-iap Edge
-- Function (service_role). Client execution with an arbitrary user UUID would
-- allow referral fraud and coupon tampering.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    to_regprocedure('public.gen_referral_code(uuid)'),
    to_regprocedure('public.apply_referral(uuid,text)'),
    to_regprocedure('public.reserve_coupon(uuid)'),
    to_regprocedure('public.consume_coupon(uuid,text)'),
    to_regprocedure('public.expire_coupons()')
  ] LOOP
    IF fn IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;
ALTER TABLE public.sms_codes ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
DROP POLICY IF EXISTS "Alerts readable by all" ON public.alerts;
DROP POLICY IF EXISTS "Users read verified alerts" ON public.alerts;
CREATE POLICY "Users read verified alerts" ON public.alerts FOR SELECT USING (is_verified=true OR public.is_admin(auth.uid()));

-- Remove legacy permissive policies that exposed private user data.
DROP POLICY IF EXISTS "Public profiles readable" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id::text=auth.uid()::text);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id::text=auth.uid()::text);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id::text=auth.uid()::text) WITH CHECK (id::text=auth.uid()::text);

DROP POLICY IF EXISTS "App users create SOS" ON public.sos_records;
DROP POLICY IF EXISTS "App users read SOS" ON public.sos_records;
DROP POLICY IF EXISTS "App users update SOS" ON public.sos_records;
DROP POLICY IF EXISTS "Users read own SOS" ON public.sos_records;
CREATE POLICY "Users read own SOS" ON public.sos_records FOR SELECT TO authenticated USING (user_id::text=auth.uid()::text);

DROP POLICY IF EXISTS "App users read points" ON public.user_points;
DROP POLICY IF EXISTS "Users read own points" ON public.user_points;
CREATE POLICY "Users read own points" ON public.user_points FOR SELECT TO authenticated USING (user_id::text=auth.uid()::text);
DROP POLICY IF EXISTS "App users read transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users read own point transactions" ON public.point_transactions;
CREATE POLICY "Users read own point transactions" ON public.point_transactions FOR SELECT TO authenticated USING (user_id::text=auth.uid()::text);

DROP POLICY IF EXISTS "App users create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "App users read subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "App users update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (user_id::text=auth.uid()::text);
DROP POLICY IF EXISTS "App users create orders" ON public.subscription_orders;
DROP POLICY IF EXISTS "App users read own orders" ON public.subscription_orders;
DROP POLICY IF EXISTS "Users read own subscription orders" ON public.subscription_orders;
CREATE POLICY "Users read own subscription orders" ON public.subscription_orders FOR SELECT TO authenticated USING (user_id::text=auth.uid()::text);

DROP FUNCTION IF EXISTS public.shares_family_with(uuid,uuid);
CREATE OR REPLACE FUNCTION public.shares_family_with(uid uuid, other_uid text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT uid::text=other_uid OR EXISTS(
    SELECT 1 FROM public.family_members mine JOIN public.family_members other ON mine.family_id=other.family_id
    WHERE mine.user_id::text=uid::text AND other.user_id::text=other_uid
  );
$$;
DROP POLICY IF EXISTS "Family members public read" ON public.family_members;
DROP POLICY IF EXISTS "Users read own family members" ON public.family_members;
CREATE POLICY "Users read own family members" ON public.family_members FOR SELECT TO authenticated
  USING (public.shares_family_with(auth.uid(),user_id::text));

DROP POLICY IF EXISTS "App users create triggers" ON public.city_alert_triggers;
DROP POLICY IF EXISTS "App users read triggers" ON public.city_alert_triggers;
CREATE POLICY "Users read own city triggers" ON public.city_alert_triggers FOR SELECT TO authenticated USING(user_id::text=auth.uid()::text);
DROP POLICY IF EXISTS "City alert reporters readable" ON public.city_alert_reporters;
CREATE POLICY "Users read own city reports" ON public.city_alert_reporters FOR SELECT TO authenticated USING(user_id::text=auth.uid()::text);

DROP POLICY IF EXISTS "App users create sim alerts" ON public.simulation_alerts;
DROP POLICY IF EXISTS "App users read sim alerts" ON public.simulation_alerts;
CREATE POLICY "Users read own simulation alerts" ON public.simulation_alerts FOR SELECT TO authenticated USING(user_id::text=auth.uid()::text);
DROP POLICY IF EXISTS "App users create trials" ON public.simulation_trials;
DROP POLICY IF EXISTS "App users read trials" ON public.simulation_trials;
CREATE POLICY "Users read own simulation trials" ON public.simulation_trials FOR SELECT TO authenticated USING(user_id::text=auth.uid()::text);

-- Deprecated mutual-aid prototype tables are not part of the native product.
-- Keep data for forensics but remove every anonymous policy and client grant.
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['mutual_aid_events','mutual_aid_skills','mutual_aid_messages','mutual_aid_reviews','mutual_aid_event_responses','mutual_aid_settings'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',p.policyname,t);
      END LOOP;
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    END IF;
  END LOOP;
END $$;
ALTER TABLE public.mutual_aid_responses ADD COLUMN IF NOT EXISTS completion_requested_at timestamptz;
ALTER TABLE public.mutual_aid_responses ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.mutual_aid_responses ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.mutual_aid_responses ADD COLUMN IF NOT EXISTS reward_granted_at timestamptz;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted';
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS responded_by uuid;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rescue_organizations' AND column_name='services' AND data_type='text') THEN
    ALTER TABLE public.rescue_organizations ALTER COLUMN services TYPE text[] USING
      CASE WHEN services IS NULL OR btrim(services)='' THEN ARRAY[]::text[]
           WHEN services ~ '^\{.*\}$' THEN string_to_array(trim(both '{}' from services), ',')
           ELSE ARRAY[services] END;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid, action text NOT NULL,
  entity_type text NOT NULL, entity_id text, reason text, details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mutual_aid_responses DROP CONSTRAINT IF EXISTS mutual_aid_responses_status_check;
ALTER TABLE public.mutual_aid_responses ADD CONSTRAINT mutual_aid_responses_status_check
  CHECK (status IN ('responding','arrived','completed','verified','cancelled'));

ALTER TABLE public.rescue_pending DROP CONSTRAINT IF EXISTS rescue_pending_status_check;
ALTER TABLE public.rescue_pending ADD CONSTRAINT rescue_pending_status_check
  CHECK (status IN ('pending','processing','urgent','approved','dismissed','completed','timeout'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_rescue_pending_sos_unique ON public.rescue_pending(sos_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mutual_response_user_sos_unique
  ON public.mutual_aid_responses(sos_id,responder_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_sos_per_user
  ON public.sos_records(user_id) WHERE status='active';

-- Viewer is truly read-only. Admin and superadmin may mutate business data.
CREATE OR REPLACE FUNCTION public.can_admin_write(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role IN ('admin','superadmin') FROM public.admin_users WHERE user_id = uid), false);
$$;
DROP POLICY IF EXISTS "admins read audit logs" ON public.admin_audit_logs;
CREATE POLICY "admins read audit logs" ON public.admin_audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admins create audit logs" ON public.admin_audit_logs;
CREATE POLICY "admins create audit logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.can_admin_write(auth.uid()) AND admin_id=auth.uid());
CREATE OR REPLACE FUNCTION public.admin_adjust_points(p_user_id uuid, p_amount integer, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.can_admin_write(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_amount=0 OR length(trim(COALESCE(p_reason,'')))<3 THEN RAISE EXCEPTION 'amount and reason required'; END IF;
  PERFORM public.credit_user_points(p_user_id,p_amount,'admin_adjustment',p_reason,NULL);
  INSERT INTO public.admin_audit_logs(admin_id,action,entity_type,entity_id,reason,details)
  VALUES(auth.uid(),'adjust_points','user',p_user_id::text,p_reason,jsonb_build_object('amount',p_amount));
END $$;
REVOKE ALL ON FUNCTION public.admin_adjust_points(uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_points(uuid,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reply_feedback(p_feedback_id uuid, p_reply text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_user uuid;
BEGIN
  IF NOT public.can_admin_write(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(trim(COALESCE(p_reply,'')))<2 THEN RAISE EXCEPTION 'reply required'; END IF;
  UPDATE public.user_feedback SET status='resolved',admin_reply=trim(p_reply),responded_at=now(),responded_by=auth.uid(),updated_at=now()
    WHERE id=p_feedback_id RETURNING user_id INTO target_user;
  IF target_user IS NULL THEN RAISE EXCEPTION 'feedback not found'; END IF;
  INSERT INTO public.notifications(user_id,title,body,type,data)
    VALUES(target_user,'客服已回复',trim(p_reply),'feedback_reply',jsonb_build_object('feedback_id',p_feedback_id));
  INSERT INTO public.admin_audit_logs(admin_id,action,entity_type,entity_id,reason)
    VALUES(auth.uid(),'reply_feedback','user_feedback',p_feedback_id::text,trim(p_reply));
END $$;
REVOKE ALL ON FUNCTION public.admin_reply_feedback(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reply_feedback(uuid,text) TO authenticated;

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'profiles','sos_records','rescue_pending','mutual_aid_subscriptions','mutual_aid_responses',
    'family_groups','family_members','alerts','shelters','shelter_reports','user_alert_settings',
    'monitored_locations','user_preferences','invites','referrals','referral_codes','referral_coupons',
    'subscriptions','subscription_orders','subscription_refunds','announcements','safety_news',
    'device_tokens','notifications','user_feedback','user_points','point_transactions',
    'customer_service_sessions','customer_service_messages','city_alerts','city_alert_triggers',
    'city_alert_summaries','city_alert_reward_rules','simulation_alerts','simulation_trials',
    'rescue_organizations','favorite_shelters','shelter_update_logs','simulation_notifications',
    'sms_codes','support_messages','user_roles','alert_crawl_state','subscription_plans',
    'family_notifications','family_location_history','city_alert_reporters'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin full access '||t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin read '||t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin write '||t, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_admin(auth.uid()))', 'admin read '||t, t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.can_admin_write(auth.uid())) WITH CHECK (public.can_admin_write(auth.uid()))', 'admin write '||t, t);
    END IF;
  END LOOP;
END $$;

-- Remove the legacy browser-supplied administrator key path. A static secret
-- embedded in the admin bundle cannot be trusted. The JWT/admin_users policies
-- created above remain in force.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE (
        COALESCE(qual, '') ILIKE '%is_admin_request%'
        OR COALESCE(with_check, '') ILIKE '%is_admin_request%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.is_admin_request();

-- Replace the stale shelter policy that referenced the non-existent user_roles table.
DROP POLICY IF EXISTS "Admins manage shelter reports" ON public.shelter_reports;
DROP POLICY IF EXISTS "Admin manages shelter reports" ON public.shelter_reports;
DROP POLICY IF EXISTS "Admin reads shelter reports" ON public.shelter_reports;
DROP POLICY IF EXISTS "Admin writes shelter reports" ON public.shelter_reports;
CREATE POLICY "Admin reads shelter reports" ON public.shelter_reports FOR SELECT
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin writes shelter reports" ON public.shelter_reports FOR ALL
  USING (public.can_admin_write(auth.uid())) WITH CHECK (public.can_admin_write(auth.uid()));

-- Escalate an active SOS every 30 minutes, up to stage 3. The Edge Function
-- performs SMS/voice notification and updates the rescue queue.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron/pg_net unavailable; SOS escalation schedule skipped: %', SQLERRM;
    RETURN;
  END;
  IF nullif(current_setting('app.settings.functions_url', true),'') IS NULL
     OR nullif(current_setting('app.settings.cron_secret', true),'') IS NULL THEN
    RAISE NOTICE 'SOS escalation schedule skipped until functions_url and cron_secret settings are configured';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='sos-auto-escalation') THEN
    PERFORM cron.unschedule('sos-auto-escalation');
  END IF;
  PERFORM cron.schedule('sos-auto-escalation', '* * * * *', $job$
    SELECT net.http_post(
      url := current_setting('app.settings.functions_url', true) || '/sos-service',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',current_setting('app.settings.cron_secret', true)),
      body := jsonb_build_object('action','escalate','sosId',id)
    )
    FROM public.sos_records
    WHERE status='active' AND stage < 3
      AND COALESCE(stage_started_at, created_at) <= now() - interval '30 minutes';
  $job$);
END $$;
