/**
 * 共享 Twilio 接入层（被 sos-service 等复用）。
 * 沿用原生 WarAlarmApp 的做法：优先 API Key 认证（Key SID + Secret），
 * 账户路径用 Account SID；也兼容 Account SID + Auth Token。
 *
 * 环境变量（Supabase Edge Function Secrets，切勿写进仓库）：
 *   TWILIO_ACCOUNT_SID   必需（AC 开头）
 *   TWILIO_FROM_NUMBER   必需（E.164，如 +1xxxxxxxxxx）
 *   TWILIO_KEY_SID + TWILIO_KEY_SECRET   推荐（API Key 认证）
 *   或 TWILIO_AUTH_TOKEN                  备选（主账户令牌）
 *
 * 任一必需项缺失 → 安全跳过（skipped=true），不报成功、不抛异常。
 */

export interface TwilioResult {
  ok: boolean;
  sid?: string;
  error?: string;
  skipped?: boolean;
}

function getCreds(): { accountSid: string; fromNumber: string; user: string; pass: string } | null {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
  const keySid = Deno.env.get('TWILIO_KEY_SID');
  const keySecret = Deno.env.get('TWILIO_KEY_SECRET');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!accountSid || !fromNumber) return null;

  if (keySid && keySecret) return { accountSid, fromNumber, user: keySid, pass: keySecret };
  if (authToken) return { accountSid, fromNumber, user: accountSid, pass: authToken };
  return null;
}

export function isTwilioConfigured(): boolean {
  return getCreds() !== null;
}

function authHeader(user: string, pass: string): string {
  return 'Basic ' + btoa(`${user}:${pass}`);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function twilioPost(path: string, params: Record<string, string>): Promise<TwilioResult> {
  const c = getCreds();
  if (!c) return { ok: false, skipped: true, error: 'Twilio not configured' };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(c.user, c.pass),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });

  if (res.ok) {
    const j = await res.json().catch(() => ({} as any));
    return { ok: true, sid: j.sid };
  }
  let error = '';
  try { error = (await res.json())?.message || ''; } catch { /* ignore */ }
  return { ok: false, error: error || `HTTP ${res.status}` };
}

/** 发送短信 */
export async function sendSms(to: string, body: string): Promise<TwilioResult> {
  const c = getCreds();
  if (!c) return { ok: false, skipped: true, error: 'Twilio not configured' };
  if (!to) return { ok: false, error: 'no recipient' };
  return twilioPost('Messages.json', { To: to, From: c.fromNumber, Body: body });
}

/** 给多个号码发同一条短信 */
export async function sendSmsToMany(numbers: string[], body: string): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!isTwilioConfigured()) return { sent: 0, failed: 0, skipped: true };
  let sent = 0, failed = 0;
  for (const n of [...new Set(numbers.filter(Boolean))]) {
    const r = await sendSms(n, body);
    if (r.ok) sent++; else failed++;
  }
  return { sent, failed, skipped: false };
}

/** 用内联 TwiML 发起语音外呼并朗读一段文字（无需自建 TwiML 服务器） */
export async function makeCallSay(to: string, message: string, language = 'en-US'): Promise<TwilioResult> {
  const c = getCreds();
  if (!c) return { ok: false, skipped: true, error: 'Twilio not configured' };
  if (!to) return { ok: false, error: 'no recipient' };
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="${language}">${escapeXml(message)}</Say></Response>`;
  return twilioPost('Calls.json', { To: to, From: c.fromNumber, Twiml: twiml });
}

/** 用托管 TwiML URL 发起语音外呼（如需 AI 语音核实脚本） */
export async function makeCall(to: string, twimlUrl: string): Promise<TwilioResult> {
  const c = getCreds();
  if (!c) return { ok: false, skipped: true, error: 'Twilio not configured' };
  if (!to || !twimlUrl) return { ok: false, error: 'missing to/twimlUrl' };
  return twilioPost('Calls.json', { To: to, From: c.fromNumber, Url: twimlUrl });
}
