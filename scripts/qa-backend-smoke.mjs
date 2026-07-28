import { createClient } from '@supabase/supabase-js';

const required = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const url = process.env.SUPABASE_URL.replace(/\/$/, '');
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `Qa!${crypto.randomUUID()}aA9`;
const createdUsers = [];
const checks = [];

function check(condition, label, detail = '') {
  if (!condition) throw new Error(`${label}${detail ? `: ${detail}` : ''}`);
  checks.push(label);
  console.log(`PASS  ${label}`);
}

async function createQaUser(index) {
  const email = `qa-${stamp}-${index}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname: `QA ${index}` },
  });
  if (error) throw error;
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: login, error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError || !login.session) throw loginError || new Error('No session returned');
  const qaUser = {
    id: data.user.id,
    email,
    token: login.session.access_token,
    client,
  };
  createdUsers.push(qaUser);
  return qaUser;
}

async function invoke(functionName, action, body, token, expectedStatuses = [200]) {
  const response = await fetch(`${url}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...body }),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${functionName}/${action} returned ${response.status}; expected ${expectedStatuses.join(
        ', ',
      )}: ${JSON.stringify(payload)}`,
    );
  }
  return { status: response.status, payload };
}

async function cleanup() {
  for (const user of createdUsers.reverse()) {
    const response = await fetch(`${url}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (response.ok) continue;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) console.error(`CLEANUP WARN ${user.id}: ${error.message}`);
  }
}

