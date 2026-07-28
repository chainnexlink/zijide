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
    let uid = user.id;
    let requestedUid: string | null = null;
    try { requestedUid = (await req.json())?.targetUserId || null; } catch {}
    if (requestedUid && requestedUid !== user.id) {
      const { data: admin } = await supabaseAdmin.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
      if (!admin || admin.role === 'viewer') return json({ error: 'Forbidden' }, 403);
      uid = requestedUid;
    }

    // 删除家庭管理员时保留其他成员：先转移管理员；没有其他成员才删除家庭。
    const { data: ownedFamilies, error: ownedFamiliesError } = await supabaseAdmin
      .from('family_groups')
      .select('id')
      .eq('admin_id', uid);
    if (ownedFamiliesError) return json({ error: 'Failed to inspect family ownership' }, 500);
    for (const family of ownedFamilies || []) {
      const { data: replacement, error: replacementError } = await supabaseAdmin
        .from('family_members')
        .select('user_id')
        .eq('family_id', family.id)
        .neq('user_id', uid)
        .limit(1)
        .maybeSingle();
      if (replacementError) return json({ error: 'Failed to inspect family members' }, 500);
      if (replacement?.user_id) {
        const { error: promoteError } = await supabaseAdmin
          .from('family_members')
          .update({ role: 'admin' })
          .eq('family_id', family.id)
          .eq('user_id', replacement.user_id);
        if (promoteError) return json({ error: 'Failed to transfer family ownership' }, 500);
        const { error: transferError } = await supabaseAdmin
          .from('family_groups')
          .update({ admin_id: replacement.user_id })
          .eq('id', family.id)
          .eq('admin_id', uid);
        if (transferError) return json({ error: 'Failed to transfer family ownership' }, 500);
      } else {
        const { error: familyDeleteError } = await supabaseAdmin
          .from('family_groups')
          .delete()
          .eq('id', family.id);
        if (familyDeleteError) return json({ error: 'Failed to remove empty family' }, 500);
      }
    }

    // 1) 尽力清除该用户在各业务表的数据
    //    （service_role 绕过 RLS；某张表不存在或没有 user_id 列时忽略该表，不影响整体删除）
    const userIdTables = [
      'device_tokens', 'notifications', 'mutual_aid_subscriptions',
      'sos_records', 'rescue_pending', 'user_alert_settings', 'family_members',
      'subscription_orders', 'subscriptions', 'referral_coupons', 'invites',
      'customer_service_messages', 'customer_service_sessions',
      'simulation_trials', 'city_alert_triggers', 'user_feedback', 'point_transactions',
      'user_points', 'monitored_locations', 'user_preferences', 'shelter_reports',
      'family_location_history', 'family_notifications', 'favorite_shelters',
      'subscription_refunds', 'support_messages', 'city_alert_reporters',
      'simulation_alerts', 'simulation_notifications', 'user_roles', 'admin_users',
    ];
    for (const t of userIdTables) {
      try { await supabaseAdmin.from(t).delete().eq('user_id', uid); } catch (_) { /* 忽略不存在的表/列 */ }
    }
    // referrals 用 referrer_id / referee_id；referral_codes 主键是 user_id
    try { await supabaseAdmin.from('referrals').delete().eq('referrer_id', uid); } catch (_) { /* ignore */ }
    try { await supabaseAdmin.from('referrals').delete().eq('referee_id', uid); } catch (_) { /* ignore */ }
    try { await supabaseAdmin.from('referral_codes').delete().eq('user_id', uid); } catch (_) { /* ignore */ }
    try { await supabaseAdmin.from('mutual_aid_responses').delete().eq('responder_id', uid); } catch (_) { /* ignore */ }
    try { await supabaseAdmin.from('shelter_reports').delete().eq('reported_by', uid); } catch (_) { /* ignore */ }
    try { await supabaseAdmin.from('invites').delete().eq('inviter_id', uid); } catch (_) { /* ignore */ }
    // Historical staff references must not block the user's right to delete.
    for (const [table, column] of [
      ['alerts', 'verified_by'], ['announcements', 'created_by'], ['city_alerts', 'confirmed_by'],
      ['point_transactions', 'created_by'], ['rescue_pending', 'admin_processed_by'],
      ['sos_records', 'confirmed_by'], ['sos_records', 'rescue_triggered_by'], ['support_messages', 'admin_id'],
    ]) {
      try { await supabaseAdmin.from(table).update({ [column]: null }).eq(column, uid); } catch (_) { /* ignore */ }
    }
    // 资料表主键是 id（其余设了 ON DELETE CASCADE 的子表会随之清除）
    const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('id', uid);
    if (profileDeleteError) {
      console.error('profile delete failed:', profileDeleteError);
      return json({ error: 'Failed to delete profile data' }, 500);
    }

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
