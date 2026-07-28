-- Account deletion must not be blocked by historical NO ACTION references.
-- User-owned data is removed; staff/audit attribution is anonymized.

ALTER TABLE public.city_alert_reporters
  DROP CONSTRAINT IF EXISTS city_alert_reporters_user_id_fkey,
  ADD CONSTRAINT city_alert_reporters_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.customer_service_messages
  DROP CONSTRAINT IF EXISTS customer_service_messages_user_id_fkey,
  ADD CONSTRAINT customer_service_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.customer_service_sessions
  DROP CONSTRAINT IF EXISTS customer_service_sessions_user_id_fkey,
  ADD CONSTRAINT customer_service_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.family_members
  DROP CONSTRAINT IF EXISTS family_members_user_id_fkey,
  ADD CONSTRAINT family_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_inviter_id_fkey,
  ADD CONSTRAINT invites_inviter_id_fkey
    FOREIGN KEY (inviter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.mutual_aid_responses
  DROP CONSTRAINT IF EXISTS mutual_aid_responses_responder_id_fkey,
  ADD CONSTRAINT mutual_aid_responses_responder_id_fkey
    FOREIGN KEY (responder_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.mutual_aid_subscriptions
  DROP CONSTRAINT IF EXISTS mutual_aid_subscriptions_user_id_fkey,
  ADD CONSTRAINT mutual_aid_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.rescue_pending
  DROP CONSTRAINT IF EXISTS rescue_pending_user_id_fkey,
  ADD CONSTRAINT rescue_pending_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.subscription_refunds
  DROP CONSTRAINT IF EXISTS subscription_refunds_user_id_fkey,
  ADD CONSTRAINT subscription_refunds_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_user_id_fkey,
  ADD CONSTRAINT support_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_alert_settings
  DROP CONSTRAINT IF EXISTS user_alert_settings_user_id_fkey,
  ADD CONSTRAINT user_alert_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.alerts
  DROP CONSTRAINT IF EXISTS alerts_verified_by_fkey,
  ADD CONSTRAINT alerts_verified_by_fkey
    FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_created_by_fkey,
  ADD CONSTRAINT announcements_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.city_alerts
  DROP CONSTRAINT IF EXISTS city_alerts_confirmed_by_fkey,
  ADD CONSTRAINT city_alerts_confirmed_by_fkey
    FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_created_by_fkey,
  ADD CONSTRAINT point_transactions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.rescue_pending
  DROP CONSTRAINT IF EXISTS rescue_pending_admin_processed_by_fkey,
  ADD CONSTRAINT rescue_pending_admin_processed_by_fkey
    FOREIGN KEY (admin_processed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sos_records
  DROP CONSTRAINT IF EXISTS sos_records_confirmed_by_fkey,
  ADD CONSTRAINT sos_records_confirmed_by_fkey
    FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sos_records
  DROP CONSTRAINT IF EXISTS sos_records_rescue_triggered_by_fkey,
  ADD CONSTRAINT sos_records_rescue_triggered_by_fkey
    FOREIGN KEY (rescue_triggered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_admin_id_fkey,
  ADD CONSTRAINT support_messages_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
