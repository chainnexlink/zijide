-- Atomic family lifecycle and stricter one-active-SOS invariant.
DROP INDEX IF EXISTS public.idx_one_active_sos_per_user;
CREATE UNIQUE INDEX idx_one_active_sos_per_user
  ON public.sos_records(user_id) WHERE status IN ('active', 'escalated');

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_family_per_user
  ON public.family_members(user_id);

CREATE OR REPLACE FUNCTION public.create_family_secure(
  p_user uuid,
  p_name text,
  p_invite text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_family uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id=p_user) THEN
    RAISE EXCEPTION 'Already belongs to a family';
  END IF;
  INSERT INTO family_groups(name, invite_code, admin_id, max_members, location_sharing_enabled, sos_sync_enabled, alert_sync_enabled)
  VALUES (left(coalesce(nullif(trim(p_name),''),'My Family'),50), upper(trim(p_invite)), p_user, 6, true, true, true)
  RETURNING id INTO v_family;
  INSERT INTO family_members(user_id,family_id,role,is_online,last_seen_at)
  VALUES (p_user,v_family,'admin',true,now());
  RETURN v_family;
END $$;

CREATE OR REPLACE FUNCTION public.join_family_secure(
  p_user uuid,
  p_invite text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_family family_groups%ROWTYPE; v_count integer;
BEGIN
  IF EXISTS (SELECT 1 FROM family_members WHERE user_id=p_user) THEN
    RAISE EXCEPTION 'Already belongs to a family';
  END IF;
  SELECT * INTO v_family FROM family_groups WHERE invite_code=upper(trim(p_invite)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  SELECT count(*) INTO v_count FROM family_members WHERE family_id=v_family.id;
  IF v_count >= v_family.max_members THEN RAISE EXCEPTION 'Family is full'; END IF;
  INSERT INTO family_members(user_id,family_id,role,is_online,last_seen_at)
  VALUES (p_user,v_family.id,'member',true,now());
  RETURN v_family.id;
END $$;

REVOKE ALL ON FUNCTION public.create_family_secure(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_family_secure(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_family_secure(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.join_family_secure(uuid,text) TO service_role;
