-- ============================================================
-- 数据库补丁 2026-06-16
--   A) 修「后台发促销/奖励公告存不进」——announcements.type 约束错配
--   B) 给「admin_auth 迁移之后才新建的表」补管理员读写策略（否则后台读不到）
-- 在 Supabase SQL Editor 对项目 aurowjqmjofpitsmlhmg 整段粘贴运行一次即可。
-- 全部幂等（DROP IF EXISTS / 动态判存在），可重复运行。
-- 前置：已跑过 20260529_admin_auth.sql（提供 public.is_admin）与 数据库补丁_20260610.sql。
-- ============================================================

-- ---------- A) announcements.type 取值与后台/前端实际使用对齐 ----------
-- 真因：建表时 CHECK 仅允许 info/warning/critical/update，
--       但后台「公告管理」新建时默认 type='promotion'（下拉另有 reward），
--       前端公告页也按 reward/promotion/info 过滤。
--       → INSERT 违反 CHECK(23514) 被静默拒绝（saveAnnouncement 未检查 error）
--       → 后台「促销/奖励」公告永远存不进、用户端永远看不到。
-- 处理：动态删掉 announcements 上任意涉及 type 的 CHECK，再加覆盖全部取值的新约束。
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public' AND rel.relname = 'announcements'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.announcements DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_type_check
    CHECK (type IN ('info','warning','critical','update','reward','promotion'));
END $$;

-- ---------- B) 给「admin_auth 之后新建的表」补管理员（is_admin）读写策略 ----------
-- 真因：20260529_admin_auth.sql 用固定表数组附加 is_admin() 的 FOR ALL 策略，
--       但 shelter_reports / favorite_shelters / user_points / point_transactions
--       是 6/10 补丁才建的，不在数组里 → 后台（anon key + 管理员会话）读不到这些表
--       （它们的 RLS 仅放行「本人」），导致 shelter_reports 纠错反馈后台审核无法工作。
-- 处理：用与 admin_auth 完全一致的 is_admin(auth.uid()) 模式补上，仅在表存在时执行；幂等。
DO $$
DECLARE t text;
  tbls text[] := ARRAY['shelter_reports','favorite_shelters','user_points','point_transactions'];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    RAISE NOTICE 'public.is_admin() 不存在，请先运行 20260529_admin_auth.sql 再跑本节。';
  ELSE
    FOREACH t IN ARRAY tbls LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin full access '||t, t);
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
          'admin full access '||t, t
        );
      END IF;
    END LOOP;
  END IF;
END $$;
