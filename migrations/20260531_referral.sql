-- ============================================================
-- 推荐返券系统：推荐码 / 推荐关系 / 50% 续费券（对接苹果促销优惠）
-- 规则：新人用推荐码注册成功 → 给推荐人发 1 张 50% off 续费券；
--       券有效期 3 个月、每次只能用 1 张（不叠加）、前期不限获取次数。
-- ============================================================

-- 每个用户一个推荐码
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 推荐关系（一个被推荐人只能被推荐一次）
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (referee_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);

-- 50% off 续费券
CREATE TABLE IF NOT EXISTS public.referral_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'referral',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','used','expired')),
  earned_at  timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 months'),
  reserved_at timestamptz,
  used_at    timestamptz,
  transaction_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coupons_user_avail ON public.referral_coupons(user_id, expires_at) WHERE status = 'available';

ALTER TABLE public.referral_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_coupons ENABLE ROW LEVEL SECURITY;

-- 用户只读自己的；写操作一律走服务端(service_role 绕过 RLS) 的 SECURITY DEFINER 函数
DROP POLICY IF EXISTS "read own referral code" ON public.referral_codes;
CREATE POLICY "read own referral code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "read own referrals" ON public.referrals;
CREATE POLICY "read own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
DROP POLICY IF EXISTS "read own coupons" ON public.referral_coupons;
CREATE POLICY "read own coupons" ON public.referral_coupons FOR SELECT USING (auth.uid() = user_id);

-- ---------- 生成唯一推荐码（6 位，去除易混字符）----------
CREATE OR REPLACE FUNCTION public.gen_referral_code(uid uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing text;
  c text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  tries int := 0;
BEGIN
  SELECT code INTO existing FROM referral_codes WHERE user_id = uid;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  LOOP
    c := (SELECT string_agg(substr(alphabet, floor(random()*length(alphabet))::int + 1, 1), '')
          FROM generate_series(1,6));
    BEGIN
      INSERT INTO referral_codes(user_id, code) VALUES (uid, c);
      RETURN c;
    EXCEPTION WHEN unique_violation THEN
      tries := tries + 1;
      IF tries > 10 THEN RAISE EXCEPTION 'cannot generate referral code'; END IF;
    END;
  END LOOP;
END $$;

-- ---------- 新用户自动获得推荐码 ----------
CREATE OR REPLACE FUNCTION public.tg_profile_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invite text;
BEGIN
  PERFORM gen_referral_code(NEW.id);
  -- 注册时若填了邀请码（在 auth.users 元数据里），自动登记推荐 + 给推荐人发券
  SELECT (raw_user_meta_data->>'invite_code') INTO v_invite FROM auth.users WHERE id = NEW.id;
  IF v_invite IS NOT NULL AND length(trim(v_invite)) > 0 THEN
    PERFORM apply_referral(NEW.id, v_invite);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_profile_referral_code AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_profile_referral_code();

-- 为已存在用户补码
INSERT INTO public.referral_codes(user_id, code)
SELECT p.id, (SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random()*30)::int + 1, 1), '') FROM generate_series(1,6)) || substr(replace(p.id::text,'-',''),1,2)
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.user_id = p.id)
ON CONFLICT DO NOTHING;

-- ---------- 标记过期券 ----------
CREATE OR REPLACE FUNCTION public.expire_coupons()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.referral_coupons SET status='expired'
  WHERE status='available' AND expires_at < now();
$$;

-- ---------- 登记推荐 + 给推荐人发券（原子）----------
CREATE OR REPLACE FUNCTION public.apply_referral(p_referee uuid, p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_referrer uuid;
BEGIN
  IF p_referee IS NULL OR p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_input');
  END IF;
  IF EXISTS (SELECT 1 FROM referrals WHERE referee_id = p_referee) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;
  SELECT user_id INTO v_referrer FROM referral_codes WHERE code = upper(trim(p_code));
  IF v_referrer IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  IF v_referrer = p_referee THEN RETURN jsonb_build_object('ok', false, 'reason', 'self'); END IF;
  INSERT INTO referrals(referrer_id, referee_id, code) VALUES (v_referrer, p_referee, upper(trim(p_code)));
  -- 前期不限次：每成功推荐 1 人 = 推荐人得 1 张券
  INSERT INTO referral_coupons(user_id, source) VALUES (v_referrer, 'referral');
  RETURN jsonb_build_object('ok', true);
END $$;

-- ---------- 用券前预留一张（不叠加：一次一张）----------
CREATE OR REPLACE FUNCTION public.reserve_coupon(p_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  -- 释放 30 分钟未完成的预留 + 标记过期
  UPDATE referral_coupons SET status='available', reserved_at=NULL
    WHERE status='reserved' AND reserved_at < now() - interval '30 minutes';
  PERFORM expire_coupons();
  SELECT id INTO v_id FROM referral_coupons
    WHERE user_id = p_user AND status='available' AND expires_at > now()
    ORDER BY expires_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_id IS NULL THEN RETURN NULL; END IF;
  UPDATE referral_coupons SET status='reserved', reserved_at=now() WHERE id = v_id;
  RETURN v_id;
END $$;

-- ---------- 购买成功后核销预留的券 ----------
CREATE OR REPLACE FUNCTION public.consume_coupon(p_user uuid, p_txn text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.referral_coupons SET status='used', used_at=now(), transaction_id=p_txn
  WHERE id = (SELECT id FROM public.referral_coupons
              WHERE user_id=p_user AND status='reserved' ORDER BY reserved_at ASC LIMIT 1);
$$;
