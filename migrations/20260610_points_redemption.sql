-- 「积分兑换订阅天数」闭环(合规版:不降 Apple 实付价,而是用积分换免费订阅时长)
-- 给 subscription_orders 记录本单消耗的积分,便于对账(payment_method 已是 TEXT,可直接存 'points')。
ALTER TABLE subscription_orders
  ADD COLUMN IF NOT EXISTS points_used INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN subscription_orders.points_used IS
  '本单用积分兑换的数量(积分换订阅天数)。payment_method=points 时即纯积分兑换、final_price=0。';

-- 扣分由 credit_user_points(p_amount 传负数, p_type=spend_subscription) 原子完成,
-- 该函数已在 20260610_mutual_aid_points_to_wallet.sql 定义(支持正负、仅 service_role 可调)。
