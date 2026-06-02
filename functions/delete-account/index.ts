import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

// 苹果 App Store 指南 5.1.1(v)：提供账号创建的 App 必须支持「应用内删除账号」。
// 本函数删除该用户的全部个人数据 + 注销认证账号。
// 安全：身份一律来自 Authorization 登录令牌——用户只能删自己，绝不信任 body 里传来的 userId。
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 鉴权：必须是本人登录令牌
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const uid = user.id;

    // 1) 尽力清除该用户在各业务表的数据
    //    （service_role 绕过 RLS；某张表不存在或没有 user_id 列时忽略该表，不影响整体删除）
    const userIdTables = [
      'device_tokens', 'notifications', 'mutual_aid_responses', 'mutual_aid_subscriptions',
      'sos_records', 'rescue_pending', 'user_alert_settings', 'family_members',
      'subscription_orders', 'subscriptions', 'referral_coupons', 'invites',
      'customer_service_messages', 'customer_service_sessions',
      'simulation_trials', 'city_alert_triggers',
    ];
    for (const t of userIdTables) {
      try { await supabaseAdmin.from(t).delete().eq('user_id', uid); } catch (_) { /* 忽略不存在的表/列 */ }
    }
    // referrals 用 referrer_id / referee_id；referral_codes 主键是 user_id
    try { await supabaseAdmin.from('referrals').delete().eq('referrer_id', uid); } catch (_) { /* ignore */ }
    try { await supabaseAdmin.from('referrals').delete().eq('referee_id', uid); } catch (_) { /* ignore */ }
    try { await supabaseAdmin.from('referral_codes').delete().eq('user_id', uid); } catch (_) { /* ignore */ }
    // 资料表主键是 id（其余设了 ON DELETE CASCADE 的子表会随之清除）
    try { await supabaseAdmin.from('profiles').delete().eq('id', uid); } catch (_) { /* ignore */ }

    // 2) 注销认证账号（权威删除——登录身份彻底移除；带级联的子表随 auth.users 删除而清除）
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (delErr) {
      console.error('deleteUser failed:', delErr);
      return json({ error: 'Failed to delete auth account: ' + delErr.message }, 500);
    }

    return json({ success: true, message: 'Account and associated data deleted' });
  } catch (e: any) {
    console.error('delete-account error:', e);
    return json({ error: e?.message || 'Unknown error' }, 500);
  }
});
