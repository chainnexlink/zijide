import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendSms } from '../_shared/twilio.ts';

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
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String(100000 + (value[0] % 900000));
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
      case 'verify-phone-change':
        return await verifyPhoneChange(supabaseAdmin, req);
      case 'complete-phone-profile':
        return await completePhoneProfile(supabaseAdmin, req);
      case 'get-plans':
        return await getPlans(supabaseAdmin, req);
      case 'get-subscription-status':
        return await getSubscriptionStatus(supabaseAdmin, req);
      case 'check-invite-discount':
        return await checkInviteDiscount(supabaseAdmin, req);
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
  const { phone, countryCode = '+86', purpose } = await req.json();
  const normalizedCountryCode = `+${String(countryCode).replace(/\D/g, '')}`;
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  const fullPhone = `${normalizedCountryCode}${normalizedPhone}`;
  if (!/^\+\d{7,15}$/.test(fullPhone)) {
    return new Response(JSON.stringify({ error: 'Valid international phone number required' }), { status: 400, headers: corsHeaders });
  }
  if (!['login', 'register', 'change-phone'].includes(String(purpose || ''))) {
    return new Response(JSON.stringify({ error: 'SMS purpose must be login, register, or change-phone' }), { status: 400, headers: corsHeaders });
  }

  if (purpose === 'change-phone') {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
  } else {
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', fullPhone)
      .maybeSingle();
    if (purpose === 'login' && !existingProfile) {
      return new Response(JSON.stringify({ error: 'Phone account not found; register first' }), { status: 404, headers: corsHeaders });
    }
    if (purpose === 'register' && existingProfile) {
      return new Response(JSON.stringify({ error: 'Phone number already registered; sign in instead' }), { status: 409, headers: corsHeaders });
    }
  }

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

  const { data: insertedCode, error: insertError } = await supabaseAdmin.from('sms_codes').insert({
    phone: fullPhone,
    country_code: normalizedCountryCode,
    code,
    purpose,
    attempt_count: 0,
    expires_at: new Date(Date.now() + 600000).toISOString()
  }).select('id').single();
  if (insertError) return new Response(JSON.stringify({ error: 'Unable to create verification code' }), { status: 500, headers: corsHeaders });

  // 真发短信。此前只入库+打日志——用户永远收不到码，注册/登录闭环从这里就断了。
  // 验证码不进日志（OTP 属敏感信息）。
  const sms = await sendSms(fullPhone, `【WarRescue】验证码 ${code}，10分钟内有效。Your verification code is ${code}, valid for 10 minutes.`);
  if (!sms.ok) {
    if (insertedCode?.id) await supabaseAdmin.from('sms_codes').delete().eq('id', insertedCode.id);
    console.error(`SMS send to ${fullPhone.slice(0, 6)}**** failed:`, sms.error);
    return new Response(JSON.stringify({
      success: false,
      error: sms.skipped ? 'SMS service not configured' : 'SMS send failed, please try again later',
    }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'SMS code sent',
    expiresIn: 600
  }), { headers: corsHeaders });
}

async function verifySMSCode(supabaseAdmin: any, req: Request) {
  const { phone, countryCode = '+86', code, inviteCode, deviceId, purpose } = await req.json();
  const normalizedCountryCode = `+${String(countryCode).replace(/\D/g, '')}`;
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  const fullPhone = `${normalizedCountryCode}${normalizedPhone}`;
  if (!/^\+\d{7,15}$/.test(fullPhone) || !/^\d{6}$/.test(String(code || ''))) {
    return new Response(JSON.stringify({ error: 'Phone and 6-digit code required' }), { status: 400, headers: corsHeaders });
  }
  if (!['login', 'register'].includes(String(purpose || ''))) {
    return new Response(JSON.stringify({ error: 'SMS purpose must be login or register' }), { status: 400, headers: corsHeaders });
  }

  const { data: latestCode } = await supabaseAdmin
    .from('sms_codes')
    .select('*')
    .eq('phone', fullPhone)
    .eq('purpose', purpose)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestCode || latestCode.attempt_count >= 5 || latestCode.code !== String(code)) {
    if (latestCode) await supabaseAdmin.from('sms_codes').update({ attempt_count: Number(latestCode.attempt_count || 0) + 1 }).eq('id', latestCode.id);
    return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  await supabaseAdmin
    .from('sms_codes')
    .delete()
    .eq('id', latestCode.id);

  let { data: existingUser } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('phone', fullPhone)
    .maybeSingle();

  if (purpose === 'login' && !existingUser) {
    return new Response(JSON.stringify({ error: 'Phone account not found; register first' }), { status: 404, headers: corsHeaders });
  }
  if (purpose === 'register' && existingUser) {
    return new Response(JSON.stringify({ error: 'Phone number already registered; sign in instead' }), { status: 409, headers: corsHeaders });
  }

  const isNewUser = purpose === 'register';

  // 手机验证码验证成功后，用不发送邮件的 magic-link token 建立 Supabase
  // 会话。它不会轮换或覆盖用户设置的密码。
  const authEmail = `p${fullPhone.replace(/\D/g, '')}@phone.warrescue.app`;
  let authUserId = existingUser?.id || null;

  if (!existingUser) {
    const userInviteCode = generateInviteCode();
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      phone: fullPhone,
      phone_confirm: true,
      email: authEmail,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID().slice(0, 8),
      user_metadata: {
        phone: fullPhone,
        invite_code: inviteCode || undefined,
        device_id: deviceId
      }
    });

    if (createError || !newUser?.user?.id) {
      return new Response(JSON.stringify({ error: createError?.message || 'Failed to create user' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    authUserId = newUser.user.id;

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

  } else {
    await supabaseAdmin
      .from('profiles')
      .update({ device_id: deviceId })
      .eq('id', existingUser.id);

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingUser.id);
    const hasRealEmail = !!authUser?.user?.email && !authUser.user.email.endsWith('@phone.warrescue.app');
    if (hasRealEmail) {
      return new Response(JSON.stringify({ error: 'This phone is linked to an email account; use email login' }), { status: 409, headers: corsHeaders });
    }
  }

  if (!authUserId) return new Response(JSON.stringify({ error: 'Unable to resolve phone account' }), { status: 500, headers: corsHeaders });
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: authEmail });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error('Phone session link failed:', linkError?.message);
    return new Response(JSON.stringify({ error: 'Unable to create verified session' }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    success: true,
    user: existingUser,
    isNewUser,
    trialEndsAt: existingUser.trial_ends_at,
    auth: { tokenHash, type: 'magiclink' }
  }), { headers: corsHeaders });
}