try {
  const user1 = await createQaUser(1);
  const user2 = await createQaUser(2);

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id,email')
    .in('id', [user1.id, user2.id]);
  check(!profileError && profiles?.length === 2, '注册后自动建立用户资料');

  const pushToken = `qa-device-token-${stamp}-${'x'.repeat(32)}`;
  const { error: firstTokenError } = await user1.client.rpc('register_device_token', {
    p_token: pushToken,
    p_platform: 'ios',
  });
  const { data: firstTokenOwner } = await admin
    .from('device_tokens')
    .select('user_id,enabled')
    .eq('token', pushToken)
    .single();
  check(!firstTokenError && firstTokenOwner?.user_id === user1.id && firstTokenOwner.enabled, '推送设备首次登记到当前账号');

  const { error: transferredTokenError } = await user2.client.rpc('register_device_token', {
    p_token: pushToken,
    p_platform: 'ios',
  });
  const { data: transferredToken } = await admin
    .from('device_tokens')
    .select('user_id,enabled')
    .eq('token', pushToken)
    .single();
  check(!transferredTokenError && transferredToken?.user_id === user2.id && transferredToken.enabled, '同一设备换账号时原子转移推送令牌');

  const { data: leakedToken, error: tokenRlsError } = await user1.client
    .from('device_tokens')
    .select('id')
    .eq('token', pushToken);
  check(!tokenRlsError && leakedToken?.length === 0, '旧账号无法读取已转移的推送令牌');

  const anonymousFamily = await invoke(
    'family-service',
    'get-family',
    { userId: user1.id },
    null,
    [401],
  );
  check(anonymousFamily.status === 401, '家庭接口拒绝匿名访问');

  const spoofFamily = await invoke(
    'family-service',
    'get-family',
    { userId: user2.id },
    user1.token,
    [401],
  );
  check(spoofFamily.status === 401, '家庭接口拒绝冒用其他用户身份');

  const createdFamily = await invoke(
    'family-service',
    'create-family',
    { userId: user1.id, name: 'QA Family' },
    user1.token,
  );
  const familyId = createdFamily.payload.family?.id;
  const inviteCode = createdFamily.payload.family?.invite_code;
  check(Boolean(familyId && inviteCode), '创建家庭并生成邀请码');

  const joinedFamily = await invoke(
    'family-service',
    'join-family',
    { userId: user2.id, inviteCode },
    user2.token,
  );
  check(joinedFamily.payload.family?.members?.length === 2, '第二位用户加入家庭');

  const memberSettings = await invoke(
    'family-service',
    'update-settings',
    {
      userId: user2.id,
      familyId,
      settings: { name: 'Illegal member edit' },
    },
    user2.token,
    [403],
  );
  check(memberSettings.status === 403, '普通成员不能修改家庭设置');

  const adminSettings = await invoke(
    'family-service',
    'update-settings',
    {
      userId: user1.id,
      familyId,
      settings: {
        name: 'QA Family Updated',
        location_sharing_enabled: true,
        sos_sync_enabled: true,
      },
    },
    user1.token,
  );
  check(adminSettings.payload.family?.name === 'QA Family Updated', '管理员可更新家庭设置');

  await invoke(
    'family-service',
    'update-location',
    {
      userId: user2.id,
      latitude: 40.71281,
      longitude: -74.00601,
      accuracy: 8,
      batteryLevel: 77,
      safetyStatus: 'safe',
    },
    user2.token,
  );
  const locations = await invoke(
    'family-service',
    'get-family-locations',
    { userId: user1.id },
    user1.token,
  );
  check(locations.payload.locations?.some((item) => item.userId === user2.id), '家庭位置共享闭环');

  const badSos = await invoke(
    'sos-service',
    'trigger',
    { latitude: 91, longitude: 0, triggerMethod: 'manual' },
    user1.token,
    [400],
  );
  check(badSos.status === 400, 'SOS 拒绝非法坐标');

  const sos = await invoke(
    'sos-service',
    'trigger',
    {
      latitude: 40.7128,
      longitude: -74.006,
      address: 'QA test location',
      city: 'New York',
      country: 'United States',
      triggerMethod: 'manual',
    },
    user1.token,
  );
  const sosId = sos.payload.sosId;
  check(Boolean(sosId), '创建 SOS 并进入救援队列');

  const duplicateSos = await invoke(
    'sos-service',
    'trigger',
    { latitude: 40.7128, longitude: -74.006, triggerMethod: 'manual' },
    user1.token,
  );
  check(
    duplicateSos.payload.success === false && duplicateSos.payload.sosId === sosId,
    '阻止同一用户重复创建活动 SOS',
  );

  const forbiddenCancel = await invoke(
    'sos-service',
    'cancel',
    { sosId },
    user2.token,
    [403],
  );
  check(forbiddenCancel.status === 403, '其他用户不能取消 SOS');

  const selfRespond = await invoke(
    'mutual-aid',
    'respond',
    { userId: user1.id, sosId },
    user1.token,
    [403],
  );
  check(selfRespond.status === 403, '未订阅用户不能响应 SOS');

  const subscribed = await invoke(
    'mutual-aid',
    'subscribe',
    { userId: user2.id, radiusKm: 10 },
    user2.token,
  );
  check(subscribed.payload.subscription?.is_active === true, '开通互助订阅');

  const nearby = await invoke(
    'mutual-aid',
    'get-nearby-sos',
    { userId: user2.id, latitude: 40.71281, longitude: -74.00601 },
    user2.token,
  );
  check(nearby.payload.sos?.some((item) => item.id === sosId), '附近 SOS 可见且排除本人');

  const responded = await invoke(
    'mutual-aid',
    'respond',
    { userId: user2.id, sosId },
    user2.token,
  );
  check(responded.payload.response?.status === 'responding', '互助者响应 SOS');

  const farArrival = await invoke(
    'mutual-aid',
    'arrive',
    { userId: user2.id, sosId, latitude: 41.0, longitude: -74.0 },
    user2.token,
    [400],
  );
  check(farArrival.status === 400, 'GPS 距离过远时不能伪造到场');

  const arrived = await invoke(
    'mutual-aid',
    'arrive',
    { userId: user2.id, sosId, latitude: 40.71281, longitude: -74.00601 },
    user2.token,
  );
  check(arrived.payload.response?.status === 'arrived', 'GPS 到场确认');

  const completion = await invoke(
    'mutual-aid',
    'complete',
    { userId: user2.id, sosId },
    user2.token,
  );
  check(completion.payload.confirmationRequired === true, '完成互助须由求助者确认');

  const foreignResolve = await invoke(
    'sos-service',
    'resolve',
    { sosId },
    user2.token,
    [403],
  );
  check(foreignResolve.status === 403, '互助者不能代替求助者关闭 SOS');

  const resolved = await invoke('sos-service', 'resolve', { sosId }, user1.token);
  check(resolved.payload.success === true, '求助者确认安全并关闭 SOS');

  const { data: responseRow, error: responseError } = await admin
    .from('mutual_aid_responses')
    .select('status,reward_granted_at')
    .eq('sos_id', sosId)
    .eq('responder_id', user2.id)
    .single();
  check(
    !responseError && responseRow.status === 'completed' && Boolean(responseRow.reward_granted_at),
    '互助完成状态与奖励发放闭环',
  );

  const { data: rewardRows, error: rewardError } = await admin
    .from('point_transactions')
    .select('amount,type,reference_id')
    .eq('user_id', user2.id)
    .eq('reference_id', sosId);
  check(
    !rewardError &&
      rewardRows?.some((row) => Number(row.amount) === 80 && row.type === 'earn_rescue'),
    '互助积分实际入账且可追溯',
  );

  const { data: leakedSos, error: rlsError } = await user2.client
    .from('sos_records')
    .select('id,notes')
    .eq('id', sosId);
  check(!rlsError && leakedSos?.length === 0, '数据库 RLS 阻止跨用户读取 SOS 医疗快照');

  const { error: expiredInsertError } = await admin.from('subscriptions').insert({
    user_id: user1.id,
    plan_id: 'personal',
    status: 'active',
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    auto_renew: false,
  });
  check(!expiredInsertError, '建立过期订阅回归数据');

  const subscriptionStatus = await invoke(
    'subscription',
    'get-subscription-status',
    {},
    user1.token,
  );
  check(
    subscriptionStatus.payload.hasSubscription === false && subscriptionStatus.payload.status === 'expired',
    '通用订阅接口不会把过期记录判为有效',
  );

  const appleSubscriptionStatus = await invoke(
    'apple-iap',
    'get-subscription-status',
    {},
    user1.token,
  );
  check(
    appleSubscriptionStatus.payload.hasSubscription === false && appleSubscriptionStatus.payload.status === 'expired',
    'Apple 订阅接口不会把过期记录判为有效',
  );

  const invalidRoute = await invoke(
    'route-service',
    '',
    { origin: { latitude: 999, longitude: 0 }, destination: { latitude: 0, longitude: 0 } },
    user1.token,
    [400],
  );
  check(invalidRoute.status === 400, '路线服务拒绝非法坐标');

  if (process.env.QA_TEST_ROUTE === '1') {
    const route = await invoke(
      'route-service',
      '',
      {
        origin: { latitude: 40.7128, longitude: -74.006 },
        destination: { latitude: 40.7155, longitude: -74.009 },
        mode: 'walking',
        language: 'zh-CN',
      },
      user1.token,
    );
    check(
      route.payload.success === true && route.payload.routes?.length > 0,
      'Google 路线规划与安全评分闭环',
    );
  }

  await invoke(
    'family-service',
    'transfer-admin',
    { currentAdminId: user1.id, newAdminId: user2.id, familyId },
    user1.token,
  );
  const familyAfterTransfer = await invoke(
    'family-service',
    'get-family',
    { userId: user2.id },
    user2.token,
  );
  check(
    familyAfterTransfer.payload.family?.admin_id === user2.id &&
      familyAfterTransfer.payload.family?.members?.some(
        (member) => member.user_id === user2.id && member.role === 'admin',
      ),
    '家庭管理员转移同步更新群组与成员角色',
  );

  await invoke(
    'family-service',
    'leave-family',
    { userId: user1.id, familyId },
    user1.token,
  );
  const user1Family = await invoke(
    'family-service',
    'get-family',
    { userId: user1.id },
    user1.token,
  );
  check(user1Family.payload.family === null, '成员退出家庭');

  console.log(`\nQA_BACKEND_SMOKE_OK ${checks.length} checks`);
} catch (error) {
  console.error(`\nQA_BACKEND_SMOKE_FAILED ${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
