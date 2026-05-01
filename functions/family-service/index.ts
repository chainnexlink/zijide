import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  max_members: number;
  location_sharing_enabled: boolean;
  sos_sync_enabled: boolean;
  alert_sync_enabled: boolean;
  created_at: string;
}

interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: 'admin' | 'member';
  is_online: boolean;
  last_seen_at?: string;
  latitude?: number;
  longitude?: number;
}

interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    if (!action) action = 'get-family';

    switch (action) {
      case 'create-family':
        return await createFamily(supabaseAdmin, req);
      case 'join-family':
        return await joinFamily(supabaseAdmin, req);
      case 'leave-family':
        return await leaveFamily(supabaseAdmin, req);
      case 'get-family':
        return await getFamily(supabaseAdmin, req);
      case 'update-settings':
        return await updateSettings(supabaseAdmin, req);
      case 'update-location':
        return await updateLocation(supabaseAdmin, req);
      case 'get-family-locations':
        return await getFamilyLocations(supabaseAdmin, req);
      case 'remove-member':
        return await removeMember(supabaseAdmin, req);
      case 'transfer-admin':
        return await transferAdmin(supabaseAdmin, req);
      case 'sync-alert':
        return await syncAlertToFamily(supabaseAdmin, req);
      case 'sync-sos':
        return await syncSOSToFamily(supabaseAdmin, req);
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

async function createFamily(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { userId, name } = body;

    const inviteCode = generateInviteCode();

    const { data: family, error } = await supabaseAdmin
      .from('family_groups')
      .insert({
        name: name || 'My Family',
        invite_code: inviteCode,
        max_members: 6,
        location_sharing_enabled: true,
        sos_sync_enabled: true,
        alert_sync_enabled: true,
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from('family_members')
      .insert({
        user_id: userId,
        family_id: family.id,
        role: 'admin',
        is_online: true,
        last_seen_at: new Date().toISOString(),
      });

    return new Response(JSON.stringify({
      success: true,
      family: {
        ...family,
        members: [{
          user_id: userId,
          role: 'admin',
          is_online: true,
        }],
      },
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function joinFamily(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { userId, inviteCode } = body;

    const { data: family } = await supabaseAdmin
      .from('family_groups')
      .select('*')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    if (!family) {
      return new Response(JSON.stringify({ error: 'Invalid invite code' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const { data: existingMember } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .eq('family_id', family.id)
      .maybeSingle();

    if (existingMember) {
      return new Response(JSON.stringify({ error: 'Already a member' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { count } = await supabaseAdmin
      .from('family_members')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', family.id);

    if (count && count >= family.max_members) {
      return new Response(JSON.stringify({ error: 'Family is full' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from('family_members')
      .insert({
        user_id: userId,
        family_id: family.id,
        role: 'member',
        is_online: true,
        last_seen_at: new Date().toISOString(),
      });

    const { data: members } = await supabaseAdmin
      .from('family_members')
      .select('*, profiles(*)')
      .eq('family_id', family.id);

    await notifyFamilyMembers(supabaseAdmin, family.id, userId, 'new_member');

    return new Response(JSON.stringify({
      success: true,
      family: {
        ...family,
        members,
      },
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function leaveFamily(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { userId, familyId } = body;

    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .eq('family_id', familyId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: 'Not a member' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (member.role === 'admin') {
      const { data: otherMembers } = await supabaseAdmin
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .neq('user_id', userId)
        .limit(1);

      if (otherMembers && otherMembers.length > 0) {
        await supabaseAdmin
          .from('family_members')
          .update({ role: 'admin' })
          .eq('id', otherMembers[0].id);
      } else {
        await supabaseAdmin
          .from('family_groups')
          .delete()
          .eq('id', familyId);
      }
    }

    await supabaseAdmin
      .from('family_members')
      .delete()
      .eq('id', member.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Left family successfully',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function getFamily(supabaseAdmin: any, req: Request) {
  try {
    const url = new URL(req.url);
    let userId = url.searchParams.get('userId');

    // 支持从 body 读取 userId（前端通过 supabase.functions.invoke 调用时）
    if (!userId && req.method === 'POST') {
      try {
        const body = await req.json();
        userId = body.userId || null;
      } catch {}
    }

    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ family: null }), { headers: corsHeaders });
    }

    const { data: family } = await supabaseAdmin
      .from('family_groups')
      .select('*')
      .eq('id', member.family_id)
      .maybeSingle();

    if (!family) {
      return new Response(JSON.stringify({ family: null }), { headers: corsHeaders });
    }

    const { data: members } = await supabaseAdmin
      .from('family_members')
      .select('*, profiles(*)')
      .eq('family_id', member.family_id);

    return new Response(JSON.stringify({
      family: {
        ...family,
        members,
      },
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function updateSettings(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { familyId, userId, settings } = body;

    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('role')
      .eq('user_id', userId)
      .eq('family_id', familyId)
      .maybeSingle();

    if (!member || member.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admin can update settings' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { data: family, error } = await supabaseAdmin
      .from('family_groups')
      .update(settings)
      .eq('id', familyId)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      family,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function updateLocation(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { userId, latitude, longitude, accuracy } = body;

    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: 'Not in a family' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const { data: family } = await supabaseAdmin
      .from('family_groups')
      .select('location_sharing_enabled')
      .eq('id', member.family_id)
      .maybeSingle();

    if (!family?.location_sharing_enabled) {
      return new Response(JSON.stringify({ error: 'Location sharing disabled' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from('family_members')
      .update({
        latitude,
        longitude,
        last_seen_at: new Date().toISOString(),
        is_online: true,
      })
      .eq('user_id', userId);

    await supabaseAdmin
      .from('family_location_history')
      .insert({
        user_id: userId,
        family_id: member.family_id,
        latitude,
        longitude,
        accuracy,
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Location updated',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function getFamilyLocations(supabaseAdmin: any, req: Request) {
  try {
    const url = new URL(req.url);
    let userId = url.searchParams.get('userId');

    // 支持从 body 读取 userId（前端通过 supabase.functions.invoke 调用时）
    if (!userId && req.method === 'POST') {
      try {
        const body = await req.json();
        userId = body.userId || null;
      } catch {}
    }

    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ locations: [] }), { headers: corsHeaders });
    }

    const { data: family } = await supabaseAdmin
      .from('family_groups')
      .select('location_sharing_enabled')
      .eq('id', member.family_id)
      .maybeSingle();

    if (!family?.location_sharing_enabled) {
      return new Response(JSON.stringify({ error: 'Location sharing disabled' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { data: members } = await supabaseAdmin
      .from('family_members')
      .select('user_id, latitude, longitude, last_seen_at, is_online, profiles(nickname, avatar_url)')
      .eq('family_id', member.family_id)
      .neq('user_id', userId);

    const locations = (members || [])
      .filter((m: any) => m.latitude && m.longitude)
      .map((m: any) => ({
        userId: m.user_id,
        nickname: m.profiles?.nickname || 'Unknown',
        avatar: m.profiles?.avatar_url,
        latitude: m.latitude,
        longitude: m.longitude,
        lastSeen: m.last_seen_at,
        isOnline: m.is_online,
      }));

    return new Response(JSON.stringify({
      locations,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function removeMember(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { adminId, memberId, familyId } = body;

    const { data: admin } = await supabaseAdmin
      .from('family_members')
      .select('role')
      .eq('user_id', adminId)
      .eq('family_id', familyId)
      .maybeSingle();

    if (!admin || admin.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admin can remove members' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .eq('family_id', familyId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Member removed',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function transferAdmin(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { currentAdminId, newAdminId, familyId } = body;

    const { data: currentAdmin } = await supabaseAdmin
      .from('family_members')
      .select('role')
      .eq('user_id', currentAdminId)
      .eq('family_id', familyId)
      .maybeSingle();

    if (!currentAdmin || currentAdmin.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admin can transfer ownership' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin
      .from('family_members')
      .update({ role: 'member' })
      .eq('user_id', currentAdminId)
      .eq('family_id', familyId);

    await supabaseAdmin
      .from('family_members')
      .update({ role: 'admin' })
      .eq('user_id', newAdminId)
      .eq('family_id', familyId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Admin transferred',
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function syncAlertToFamily(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { userId, alertId, alertTitle, alertSeverity } = body;

    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    const { data: family } = await supabaseAdmin
      .from('family_groups')
      .select('alert_sync_enabled')
      .eq('id', member.family_id)
      .maybeSingle();

    if (!family?.alert_sync_enabled) {
      return new Response(JSON.stringify({ success: true, message: 'Alert sync disabled' }), { headers: corsHeaders });
    }

    const { data: familyMembers } = await supabaseAdmin
      .from('family_members')
      .select('user_id')
      .eq('family_id', member.family_id)
      .neq('user_id', userId);

    if (familyMembers && familyMembers.length > 0) {
      const notifications = familyMembers.map((m: any) => ({
        user_id: m.user_id,
        title: `🚨 Family Alert: ${alertTitle}`,
        body: `Alert in your family member's area`,
        type: 'family_alert',
        data: { alert_id: alertId, severity: alertSeverity },
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function syncSOSToFamily(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { userId, sosId } = body;

    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    const { data: family } = await supabaseAdmin
      .from('family_groups')
      .select('sos_sync_enabled')
      .eq('id', member.family_id)
      .maybeSingle();

    if (!family?.sos_sync_enabled) {
      return new Response(JSON.stringify({ success: true, message: 'SOS sync disabled' }), { headers: corsHeaders });
    }

    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('nickname')
      .eq('id', userId)
      .maybeSingle();

    const { data: familyMembers } = await supabaseAdmin
      .from('family_members')
      .select('user_id')
      .eq('family_id', member.family_id)
      .neq('user_id', userId);

    if (familyMembers && familyMembers.length > 0) {
      const notifications = familyMembers.map((m: any) => ({
        user_id: m.user_id,
        title: '🆘 Family SOS Alert',
        body: `${user?.nickname || 'Family member'} triggered SOS!`,
        type: 'family_sos',
        data: { sos_id: sosId },
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

async function notifyFamilyMembers(supabaseAdmin: any, familyId: string, excludeUserId: string, type: string) {
  const { data: members } = await supabaseAdmin
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId)
    .neq('user_id', excludeUserId);

  if (members && members.length > 0) {
    const messages: Record<string, { title: string; body: string }> = {
      new_member: { title: '👋 New Family Member', body: 'Someone joined your family group' },
    };

    const notifications = members.map((m: any) => ({
      user_id: m.user_id,
      title: messages[type]?.title || 'Family Update',
      body: messages[type]?.body || 'Something changed in your family',
      type: `family_${type}`,
      data: { family_id: familyId },
    }));

    await supabaseAdmin.from('notifications').insert(notifications);
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
