import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLANS = {
  personal: {
    id: 'personal',
    name: '个人方案',
    price: 39.99,
    duration: 30,
    features: ['realtime_alerts', 'escape_route', 'sos_rescue', 'offline_map', 'auto_rescue']
  },
  family: {
    id: 'family',
    name: '家人套餐',
    price: 99.99,
    duration: 30,
    features: ['personal_all', 'family_location', 'family_sync', 'max_5_members']
  }
};

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'WAR';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateSMSCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    if (!action && req.method === 'POST') {
      try {
        const clonedBody = await req.clone().json();
        action = clonedBody.action || '';
      } catch {}
    }

    switch (action) {
      case 'send-sms-code':
        return await sendSMSCode(supabaseAdmin, req);
      case 'verify-sms-code':
        return await verifySMSCode(supabaseAdmin, req);
      case 'get-plans':
        return await getPlans(supabaseAdmin, req);
      case 'get-subscription-status':
        return await getSubscriptionStatus(supabaseAdmin, req);
      case 'check-invite-discount':
        return await checkInviteDiscount(supabaseAdmin, req);
      case 'create-guest':
        return await createGuest(supabaseAdmin, req);
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

async function sendSMSCode(supabaseAdmin: any, req: Request) {
  const { phone, countryCode = '+86' } = await req.json();

  if (!phone) {
    return new Response(JSON.stringify({ error: 'Phone number required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const fullPhone = `${countryCode}${phone}`;

  const { data: recentCodes } = await supabaseAdmin
    .from('sms_codes')
    .select('*')
    .eq('phone', fullPhone)
    .gt('created_at', new Date(Date.now() - 60000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentCodes && recentCodes.length > 0) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Please wait 60 seconds before requesting a new code',
      retryAfter: 60
    }), { headers: corsHeaders });
  }

  const code = generateSMSCode();

  await supabaseAdmin.from('sms_codes').insert({
    phone: fullPhone,
    country_code: countryCode,
    code,
    expires_at: new Date(Date.now() + 600000).toISOString()
  });

  console.log(`SMS code for ${fullPhone}: ${code}`);

  return new Response(JSON.stringify({
    success: true,
    message: 'SMS code sent',
    expiresIn: 600
  }), { headers: corsHeaders });
}

async function verifySMSCode(supabaseAdmin: any, req: Request) {
  const { phone, countryCode = '+86', code, inviteCode, deviceId } = await req.json();

  if (!phone || !code) {
    return new Response(JSON.stringify({ error: 'Phone and code required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const fullPhone = `${countryCode}${phone}`;

  const { data: smsRecord } = await supabaseAdmin
    .from('sms_codes')
    .select('*')
    .eq('phone', fullPhone)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!smsRecord) {
    return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  await supabaseAdmin
    .from('sms_codes')
    .update({ used: true })
    .eq('id', smsRecord.id);

  let { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('phone', fullPhone)
    .maybeSingle();

  const isNewUser = !existingUser;

  if (!existingUser) {
    const userInviteCode = generateInviteCode();
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      phone: fullPhone,
      phone_confirm: true,
      user_metadata: {
        phone: fullPhone,
        invite_code: userInviteCode,
        device_id: deviceId
      }
    });

    if (createError || !newUser?.user?.id) {
      return new Response(JSON.stringify({ error: createError?.message || 'Failed to create user' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    await supabaseAdmin.from('profiles').insert({
      id: newUser.user.id,
      phone: fullPhone,
      invite_code: userInviteCode,
      device_id: deviceId,
      trial_ends_at: trialEndsAt,
      is_guest: false,
      language: 'zh'
    });

    existingUser = {
      id: newUser.user.id,
      phone: fullPhone,
      invite_code: userInviteCode,
      trial_ends_at: trialEndsAt
    };

    if (inviteCode) {
      const { data: inviter } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('invite_code', inviteCode)
        .maybeSingle();

      if (inviter) {
        await supabaseAdmin.from('invites').insert({
          inviter_id: inviter.id,
          invitee_id: newUser.user.id,
          invite_code: inviteCode,
          status: 'valid',
          reward_amount: 0.5
        });
      }
    }
  } else {
    await supabaseAdmin
      .from('profiles')
      .update({ device_id: deviceId })
      .eq('id', existingUser.id);
  }

  return new Response(JSON.stringify({
    success: true,
    user: existingUser,
    isNewUser,
    trialEndsAt: existingUser.trial_ends_at
  }), { headers: corsHeaders });
}

async function getPlans(supabaseAdmin: any, req: Request) {
  return new Response(JSON.stringify({ plans: PLANS }), { headers: corsHeaders });
}

async function getSubscriptionStatus(supabaseAdmin: any, req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('trial_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription) {
    const trialEndsAt = profile?.trial_ends_at;
    const isTrialActive = trialEndsAt && new Date(trialEndsAt) > new Date();

    return new Response(JSON.stringify({
      hasSubscription: false,
      isTrialActive: !!isTrialActive,
      trialEndsAt: trialEndsAt,
      status: isTrialActive ? 'trial' : 'inactive'
    }), { headers: corsHeaders });
  }

  const daysUntilExpiry = Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilExpiry <= 7;

  let status = subscription.status;
  if (status === 'active' && isExpiringSoon) {
    status = 'expiring';
  }

  return new Response(JSON.stringify({
    hasSubscription: true,
    planId: subscription.plan_id,
    status: status,
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    isExpiringSoon: isExpiringSoon,
    expiresAt: subscription.expires_at,
    autoRenew: subscription.auto_renew
  }), { headers: corsHeaders });
}

async function checkInviteDiscount(supabaseAdmin: any, req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response(JSON.stringify({ hasDiscount: false }), { headers: corsHeaders });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);

  if (!user) {
    return new Response(JSON.stringify({ hasDiscount: false }), { headers: corsHeaders });
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { count } = await supabaseAdmin
    .from('invites')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_id', user.id)
    .gte('created_at', `${currentMonth}-01`);

  return new Response(JSON.stringify({ hasDiscount: (count || 0) >= 1 }), { headers: corsHeaders });
}

async function createGuest(supabaseAdmin: any, req: Request) {
  const { deviceId } = await req.json();

  const guestId = crypto.randomUUID();
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from('profiles').insert({
    id: guestId,
    device_id: deviceId,
    is_guest: true,
    trial_ends_at: trialEndsAt,
    language: 'zh'
  });

  return new Response(JSON.stringify({
    guestId,
    trialEndsAt,
    expiresAt: trialEndsAt
  }), { headers: corsHeaders });
}
