-- Apple IAP 集成：添加 Apple 内购相关字段
-- 给 subscription_orders 表添加 Apple IAP 字段
ALTER TABLE subscription_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'lianlian',
  ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS apple_product_id TEXT;

-- 给 subscriptions 表添加 Apple 原始交易ID（用于匹配 Apple 通知）
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_orders_apple_txn
  ON subscription_orders(apple_transaction_id)
  WHERE apple_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_apple_orig_txn
  ON subscription_orders(apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subs_apple_orig_txn
  ON subscriptions(apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;