async function verifyPhoneChange(supabaseAdmin: any, req: Request) {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  const { phone, code } = await req.json();
  const fullPhone = `+${String(phone || '').replace(/\D/g, '')}`;
  if (!/^\+\d{7,15}$/.test(fullPhone) || !/^\d{6}$/.test(String(code || ''))) {
    return new Response(JSON.stringify({ error: 'Phone and 6-digit code required' }), { status: 400, headers: corsHeaders });
  }
  const { data: latestCode } = await supabaseAdmin.from('sms_codes').select('*').eq('phone', fullPhone).eq('purpose', 'change-phone')
    .eq('used', false).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!latestCode || latestCode.attempt_count >= 5 || latestCode.code !== String(code)) {
    if (latestCode) await supabaseAdmin.from('sms_codes').update({ attempt_count: Number(latestCode.attempt_count || 0) + 1 }).eq('id', latestCode.id);
    return new Response(JSON.stringify({ error: 'Invalid or expired code' }), { status: 400, headers: corsHeaders });
  }
  const { data: owner } = await supabaseAdmin.from('profiles').select('id').eq('phone', fullPhone).neq('id', user.id).maybeSingle();
  if (owner) return new Response(JSON.stringify({ error: 'Phone number is already in use' }), { status: 409, headers: corsHeaders });
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { phone: fullPhone, phone_confirm: true });
  if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: corsHeaders });
  const { error: profileError } = await supabaseAdmin.from('profiles').update({ phone: fullPhone }).eq('id', user.id);
  if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: corsHeaders });
  await supabaseAdmin.from('sms_codes').delete().eq('id', latestCode.id);
  return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

async function completePhoneProfile(supabaseAdmin: any, req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user?.id || !user.phone) {
    return new Response(JSON.stringify({ error: 'Verified phone session required' }), { status: 401, headers: corsHeaders });
  }

  const { inviteCode, deviceId } = await req.json();
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id,invite_code,trial_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  let profile = existingProfile;
  if (!profile) {
    const userInviteCode = generateInviteCode();
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inserted, error: insertError } = await supabaseAdmin.from('profiles').insert({
      id: user.id,
      phone: user.phone,
      invite_code: userInviteCode,
      device_id: deviceId,
      trial_ends_at: trialEndsAt,
      is_guest: false,
      language: 'zh',
    }).select('id,invite_code,trial_ends_at').single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders });
    }
    profile = inserted;

  } else {
    await supabaseAdmin.from('profiles').update({ phone: user.phone, device_id: deviceId }).eq('id', user.id);
  }

  if (inviteCode) await supabaseAdmin.rpc('apply_referral', { p_referee: user.id, p_code: inviteCode });

  return new Response(JSON.stringify({ success: true, profile }), { headers: corsHeaders });
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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('trial_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (profileError || subscriptionError) {
    return new Response(JSON.stringify({ error: 'Subscription status unavailable' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

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

  const expiryMs = new Date(subscription.expires_at).getTime();
  const daysUntilExpiry = Math.ceil((expiryMs - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = !Number.isFinite(expiryMs) || expiryMs <= Date.now() || ['expired', 'refunded', 'revoked'].includes(subscription.status);
  const isExpiringSoon = !isExpired && daysUntilExpiry <= 7;

  let status = subscription.status;
  if (isExpired) {
    status = 'expired';
    if (subscription.status !== 'expired') {
      await supabaseAdmin.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', subscription.id);
    }
  } else if (status === 'active' && isExpiringSoon) {
    status = 'expiring';
  }

  return new Response(JSON.stringify({
    hasSubscription: !isExpired,
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
