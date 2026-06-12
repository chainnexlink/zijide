// 积分兑换订阅天数(合规闭环)
// 背景:Apple 内购由 Apple 收款,App 内积分无法降低 StoreKit 实付价(违反 3.1.1)。
// 因此「积分抵扣订阅费」改为「积分兑换免费订阅时长」:扣减 user_points,延长 subscriptions.expires_at。
// 安全:身份只认 Authorization 令牌(不信 body 里的 userId);扣分走 service_role 的 credit_user_points;
// 扣分后若续期失败自动退分,避免「扣了分没到账」。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 兑换档位(积分 → 天数)。500 分≈7 天,2000 分≈30 天。
const PACKAGES: Record<string, { days: number; points: number }> = {
  d7: { days: 7, points: 500 },
  d30: { days: 30, points: 2000 },
};
const VALID_PLANS = ['personal', 'family'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 鉴权:真实身份来自令牌
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const pkg = PACKAGES[body.packageId];
    const planId = VALID_PLANS.includes(body.planId) ? body.planId : 'personal';
    if (!pkg) return new Response(JSON.stringify({ error: 'Invalid packageId' }), { status: 400, headers: corsHeaders });

    // 1) 校验余额
    const { data: wallet } = await supabaseAdmin
      .from('user_points').select('balance').eq('user_id', userId).maybeSingle();
    const balance = wallet?.balance ?? 0;
    if (balance < pkg.points) {
      return new Response(JSON.stringify({ error: 'INSUFFICIENT_POINTS', balance, required: pkg.points }), { status: 400, headers: corsHeaders });
    }

    // 2) 原子扣分(负数 → spend_subscription 流水)
    const refId = `redeem_${planId}_${pkg.days}d`;
    const { error: spendErr } = await supabaseAdmin.rpc('credit_user_points', {
      p_user_id: userId, p_amount: -pkg.points, p_type: 'spend_subscription',
      p_reason: `积分兑换 ${pkg.days} 天 ${planId} 订阅`, p_reference_id: refId,
    });
    if (spendErr) {
      return new Response(JSON.stringify({ error: 'Failed to deduct points: ' + spendErr.message }), { status: 500, headers: corsHeaders });
    }

    try {
      // 3) 续期:从「当前有效到期日」或「现在」往后加天数
      const now = Date.now();
      const { data: sub } = await supabaseAdmin
        .from('subscriptions').select('*').eq('user_id', userId).eq('plan_id', planId).maybeSingle();
      const activeUntil = sub && sub.status === 'active' && sub.expires_at && new Date(sub.expires_at).getTime() > now
        ? new Date(sub.expires_at).getTime() : now;
      const newExpires = new Date(activeUntil + pkg.days * 86400000).toISOString();

      if (sub) {
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'active', expires_at: newExpires, updated_at: new Date().toISOString() })
          .eq('id', sub.id);
      } else {
        await supabaseAdmin.from('subscriptions')
          .insert({ user_id: userId, plan_id: planId, status: 'active', expires_at: newExpires });
      }

      // 4) 记一笔积分订单(便于对账)
      await supabaseAdmin.from('subscription_orders').insert({
        user_id: userId, plan_id: planId,
        original_price: 0, discount_amount: 0, final_price: 0,
        has_invite_discount: false, status: 'completed',
        payment_method: 'points', points_used: pkg.points,
        completed_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({
        success: true, planId, daysAdded: pkg.days, pointsUsed: pkg.points,
        expiresAt: newExpires, balance: balance - pkg.points,
      }), { headers: corsHeaders });
    } catch (e: any) {
      // 续期失败 → 退还已扣积分,保证用户不亏
      await supabaseAdmin.rpc('credit_user_points', {
        p_user_id: userId, p_amount: pkg.points, p_type: 'earn_admin',
        p_reason: '兑换失败自动退分', p_reference_id: refId,
      });
      return new Response(JSON.stringify({ error: 'Redeem failed, points refunded: ' + (e?.message || e) }), { status: 500, headers: corsHeaders });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
});
