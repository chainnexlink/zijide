-- Settle mutual-aid completion and points in one transaction.
-- The prior Edge Function marked reward_granted_at before calling the wallet
-- RPC and passed an unsupported transaction type. A failed wallet insert then
-- looked like a successful payout and could never be retried.

CREATE OR REPLACE FUNCTION public.settle_mutual_aid_reward(
  p_response_id uuid,
  p_sos_id uuid,
  p_points integer DEFAULT 80
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.mutual_aid_responses%ROWTYPE;
BEGIN
  IF p_points <= 0 OR p_points > 1000 THEN
    RAISE EXCEPTION 'invalid reward amount';
  END IF;

  SELECT *
    INTO target
    FROM public.mutual_aid_responses
   WHERE id = p_response_id
     AND sos_id = p_sos_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mutual-aid response not found';
  END IF;
  IF target.reward_granted_at IS NOT NULL THEN
    RETURN false;
  END IF;
  IF target.status <> 'arrived' THEN
    RAISE EXCEPTION 'helper has not arrived';
  END IF;

  PERFORM public.credit_user_points(
    target.responder_id,
    p_points,
    'earn_rescue',
    '互助救援完成并经求助者确认',
    p_sos_id::text
  );

  UPDATE public.mutual_aid_responses
     SET status = 'completed',
         completed_at = now(),
         reward_granted_at = now()
   WHERE id = target.id;

  UPDATE public.mutual_aid_subscriptions
     SET total_rewards = COALESCE(total_rewards, 0) + p_points
   WHERE user_id = target.responder_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_mutual_aid_reward(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_mutual_aid_reward(uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.settle_mutual_aid_reward(uuid, uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_mutual_aid_reward(uuid, uuid, integer) TO service_role;
