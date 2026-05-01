-- ============================================
-- 退款表 + 订单表补充字段
-- ============================================

-- 1. 给 subscription_orders 添加连连支付相关字段
ALTER TABLE public.subscription_orders ADD COLUMN IF NOT EXISTS ll_transaction_id TEXT;
ALTER TABLE public.subscription_orders ADD COLUMN IF NOT EXISTS merchant_transaction_id TEXT;
ALTER TABLE public.subscription_orders ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE public.subscription_orders ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- 2. 放宽 subscription_orders.status 约束（添加 refunded, failed）
ALTER TABLE public.subscription_orders DROP CONSTRAINT IF EXISTS subscription_orders_status_check;
ALTER TABLE public.subscription_orders ADD CONSTRAINT subscription_orders_status_check
  CHECK (status IN ('pending', 'completed', 'cancelled', 'expired', 'refunded', 'failed'));

-- 3. 放宽 subscriptions.status 约束（添加 refunded）
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'expiring', 'inactive', 'cancelled', 'refunded'));

-- 4. 给 merchant_transaction_id 建索引（用于异步通知查找）
CREATE INDEX IF NOT EXISTS idx_orders_merchant_txn ON public.subscription_orders(merchant_transaction_id);

-- 5. 创建退款表
CREATE TABLE IF NOT EXISTS public.subscription_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.subscription_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  merchant_refund_txn_id TEXT NOT NULL,
  original_merchant_txn_id TEXT NOT NULL,
  ll_refund_txn_id TEXT,
  refund_amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ll_refund_status TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.subscription_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON public.subscription_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_merchant_txn ON public.subscription_refunds(merchant_refund_txn_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.subscription_refunds(status);

-- 6. RLS 策略
ALTER TABLE public.subscription_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可查看自己的退款" ON public.subscription_refunds;
CREATE POLICY "用户可查看自己的退款" ON public.subscription_refunds FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "系统可创建退款" ON public.subscription_refunds;
CREATE POLICY "系统可创建退款" ON public.subscription_refunds FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "系统可更新退款" ON public.subscription_refunds;
CREATE POLICY "系统可更新退款" ON public.subscription_refunds FOR UPDATE USING (true);
