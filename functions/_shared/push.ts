/**
 * 共享推送下发模块（被 ai-alert / sos-service / push-dispatch 复用）
 *
 * - iOS：APNs（用 .p8 私钥签 ES256 JWT，HTTP/2 直连 api.push.apple.com）
 * - Android：FCM HTTP v1（用服务账号私钥换取 OAuth2 access token）
 *
 * 所有密钥从环境变量读取；缺失则对应平台**安全跳过**（不报成功、不抛异常）。
 * 需要的环境变量（在 Supabase Edge Function Secrets 配置）：
 *   APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY(.p8 全文), APNS_BUNDLE_ID, [APNS_USE_SANDBOX=true]
 *   FCM_SERVICE_ACCOUNT(服务账号 JSON 全文), [FCM_PROJECT_ID]
 */

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  severity?: 'red' | 'orange' | 'yellow';
}

// ---------- 编码助手 ----------
function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64url(s: string): string {
  return b64urlFromBytes(new TextEncoder().encode(s));
}
function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ---------- APNs ----------
let apnsJwtCache: { token: string; iat: number } | null = null;

async function getApnsJwt(): Promise<string | null> {
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const p8 = Deno.env.get('APNS_AUTH_KEY');
  if (!keyId || !teamId || !p8) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  // APNs JWT 有效期最长 60 分钟；提前到 50 分钟刷新
  if (apnsJwtCache && nowSec - apnsJwtCache.iat < 3000) return apnsJwtCache.token;

  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: nowSec }));
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8', pemToDer(p8), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput),
  );
  const token = `${signingInput}.${b64urlFromBytes(new Uint8Array(sig))}`;
  apnsJwtCache = { token, iat: nowSec };
  return token;
}

async function sendApns(
  deviceToken: string, payload: PushPayload, jwt: string,
): Promise<{ ok: boolean; status: number; reason?: string }> {
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') || 'com.warrescue.appname';
  const host = (Deno.env.get('APNS_USE_SANDBOX') || '').toLowerCase() === 'true'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';

  const aps: Record<string, any> = {
    alert: { title: payload.title, body: payload.body },
    sound: 'default',
    // 红色预警用 time-sensitive 尽量穿透专注模式；其余 active
    'interruption-level': payload.severity === 'red' ? 'time-sensitive' : 'active',
  };
  const body = { aps, ...(payload.data || {}) };

  const res = await fetch(`${host}/3/device/${deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, status: res.status };
  let reason = '';
  try { reason = (await res.json())?.reason || ''; } catch { /* ignore */ }
  return { ok: false, status: res.status, reason };
}

// ---------- FCM ----------
let fcmTokenCache: { token: string; exp: number } | null = null;

function getServiceAccount(): any | null {
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function getFcmAccessToken(): Promise<string | null> {
  const sa = getServiceAccount();
  if (!sa?.client_email || !sa?.private_key) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (fcmTokenCache && fcmTokenCache.exp - nowSec > 60) return fcmTokenCache.token;

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSec,
    exp: nowSec + 3600,
  }));
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${b64urlFromBytes(new Uint8Array(sig))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });
  if (!res.ok) {
    console.error('FCM token exchange failed:', await res.text());
    return null;
  }
  const json = await res.json();
  fcmTokenCache = { token: json.access_token, exp: nowSec + (json.expires_in || 3600) };
  return fcmTokenCache.token;
}

async function sendFcm(
  deviceToken: string, payload: PushPayload, accessToken: string, projectId: string,
): Promise<{ ok: boolean; status: number; reason?: string }> {
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload.data || {})) data[k] = String(v);

  const message = {
    message: {
      token: deviceToken,
      notification: { title: payload.title, body: payload.body },
      android: {
        priority: 'high',
        notification: { channel_id: 'alerts', sound: 'default', notification_priority: 'PRIORITY_MAX' },
      },
      data,
    },
  };

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (res.ok) return { ok: true, status: res.status };
  let reason = '';
  try {
    const j = await res.json();
    reason = j?.error?.status || j?.error?.message || '';
  } catch { /* ignore */ }
  return { ok: false, status: res.status, reason };
}

// ---------- 对外：给一批用户下发 ----------
export async function sendPushToUsers(
  admin: any, userIds: string[], payload: PushPayload,
): Promise<{ sent: number; failed: number; skipped: boolean; tokens: number }> {
  if (!userIds || userIds.length === 0) return { sent: 0, failed: 0, skipped: true, tokens: 0 };

  const unique = [...new Set(userIds)];
  const { data: tokens } = await admin
    .from('device_tokens')
    .select('token, platform, user_id')
    .in('user_id', unique)
    .eq('enabled', true);

  if (!tokens || tokens.length === 0) return { sent: 0, failed: 0, skipped: true, tokens: 0 };

  const apnsJwt = await getApnsJwt();
  const sa = getServiceAccount();
  const fcmAccess = sa ? await getFcmAccessToken() : null;
  const projectId = sa?.project_id || Deno.env.get('FCM_PROJECT_ID') || '';

  // 两端密钥都没配 → 整体跳过（明确返回 skipped，便于上层判断是否真的发出去了）
  if (!apnsJwt && !(fcmAccess && projectId)) {
    console.warn('push skipped: 未配置 APNs / FCM 密钥');
    return { sent: 0, failed: 0, skipped: true, tokens: tokens.length };
  }

  let sent = 0, failed = 0;
  const disable: string[] = [];

  for (const t of tokens) {
    try {
      if (t.platform === 'ios' && apnsJwt) {
        const r = await sendApns(t.token, payload, apnsJwt);
        if (r.ok) { sent++; } else {
          failed++;
          if (r.status === 410 || r.reason === 'BadDeviceToken' || r.reason === 'Unregistered') disable.push(t.token);
        }
      } else if (t.platform === 'android' && fcmAccess && projectId) {
        const r = await sendFcm(t.token, payload, fcmAccess, projectId);
        if (r.ok) { sent++; } else {
          failed++;
          if (r.reason === 'UNREGISTERED' || r.reason === 'NOT_FOUND' || r.status === 404) disable.push(t.token);
        }
      }
    } catch (e) {
      failed++;
      console.error('push send error:', e);
    }
  }

  // 失效 token 标记为禁用，下次不再发
  if (disable.length > 0) {
    await admin.from('device_tokens').update({ enabled: false }).in('token', disable);
  }

  return { sent, failed, skipped: false, tokens: tokens.length };
}
