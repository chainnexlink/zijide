-- ============================================================
-- QA 修复（2026-06-02）：两处"列/约束缺失"导致的静默失败
-- 只需在 Supabase SQL Editor 跑一次；不需要重新部署任何边缘函数。
-- 背景（QA 排查发现）：
--  1) sos-service / mutual-aid 代码读写 mutual_aid_subscriptions.radius_km，
--     但该表从未有过 radius_km 列。sos-service 通知附近救援者时执行
--     .select('user_id, radius_km') 会直接报 "column does not exist" → 查询返回空
--     → 触发 SOS 后“附近互助者”根本收不到通知/推送。
--  2) apple-iap 处理苹果订阅通知时写 status = 'expired' / 'billing_issue' / 'revoked'，
--     但 subscriptions.status 的 CHECK 不含这三个值 → EXPIRED / DID_FAIL_TO_RENEW / REVOKE
--     这几类通知的状态更新被 CHECK 拒绝 → 订阅生命周期状态不准。
-- ============================================================

-- 1) 给互助订阅表补 radius_km（默认 5km，与 sos-service 现有回退值一致；
--    前端 subscribe 未写该列时即取默认值，行为不变）
ALTER TABLE public.mutual_aid_subscriptions
  ADD COLUMN IF NOT EXISTS radius_km INTEGER DEFAULT 5;

-- 2) 放宽订阅状态 CHECK，纳入苹果服务器通知会写入的三个状态
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'active', 'expiring', 'inactive', 'cancelled', 'refunded',  -- 原有
    'expired', 'billing_issue', 'revoked'                       -- 新增：对应 EXPIRED / 续费失败 / REVOKE
  ));
