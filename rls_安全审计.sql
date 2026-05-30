-- ============================================================
-- RLS 安全审计（只读，安全运行）
--
-- 用途：导出线上真实的 RLS 状态与策略，据此再写精确的“收紧”迁移。
-- 为什么不直接盲写收紧迁移：看不到现有策略就改 RLS，很可能弄坏线上 App
-- （把用户正常读取的表锁死，或漏掉某张过宽的表）。所以先审计、后收紧。
--
-- 做法：在 Supabase → SQL Editor 执行下面三段，把结果发我，我写出针对性的收紧迁移。
-- ============================================================

-- 1) 哪些 public 表“未启用 RLS”（rls_enabled=false 的最危险：任何持 anon key 者可读写）
SELECT n.nspname AS schema, c.relname AS "table", c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relrowsecurity ASC, c.relname;

-- 2) 所有 RLS 策略（重点看 qual = 'true'，或 roles 含 {anon}/{public} 的“过宽”策略）
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3) 直接授予 anon / authenticated 的表级权限（GRANT 层面，RLS 之外的另一道口子）
SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- ============================================================
-- 判读重点（这些表不应对 anon 公开“读/写”，发现就需收紧）：
--   profiles, subscriptions, subscription_orders, sos_records,
--   user_alert_settings, device_tokens, invites, admin_users,
--   customer_service_messages, customer_service_sessions, family_members
-- 可接受“公开读”的（信息本就公开）：alerts, shelters, announcements
-- 写操作一律只应允许：本人(auth.uid()=user_id) 或 管理员(public.is_admin(auth.uid()))。
-- ============================================================
