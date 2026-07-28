-- One Apple transaction is one financial event. Remove historical duplicate
-- rows (if any) before enforcing that invariant at the database boundary.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY apple_transaction_id
           ORDER BY completed_at DESC NULLS LAST, created_at DESC, id DESC
         ) AS row_number
  FROM public.subscription_orders
  WHERE apple_transaction_id IS NOT NULL
)
DELETE FROM public.subscription_orders orders
USING ranked
WHERE orders.id = ranked.id
  AND ranked.row_number > 1;

DROP INDEX IF EXISTS public.idx_orders_apple_txn;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_apple_txn
  ON public.subscription_orders(apple_transaction_id)
  WHERE apple_transaction_id IS NOT NULL;
