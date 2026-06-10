-- 互助积分入「统一钱包」修复
--
-- 问题:此前互助救援奖励(响应/到场/完成)只累加 mutual_aid_subscriptions.total_rewards
-- (排行榜计数),从未写入统一积分钱包 user_points / 流水 point_transactions。
-- 结果:积分页 /points(读 user_points / point_transactions)永远看不到互助积分,
-- 也无法用互助积分抵扣订阅 —— 积分「发了但进不了钱包」。
--
-- 修复:提供原子入账函数 credit_user_points,边缘函数发互助奖励时同时入钱包 + 写流水
-- (type='earn_rescue')。单条 UPSERT 避免「读-改-写」竞态导致丢失更新。
-- 安全:SECURITY DEFINER 但仅授予 service_role 执行,杜绝客户端伪造刷分。

CREATE OR REPLACE FUNCTION public.credit_user_points(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reason text DEFAULT NULL,
  p_reference_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN;
  END IF;

  -- 原子 upsert 钱包余额:正数计入 total_earned，负数(消费)计入 total_spent
  INSERT INTO public.user_points (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, p_amount, GREATEST(p_amount, 0), GREATEST(-p_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_points.balance + EXCLUDED.balance,
        total_earned = public.user_points.total_earned + GREATEST(p_amount, 0),
        total_spent = public.user_points.total_spent + GREATEST(-p_amount, 0),
        updated_at = now();

  INSERT INTO public.point_transactions (user_id, amount, type, reason, reference_id)
  VALUES (p_user_id, p_amount, p_type, p_reason, p_reference_id);
END;
$$;

-- 仅服务端(边缘函数 service_role)可调用,客户端不可
REVOKE ALL ON FUNCTION public.credit_user_points(uuid, integer, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_user_points(uuid, integer, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.credit_user_points(uuid, integer, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_user_points(uuid, integer, text, text, text) TO service_role;
