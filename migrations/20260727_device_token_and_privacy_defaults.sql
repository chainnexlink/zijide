-- Push tokens belong to physical app installations and are globally unique.
-- A direct client upsert cannot transfer a token between accounts under RLS,
-- so expose one narrowly scoped authenticated operation that can do so safely.
CREATE OR REPLACE FUNCTION public.register_device_token(
  p_token text,
  p_platform text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_token IS NULL OR length(trim(p_token)) < 16 OR length(p_token) > 4096 THEN
    RAISE EXCEPTION 'Invalid push token';
  END IF;
  IF p_platform NOT IN ('ios', 'android', 'web') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;

  INSERT INTO public.device_tokens(user_id, token, platform, enabled, last_seen_at)
  VALUES (v_user, trim(p_token), p_platform, true, now())
  ON CONFLICT (token) DO UPDATE
    SET user_id = v_user,
        platform = EXCLUDED.platform,
        enabled = true,
        last_seen_at = now(),
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_device_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_device_token(text, text) TO authenticated;

-- Background location is opt-in. Existing explicit user choices are preserved;
-- only newly-created settings rows change from enabled to disabled by default.
ALTER TABLE public.user_alert_settings
  ALTER COLUMN background_monitor_enabled SET DEFAULT false;
