import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SOSRecord {
  id: string;
  user_id: string;
  trigger_method: 'manual' | 'voice' | 'shake' | 'auto';
  status: 'active' | 'rescued' | 'cancelled';
  stage: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  created_at: string;
  resolved_at?: string;
}

interface FamilyMember {
  user_id: string;
  family_id: string;
  role: string;
}

interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, any>;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEOO_AI_BASE_URL = 'https://api.meoo.host';
const MEOO_PROJECT_SERVICE_AK = Deno.env.get('MEOO_PROJECT_API_KEY') || '';

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
    if (!action) action = 'trigger';

    switch (action) {
      case 'trigger':
        return await triggerSOS(supabaseAdmin, req);
      case 'cancel':
        return await cancelSOS(supabaseAdmin, req);
      case 'resolve':
        return await resolveSOS(supabaseAdmin, req);
      case 'escalate':
        return await escalateSOS(supabaseAdmin, req);
      case 'notify-family':
        return await notifyFamilyEndpoint(supabaseAdmin, req);
      case 'notify-rescuers':
        return await notifyRescuersEndpoint(supabaseAdmin, req);
      case 'get-nearby':
        return await getNearbySOS(supabaseAdmin, req);
      case 'analyze-situation':
        return await analyzeSituation(supabaseAdmin, req);
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

async function triggerSOS(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { userId, triggerMethod, latitude, longitude, address } = body;

    const { data: existingSOS } = await supabaseAdmin
      .from('sos_records')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSOS) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Active SOS already exists',
        sosId: existingSOS.id,
      }), { headers: corsHeaders });
    }

    const { data: sos, error } = await supabaseAdmin
      .from('sos_records')
      .insert({
        user_id: userId,
        trigger_method: triggerMethod || 'manual',
        status: 'active',
        stage: 1,
        latitude,
        longitude,
        address,
      })
      .select()
      .single();

    if (error) throw error;

    await notifyFamilyInternal(supabaseAdmin, userId, sos.id);
    await notifyRescuersInternal(supabaseAdmin, sos.id, latitude, longitude);

    // 先查询用户所属的家庭组
    const { data: memberData } = await supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    let familySettings: any = null;
    if (memberData?.family_id) {
      const { data } = await supabaseAdmin
        .from('family_groups')
        .select('sos_sync_enabled')
        .eq('id', memberData.family_id)
        .maybeSingle();
      familySettings = data;
    }

    if (familySettings?.sos_sync_enabled) {
      await broadcastToFamily(supabaseAdmin, userId, sos.id);
    }

    return new Response(JSON.stringify({
      success: true,
      sosId: sos.id,
      stage: 1,
      message: 'SOS triggered successfully',
      timestamp: new Date().toISOString(),
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function cancelSOS(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { sosId, userId } = body;

    const { data: sos } = await supabaseAdmin
      .from('sos_records')
      .select('*')
      .eq('id', sosId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!sos) {
      return new Response(JSON.stringify({ error: 'SOS not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (sos.status !== 'active') {
      return new Response(JSON.stringify({ error: 'SOS is not active, cannot cancel' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from('sos_records')
      .update({ status: 'cancelled' })
      .eq('id', sosId);

    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'SOS Cancelled',
        body: 'Your SOS alert has been cancelled.',
        type: 'sos_cancelled',
        data: { sos_id: sosId },
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'SOS cancelled successfully',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function resolveSOS(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { sosId, resolverId } = body;

    const { data: sos } = await supabaseAdmin
      .from('sos_records')
      .select('*')
      .eq('id', sosId)
      .maybeSingle();

    if (!sos) {
      return new Response(JSON.stringify({ error: 'SOS not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from('sos_records')
      .update({
        status: 'rescued',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', sosId);

    await supabaseAdmin
      .from('mutual_aid_responses')
      .update({ status: 'completed' })
      .eq('sos_id', sosId);

    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: sos.user_id,
        title: 'SOS Resolved',
        body: 'Your SOS alert has been resolved. You are safe now.',
        type: 'sos_resolved',
        data: { sos_id: sosId },
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'SOS resolved successfully',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function escalateSOS(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { sosId } = body;

    const { data: sos } = await supabaseAdmin
      .from('sos_records')
      .select('*')
      .eq('id', sosId)
      .maybeSingle();

    if (!sos) {
      return new Response(JSON.stringify({ error: 'SOS not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (sos.status !== 'active') {
      return new Response(JSON.stringify({ error: 'SOS is not active, cannot escalate' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const newStage = Math.min(sos.stage + 1, 3);

    await supabaseAdmin
      .from('sos_records')
      .update({ stage: newStage })
      .eq('id', sosId);

    const stageMessages: Record<number, string> = {
      2: 'SOS escalated to Stage 2: Emergency services notified',
      3: 'SOS escalated to Stage 3: All available resources mobilized',
    };

    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: sos.user_id,
        title: 'SOS Escalated',
        body: stageMessages[newStage],
        type: 'sos_escalated',
        data: { sos_id: sosId, stage: newStage },
      });

    return new Response(JSON.stringify({
      success: true,
      stage: newStage,
      message: stageMessages[newStage],
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function notifyFamilyEndpoint(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { userId, sosId } = body;
    return await notifyFamilyInternal(supabaseAdmin, userId, sosId);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function notifyRescuersEndpoint(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { sosId, latitude, longitude } = body;
    return await notifyRescuersInternal(supabaseAdmin, sosId, latitude, longitude);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function notifyFamilyInternal(supabaseAdmin: any, userId: string, sosId: string) {
  try {
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('nickname')
      .eq('id', userId)
      .maybeSingle();

    const { data: familyMember } = await supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!familyMember) {
      return new Response(JSON.stringify({ message: 'No family group found' }), {
        headers: corsHeaders,
      });
    }

    const { data: familyMembers } = await supabaseAdmin
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyMember.family_id)
      .neq('user_id', userId);

    if (familyMembers && familyMembers.length > 0) {
      const notifications = familyMembers.map((member: any) => ({
        user_id: member.user_id,
        title: '🚨 Family SOS Alert',
        body: `${user?.nickname || 'Family member'} has triggered an SOS!`,
        type: 'family_sos',
        data: { sos_id: sosId, triggered_by: userId },
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return new Response(JSON.stringify({
      success: true,
      notified: familyMembers?.length || 0,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function notifyRescuersInternal(supabaseAdmin: any, sosId: string, latitude?: number, longitude?: number) {
  try {

    const { data: subscribers } = await supabaseAdmin
      .from('mutual_aid_subscriptions')
      .select('user_id')
      .eq('is_active', true);

    if (subscribers && subscribers.length > 0) {
      const notifications = subscribers.map((sub: any) => ({
        user_id: sub.user_id,
        title: '🆘 Nearby SOS Alert',
        body: 'Someone nearby needs help. Can you respond?',
        type: 'mutual_aid_sos',
        data: { sos_id: sosId, latitude, longitude },
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return new Response(JSON.stringify({
      success: true,
      notified: subscribers?.length || 0,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function getNearbySOS(supabaseAdmin: any, req: Request) {
  try {
    const url = new URL(req.url);
    const latitude = parseFloat(url.searchParams.get('lat') || '0');
    const longitude = parseFloat(url.searchParams.get('lng') || '0');
    const radius = parseFloat(url.searchParams.get('radius') || '1');

    const { data: activeSOS } = await supabaseAdmin
      .from('sos_records')
      .select('*, profiles(nickname)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const nearbySOS = (activeSOS || [])
      .filter((sos: any) => {
        if (!sos.latitude || !sos.longitude) return false;
        const distance = calculateDistance(latitude, longitude, sos.latitude, sos.longitude);
        return distance <= radius;
      })
      .map((sos: any) => ({
        ...sos,
        distance: calculateDistance(latitude, longitude, sos.latitude, sos.longitude),
      }))
      .sort((a: any, b: any) => a.distance - b.distance);

    return new Response(JSON.stringify({
      success: true,
      count: nearbySOS.length,
      sos: nearbySOS,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function analyzeSituation(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { sosId } = body;

    const { data: sos } = await supabaseAdmin
      .from('sos_records')
      .select('*')
      .eq('id', sosId)
      .maybeSingle();

    if (!sos) {
      return new Response(JSON.stringify({ error: 'SOS not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const { data: nearbyAlerts } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    const prompt = `Analyze this emergency situation:
    - SOS triggered at: ${sos.address || 'Unknown location'}
    - Coordinates: ${sos.latitude}, ${sos.longitude}
    - Stage: ${sos.stage}
    - Nearby active alerts: ${nearbyAlerts?.length || 0}
    
    Provide recommendations for:
    1. Immediate actions
    2. Safety precautions
    3. Resource allocation
    Return as JSON with: immediate_actions (array), safety_precautions (array), priority_level (string).`;

    const response = await fetch(
      `${MEOO_AI_BASE_URL}/meoo-ai/compatible-mode/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MEOO_PROJECT_SERVICE_AK}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-vl-plus',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content || '';
      
      try {
        const result = JSON.parse(analysis);
        return new Response(JSON.stringify({
          success: true,
          analysis: result,
          timestamp: new Date().toISOString(),
        }), { headers: corsHeaders });
      } catch {
        return new Response(JSON.stringify({
          success: true,
          analysis: { raw: analysis },
          timestamp: new Date().toISOString(),
        }), { headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
      status: 500,
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function broadcastToFamily(supabaseAdmin: any, userId: string, sosId: string) {
  const { data: familyMember } = await supabaseAdmin
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (familyMember) {
    await supabaseAdmin
      .from('family_notifications')
      .insert({
        family_id: familyMember.family_id,
        type: 'sos',
        sos_id: sosId,
        message: 'Family member triggered SOS',
      });
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
