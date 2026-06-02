import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MutualAidSubscription {
  id: string;
  user_id: string;
  is_active: boolean;
  radius_km: number;
  total_rewards: number;
  subscribed_at: string;
  unsubscribed_at?: string;
}

interface MutualAidResponse {
  id: string;
  sos_id: string;
  responder_id: string;
  status: 'responding' | 'arrived' | 'completed' | 'cancelled';
  responded_at: string;
  arrived_at?: string;
  completed_at?: string;
}

interface SOSRecord {
  id: string;
  user_id: string;
  status: 'active' | 'rescued' | 'cancelled';
  latitude?: number;
  longitude?: number;
  address?: string;
  stage: number;
  created_at: string;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REWARD_POINTS = {
  response: 10,
  arrival: 20,
  completion: 50,
};

// ===== 鉴权:从 Authorization 令牌取真实身份,绝不信任 body/query 里传来的 userId（防冒名刷积分）=====
async function authPrincipal(
  supabaseAdmin: any,
  req: Request,
): Promise<{ kind: 'service' } | { kind: 'user'; userId: string } | null> {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  if (token === (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '___no_service_key___')) return { kind: 'service' };
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  return { kind: 'user', userId: user.id };
}
function unauthorized(msg = 'Unauthorized') {
  return new Response(JSON.stringify({ error: msg }), { status: 401, headers: corsHeaders });
}
// 操作者真实 userId:普通用户=令牌身份;service_role 内部调用=用传入值
function actingUserId(principal: any, fallback?: string): string | null {
  return principal.kind === 'service' ? (fallback || null) : principal.userId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    let action = url.searchParams.get('action') || '';

    // 前端通过 supabase.functions.invoke 将 action 放在 body 中
    // 仅 URL 参数为空时从 body 读取，使用 clone() 保留原始 body
    if (!action && req.method === 'POST') {
      try {
        const clonedBody = await req.clone().json();
        action = clonedBody.action || '';
      } catch {}
    }
    if (!action) action = 'subscribe';

    // 鉴权:所有接口都要求有效登录令牌（或 service_role 内部调用）
    const principal = await authPrincipal(supabaseAdmin, req);
    if (!principal) return unauthorized();

    switch (action) {
      case 'subscribe':
        return await subscribe(supabaseAdmin, req, principal);
      case 'unsubscribe':
        return await unsubscribe(supabaseAdmin, req, principal);
      case 'get-nearby-sos':
        return await getNearbySOS(supabaseAdmin, req, principal);
      case 'respond':
        return await respondToSOS(supabaseAdmin, req, principal);
      case 'arrive':
        return await markArrived(supabaseAdmin, req, principal);
      case 'complete':
        return await markCompleted(supabaseAdmin, req, principal);
      case 'cancel-response':
        return await cancelResponse(supabaseAdmin, req, principal);
      case 'get-responses':
        return await getResponses(supabaseAdmin, req, principal);
      case 'get-stats':
        return await getStats(supabaseAdmin, req, principal);
      case 'get-leaderboard':
        return await getLeaderboard(supabaseAdmin, req, principal);
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function subscribe(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const body = await req.json();
    const { radiusKm = 1 } = body;
    const userId = actingUserId(principal, body.userId);
    if (!userId) return unauthorized('no user');

    const { data: existing } = await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { data: subscription, error } = await supabaseAdmin
        .from('mutual_aid_subscriptions')
        .update({
          is_active: true,
          radius_km: radiusKm,
          unsubscribed_at: null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        subscription,
        message: 'Resubscribed to mutual aid',
      }), { headers: corsHeaders });
    }

    const { data: subscription, error } = await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .insert({
        user_id: userId,
        is_active: true,
        radius_km: radiusKm,
        total_rewards: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      subscription,
      message: 'Subscribed to mutual aid',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function unsubscribe(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const body = await req.json();
    const userId = actingUserId(principal, body.userId);
    if (!userId) return unauthorized('no user');

    const { data: subscription } = await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription) {
      return new Response(JSON.stringify({ error: 'Not subscribed' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Unsubscribed from mutual aid',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function getNearbySOS(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const url = new URL(req.url);
    const userId = actingUserId(principal, url.searchParams.get('userId') || undefined);
    if (!userId) return unauthorized('no user');
    const latitude = parseFloat(url.searchParams.get('lat') || '0');
    const longitude = parseFloat(url.searchParams.get('lng') || '0');

    const { data: subscription } = await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription || !subscription.is_active) {
      return new Response(JSON.stringify({ error: 'Not subscribed' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { data: activeSOS } = await supabaseAdmin
      .from('sos_records')
      .select('*, profiles(nickname)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const nearbySOS = (activeSOS || [])
      .filter((sos: any) => {
        if (!sos.latitude || !sos.longitude) return false;
        const distance = calculateDistance(latitude, longitude, sos.latitude, sos.longitude);
        return distance <= subscription.radius_km;
      })
      .map((sos: any) => ({
        ...sos,
        distance: calculateDistance(latitude, longitude, sos.latitude, sos.longitude),
        direction: getDirection(latitude, longitude, sos.latitude, sos.longitude),
      }))
      .sort((a: any, b: any) => a.distance - b.distance);

    const { data: myResponses } = await supabaseAdmin
      .from('mutual_aid_responses')
      .select('sos_id, status')
      .eq('responder_id', userId)
      .in('status', ['responding', 'arrived']);

    return new Response(JSON.stringify({
      success: true,
      sos: nearbySOS,
      myResponses: myResponses || [],
      radius: subscription.radius_km,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function respondToSOS(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const body = await req.json();
    const { sosId } = body;
    const userId = actingUserId(principal, body.userId);
    if (!userId) return unauthorized('no user');

    const { data: existingResponse } = await supabaseAdmin
      .from('mutual_aid_responses')
      .select('*')
      .eq('sos_id', sosId)
      .eq('responder_id', userId)
      .maybeSingle();

    if (existingResponse) {
      return new Response(JSON.stringify({ error: 'Already responding' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 只能响应仍处于 active 的求救（防止对已结束/取消的 SOS 刷“响应”分）
    const { data: sosActive } = await supabaseAdmin
      .from('sos_records')
      .select('status')
      .eq('id', sosId)
      .maybeSingle();
    if (!sosActive || sosActive.status !== 'active') {
      return new Response(JSON.stringify({ error: 'SOS is not active' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: response, error } = await supabaseAdmin
      .from('mutual_aid_responses')
      .insert({
        sos_id: sosId,
        responder_id: userId,
        status: 'responding',
      })
      .select()
      .single();

    if (error) throw error;

    await addRewardPoints(supabaseAdmin, userId, REWARD_POINTS.response);

    const { data: sos } = await supabaseAdmin
      .from('sos_records')
      .select('user_id')
      .eq('id', sosId)
      .maybeSingle();

    if (sos) {
      await supabaseAdmin.from('notifications').insert({
        user_id: sos.user_id,
        title: '🤝 Help is on the way',
        body: 'Someone is responding to your SOS',
        type: 'sos_response',
        data: { sos_id: sosId, responder_id: userId },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      response,
      pointsEarned: REWARD_POINTS.response,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function markArrived(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const body = await req.json();
    const { sosId, latitude, longitude } = body;
    const userId = actingUserId(principal, body.userId);
    if (!userId) return unauthorized('no user');

    // 必须先处于 'responding' 才能标记到达（防跳步刷分）
    const { data: existing } = await supabaseAdmin
      .from('mutual_aid_responses')
      .select('*')
      .eq('sos_id', sosId)
      .eq('responder_id', userId)
      .maybeSingle();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'No active response; respond first' }), { status: 400, headers: corsHeaders });
    }
    if (existing.status !== 'responding') {
      return new Response(JSON.stringify({ error: 'Invalid state: ' + existing.status }), { status: 400, headers: corsHeaders });
    }

    // GPS 到场核实：响应者当前坐标须在求救点 300m 内（SOS 有坐标时强制），杜绝“没到场就领到达分”
    const { data: sos } = await supabaseAdmin
      .from('sos_records')
      .select('latitude, longitude')
      .eq('id', sosId)
      .maybeSingle();
    const ARRIVAL_RADIUS_KM = 0.3;
    if (sos && sos.latitude != null && sos.longitude != null) {
      if (latitude == null || longitude == null) {
        return new Response(JSON.stringify({ error: 'Location required to verify arrival' }), { status: 400, headers: corsHeaders });
      }
      const dist = calculateDistance(latitude, longitude, sos.latitude, sos.longitude);
      if (dist > ARRIVAL_RADIUS_KM) {
        return new Response(JSON.stringify({ error: 'Too far from SOS location to mark arrival', distanceKm: Math.round(dist * 1000) / 1000 }), { status: 400, headers: corsHeaders });
      }
    }

    const { data: response, error } = await supabaseAdmin
      .from('mutual_aid_responses')
      .update({
        status: 'arrived',
        arrived_at: new Date().toISOString(),
        arrived_latitude: latitude ?? null,
        arrived_longitude: longitude ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;

    await addRewardPoints(supabaseAdmin, userId, REWARD_POINTS.arrival);

    return new Response(JSON.stringify({
      success: true,
      response,
      pointsEarned: REWARD_POINTS.arrival,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function markCompleted(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const body = await req.json();
    const { sosId } = body;
    const userId = actingUserId(principal, body.userId);
    if (!userId) return unauthorized('no user');

    // 必须先“到达”才能“完成”（防止跳过到达直接领完成分）
    const { data: existing } = await supabaseAdmin
      .from('mutual_aid_responses')
      .select('id, status')
      .eq('sos_id', sosId)
      .eq('responder_id', userId)
      .maybeSingle();
    if (!existing) {
      return new Response(JSON.stringify({ error: 'No response found' }), { status: 400, headers: corsHeaders });
    }
    if (existing.status !== 'arrived') {
      return new Response(JSON.stringify({ error: 'Must mark arrival before completion' }), { status: 400, headers: corsHeaders });
    }

    const { data: response, error } = await supabaseAdmin
      .from('mutual_aid_responses')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;

    await addRewardPoints(supabaseAdmin, userId, REWARD_POINTS.completion);

    const { data: sos } = await supabaseAdmin
      .from('sos_records')
      .select('user_id')
      .eq('id', sosId)
      .maybeSingle();

    if (sos) {
      await supabaseAdmin.from('notifications').insert({
        user_id: sos.user_id,
        title: '✅ Rescue completed',
        body: 'Your SOS has been resolved',
        type: 'sos_completed',
        data: { sos_id: sosId },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      response,
      pointsEarned: REWARD_POINTS.completion,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function cancelResponse(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const body = await req.json();
    const { sosId } = body;
    const userId = actingUserId(principal, body.userId);
    if (!userId) return unauthorized('no user');

    await supabaseAdmin
      .from('mutual_aid_responses')
      .update({ status: 'cancelled' })
      .eq('sos_id', sosId)
      .eq('responder_id', userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Response cancelled',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function getResponses(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const url = new URL(req.url);
    const userId = actingUserId(principal, url.searchParams.get('userId') || undefined);
    if (!userId) return unauthorized('no user');

    const { data: responses } = await supabaseAdmin
      .from('mutual_aid_responses')
      .select('*, sos_records(*)')
      .eq('responder_id', userId)
      .order('responded_at', { ascending: false });

    return new Response(JSON.stringify({
      success: true,
      responses: responses || [],
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function getStats(supabaseAdmin: any, req: Request, principal: any) {
  try {
    const url = new URL(req.url);
    const userId = actingUserId(principal, url.searchParams.get('userId') || undefined);
    if (!userId) return unauthorized('no user');

    const { data: subscription } = await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: responses } = await supabaseAdmin
      .from('mutual_aid_responses')
      .select('status')
      .eq('responder_id', userId);

    const stats = {
      totalResponses: responses?.length || 0,
      completed: responses?.filter((r: any) => r.status === 'completed').length || 0,
      totalPoints: subscription?.total_rewards || 0,
      isSubscribed: subscription?.is_active || false,
    };

    return new Response(JSON.stringify({
      success: true,
      stats,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function getLeaderboard(supabaseAdmin: any, req: Request, _principal: any) {
  try {
    const { data: topResponders } = await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .select('*, profiles(nickname, avatar_url)')
      .eq('is_active', true)
      .order('total_rewards', { ascending: false })
      .limit(10);

    const leaderboard = (topResponders || []).map((r: any, index: number) => ({
      rank: index + 1,
      userId: r.user_id,
      nickname: r.profiles?.nickname || 'Anonymous',
      avatar: r.profiles?.avatar_url,
      points: r.total_rewards,
    }));

    return new Response(JSON.stringify({
      success: true,
      leaderboard,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function addRewardPoints(supabaseAdmin: any, userId: string, points: number) {
  const { data: subscription } = await supabaseAdmin
    .from('mutual_aid_subscriptions')
    .select('total_rewards')
    .eq('user_id', userId)
    .maybeSingle();

  if (subscription) {
    await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .update({ total_rewards: (subscription.total_rewards || 0) + points })
      .eq('user_id', userId);
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getDirection(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((angle + 360) % 360) / 45) % 8;
  return directions[index];
}
