-- ============================================================
-- 同城互助 · 防刷分加固（数据库层，绕不过去）
--
-- 背景与漏洞：
--  1) 原策略 "用户管理自己的互助订阅" 是 FOR ALL，用户可直接
--     UPDATE mutual_aid_subscriptions SET total_rewards = 任意值 —— 无限刷分。
--  2) 边缘函数写 status='completed' / completed_at，但表 CHECK 仅允许 'verified'
--     且无 completed_at 列 —— 完成流程其实会报错。
--
-- 本迁移：
--  1) 列级保护触发器：仅 service_role（边缘函数）可写 total_rewards；
--     其它角色的写入一律保持原值（INSERT 强制 0），从根上堵死直接改积分。
--  2) status CHECK 补 'completed'（兼容代码，保留 'verified'）。
--  3) 补 completed_at + 到达坐标列（arrived_latitude/longitude），供 GPS 到场核实。
--
-- 幂等，可重复执行。
-- ============================================================

-- ---------- 1) total_rewards 列级保护 ----------
CREATE OR REPLACE FUNCTION public.protect_mutual_aid_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 仅服务端（service_role，即边缘函数用 service_role key）可改积分；
  -- 任何 authenticated/anon 用户的直接写入都不得修改 total_rewards。
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.total_rewards := 0;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.total_rewards := OLD.total_rewards;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_protect_mutual_aid_rewards ON public.mutual_aid_subscriptions;
CREATE TRIGGER tg_protect_mutual_aid_rewards
  BEFORE INSERT OR UPDATE ON public.mutual_aid_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.protect_mutual_aid_rewards();

-- ---------- 2) status CHECK 补 'completed' ----------
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'public.mutual_aid_responses'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF c IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.mutual_aid_responses DROP CONSTRAINT ' || quote_ident(c);
  END IF;
  ALTER TABLE public.mutual_aid_responses
    ADD CONSTRAINT mutual_aid_responses_status_check
    CHECK (status IN ('responding','arrived','verified','completed','cancelled'));
END $$;

-- ---------- 3) 完成时间 + 到达坐标列（GPS 到场核实用）----------
ALTER TABLE public.mutual_aid_responses ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ;
ALTER TABLE public.mutual_aid_responses ADD COLUMN IF NOT EXISTS arrived_latitude  DECIMAL(10,8);
ALTER TABLE public.mutual_aid_responses ADD COLUMN IF NOT EXISTS arrived_longitude DECIMAL(11,8);
