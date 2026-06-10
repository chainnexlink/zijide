-- 介绍性优惠（Introductory Offer）审计字段
-- StoreKit 对合格新用户自动套用介绍性优惠（免费试用 / 首期折扣）。
-- 后台已能从 Apple 权威核验结果识别（offerType==1 / 旧版 is_trial_period），
-- 这里加列把它落库，便于对账与统计。纯增量、幂等。
--
-- ⚠️ 部署顺序：必须先应用本迁移，再部署更新后的 apple-iap 边缘函数
-- （函数会写入 is_intro_offer，缺列会导致插入失败）。
ALTER TABLE subscription_orders
  ADD COLUMN IF NOT EXISTS is_intro_offer BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN subscription_orders.is_intro_offer IS
  '该订单是否应用了介绍性优惠（新用户免费试用/首期折扣）。来源：Apple 验证后的 offerType==1 或旧版收据 is_trial_period。';
