import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Apple App Store endpoints
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// App Store Server API v2 endpoints
const APPSTORE_API_PRODUCTION = 'https://api.storekit.itunes.apple.com';
const APPSTORE_API_SANDBOX = 'https://api.storekit-sandbox.itunes.apple.com';

// Product IDs - must match App Store Connect configuration
const PRODUCT_IDS = {
  personal_monthly: 'com.warrescue.app.personal.monthly',
  family_monthly: 'com.warrescue.app.family.monthly',
};

// Map Apple product IDs to internal plan IDs
const PRODUCT_TO_PLAN: Record<string, string> = {
  [PRODUCT_IDS.personal_monthly]: 'personal',
  [PRODUCT_IDS.family_monthly]: 'family',
};

const PLANS: Record<string, { price: number; duration: number }> = {
  personal: { price: 39.99, duration: 30 },
  family: { price: 99.99, duration: 30 },
};

// ===== App Store Server API（方案B：向苹果权威核验交易，防伪造 JWS）=====
// 需要的 Secrets：APPSTORE_ISSUER_ID, APPSTORE_KEY_ID, APPSTORE_PRIVATE_KEY(.p8 全文), APPSTORE_BUNDLE_ID
let ascTokenCache: { token: string; exp: number } | null = null;

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64url(s: string): string {
  return b64urlFromBytes(new TextEncoder().encode(s));
}
function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
// 仅解码 JWS payload（不验签）——只用于取出 transactionId，绝不作为信任依据
function decodeJwsPayload(jws: string): any | null {
  try {
    const parts = jws.split('.');
    if (parts.length !== 3) return null;
    let s = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(atob(s));
  } catch {
    return null;
  }
}

// 用 App Store Connect API 密钥(.p8) 签发 ES256 JWT
async function getAppStoreApiToken(): Promise<string | null> {
  const issuerId = Deno.env.get('APPSTORE_ISSUER_ID');
  const keyId = Deno.env.get('APPSTORE_KEY_ID');
  const p8 = Deno.env.get('APPSTORE_PRIVATE_KEY');
  const bundleId = Deno.env.get('APPSTORE_BUNDLE_ID') || 'com.warrescue.app';
  if (!issuerId || !keyId || !p8) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (ascTokenCache && ascTokenCache.exp - nowSec > 60) return ascTokenCache.token;

  const exp = nowSec + 1800; // ≤ 60 分钟
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: issuerId, iat: nowSec, exp, aud: 'appstoreconnect-v1', bid: bundleId }));
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(p8), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  const token = `${signingInput}.${b64urlFromBytes(new Uint8Array(sig))}`;
  ascTokenCache = { token, exp };
  return token;
}

// 向 Apple 拉取权威交易信息（生产找不到则回退沙盒）。
// 返回已解码的交易 payload；未配置或核验失败返回 null —— 失败即拒绝，绝不放行。
async function fetchAppleTransaction(transactionId: string): Promise<any | null> {
  const token = await getAppStoreApiToken();
  if (!token) {
    console.error('App Store Server API 未配置（APPSTORE_ISSUER_ID/KEY_ID/PRIVATE_KEY），拒绝放行 JWS 交易');
    return null;
  }
  for (const base of [APPSTORE_API_PRODUCTION, APPSTORE_API_SANDBOX]) {
    try {
      const res = await fetch(`${base}/inApps/v1/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const j = await res.json();
        if (j?.signedTransactionInfo) {
          // 该数据由 Apple 鉴权端点经 TLS 返回，可信
          const decoded = decodeJwsPayload(j.signedTransactionInfo);
          if (decoded) return decoded;
        }
      }
    } catch (e) {
      console.error('App Store Server API 调用失败:', e);
    }
  }
  return null;
}

// ===== 推荐返券：促销优惠签名 + 推荐逻辑 =====
// 需在 ASC 每个订阅下创建一个 ID 为 referral50 的「促销优惠」(50% off 1个月)，
// 并生成「App 内购买」签名密钥(.p8)，配为 Secrets：APPSTORE_OFFER_KEY_ID / APPSTORE_OFFER_KEY
const PROMO_OFFER_ID = 'referral50';

function stdB64FromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
// Web Crypto 的 ECDSA 输出是 raw(r||s, 64字节)，而苹果促销优惠签名要 ASN.1 DER
function rawSigToDer(raw: Uint8Array): Uint8Array {
  const norm = (b: Uint8Array) => {
    let i = 0; while (i < b.length - 1 && b[i] === 0) i++;
    let t = b.slice(i);
    if (t[0] & 0x80) { const n = new Uint8Array(t.length + 1); n.set(t, 1); t = n; }
    return t;
  };
  const r = norm(raw.slice(0, 32));
  const s = norm(raw.slice(32, 64));
  const len = 2 + r.length + 2 + s.length;
  const out = new Uint8Array(2 + len);
  let o = 0;
  out[o++] = 0x30; out[o++] = len;
  out[o++] = 0x02; out[o++] = r.length; out.set(r, o); o += r.length;
  out[o++] = 0x02; out[o++] = s.length; out.set(s, o); o += s.length;
  return out;
}
// 生成苹果促销优惠签名（供 StoreKit2 Product.SubscriptionOffer.Signature 使用）
async function signPromotionalOffer(productId: string, offerId: string, appUsername: string) {
  const keyId = Deno.env.get('APPSTORE_OFFER_KEY_ID');
  const p8 = Deno.env.get('APPSTORE_OFFER_KEY');
  const bundleId = Deno.env.get('APPSTORE_BUNDLE_ID') || 'com.warrescue.app';
  if (!keyId || !p8) return null;
  const SEP = '⁣'; // INVISIBLE SEPARATOR
  const nonce = crypto.randomUUID().toLowerCase();
  const timestamp = Date.now();
  const username = (appUsername || '').toLowerCase();
  const payload = [bundleId, keyId, productId, offerId, username, nonce, String(timestamp)].join(SEP);
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(p8), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const rawSig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(payload)));
  const signature = stdB64FromBytes(rawSigToDer(rawSig));
  return { offerId, keyId, nonce, timestamp, signature, username };
}

async function getReqUser(supabaseAdmin: any, req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  return user || null;
}
function jsonResp(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

// 取自己的推荐码 + 可用券
async function getReferral(supabaseAdmin: any, req: Request) {
  const user = await getReqUser(supabaseAdmin, req);
  if (!user) return jsonResp({ error: 'Unauthorized' }, 401);
  const { data: code } = await supabaseAdmin.rpc('gen_referral_code', { uid: user.id });
  await supabaseAdmin.rpc('expire_coupons');
  const { data: coupons } = await supabaseAdmin
    .from('referral_coupons').select('id,status,expires_at,earned_at')
    .eq('user_id', user.id).eq('status', 'available').order('expires_at', { ascending: true });
  const { count: referredCount } = await supabaseAdmin
    .from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id);
  return jsonResp({ code, availableCoupons: coupons?.length || 0, coupons: coupons || [], referredCount: referredCount || 0 });
}

// 新人填推荐码 → 登记 + 给推荐人发券
async function applyReferralCode(supabaseAdmin: any, req: Request) {
  const user = await getReqUser(supabaseAdmin, req);
  if (!user) return jsonResp({ error: 'Unauthorized' }, 401);
  const { code } = await req.json();
  const { data, error } = await supabaseAdmin.rpc('apply_referral', { p_referee: user.id, p_code: code });
  if (error) return jsonResp({ ok: false, reason: 'error', detail: error.message }, 400);
  return jsonResp(data);
}

// 用券 → 预留一张券并签发促销优惠
async function signOffer(supabaseAdmin: any, req: Request) {
  const user = await getReqUser(supabaseAdmin, req);
  if (!user) return jsonResp({ error: 'Unauthorized' }, 401);
  const { productId } = await req.json();
  if (!productId || !PRODUCT_TO_PLAN[productId]) return jsonResp({ eligible: false, reason: 'bad_product' }, 400);
  const { data: couponId } = await supabaseAdmin.rpc('reserve_coupon', { p_user: user.id });
  if (!couponId) return jsonResp({ eligible: false, reason: 'no_coupon' });
  const sig = await signPromotionalOffer(productId, PROMO_OFFER_ID, user.id);
  if (!sig) {
    await supabaseAdmin.from('referral_coupons').update({ status: 'available', reserved_at: null }).eq('id', couponId);
    return jsonResp({ eligible: false, reason: 'offer_key_not_configured' }, 500);
  }
  return jsonResp({ eligible: true, ...sig });
}

// 带券购买成功后核销
async function consumeCoupon(supabaseAdmin: any, req: Request) {
  const user = await getReqUser(supabaseAdmin, req);
  if (!user) return jsonResp({ error: 'Unauthorized' }, 401);
  const { transactionId } = await req.json();
  await supabaseAdmin.rpc('consume_coupon', { p_user: user.id, p_txn: transactionId || null });
  return jsonResp({ ok: true });
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
      case 'get-products':
        return getProducts();
      case 'verify-receipt':
        return await verifyReceipt(supabaseAdmin, req);
      case 'restore-purchases':
        return await restorePurchases(supabaseAdmin, req);
      case 'get-subscription-status':
        return await getSubscriptionStatus(supabaseAdmin, req);
      case 'apple-server-notification':
        return await handleAppleNotification(supabaseAdmin, req);
      case 'get-referral':
        return await getReferral(supabaseAdmin, req);
      case 'apply-referral-code':
        return await applyReferralCode(supabaseAdmin, req);
      case 'sign-promo-offer':
        return await signOffer(supabaseAdmin, req);
      case 'consume-coupon':
        return await consumeCoupon(supabaseAdmin, req);
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (error: any) {
    console.error('Apple IAP error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

// === Return available product IDs ===
function getProducts() {
  return new Response(JSON.stringify({
    products: Object.entries(PRODUCT_IDS).map(([key, productId]) => ({
      key,
      productId,
      planId: key.split('_')[0],
    })),
  }), { headers: corsHeaders });
}

// === Verify Apple receipt and activate subscription ===
async function verifyReceipt(supabaseAdmin: any, req: Request) {
  const { receiptData, transactionId, productId, jwsTransaction } = await req.json();
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

  if (!receiptData && !jwsTransaction) {
    return new Response(JSON.stringify({ error: 'receiptData or jwsTransaction required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Try JWS transaction verification first (StoreKit 2)
  if (jwsTransaction && !receiptData) {
    return await verifyJWSTransaction(supabaseAdmin, user, jwsTransaction, productId);
  }

  // Legacy receipt verification
  const appSharedSecret = Deno.env.get('APPLE_SHARED_SECRET') || '';
  const verifyBody = {
    'receipt-data': receiptData,
    'password': appSharedSecret,
    'exclude-old-transactions': true,
  };

  // Try production first, fallback to sandbox
  let appleResult = await callAppleVerify(APPLE_PRODUCTION_URL, verifyBody);

  // Status 21007 means sandbox receipt sent to production - retry with sandbox
  if (appleResult.status === 21007) {
    appleResult = await callAppleVerify(APPLE_SANDBOX_URL, verifyBody);
  }

  if (appleResult.status !== 0) {
    console.error('Apple receipt verification failed, status:', appleResult.status);
    // If legacy verification fails and we have JWS, try JWS verification
    if (jwsTransaction) {
      return await verifyJWSTransaction(supabaseAdmin, user, jwsTransaction, productId);
    }
    return new Response(JSON.stringify({
      error: 'Receipt verification failed',
      appleStatus: appleResult.status,
    }), { status: 400, headers: corsHeaders });
  }

  // Extract latest receipt info for auto-renewable subscriptions
  const latestReceipt = appleResult.latest_receipt_info;
  if (!latestReceipt || latestReceipt.length === 0) {
    return new Response(JSON.stringify({ error: 'No subscription found in receipt' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Get the most recent transaction
  const latestTransaction = latestReceipt.sort(
    (a: any, b: any) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms)
  )[0];

  const appleProductId = latestTransaction.product_id;
  const appleTransactionId = latestTransaction.transaction_id;
  const originalTransactionId = latestTransaction.original_transaction_id;
  const expiresDateMs = Number(latestTransaction.expires_date_ms);
  const purchaseDateMs = Number(latestTransaction.purchase_date_ms);
  const isTrialPeriod = latestTransaction.is_trial_period === 'true';

  const planId = PRODUCT_TO_PLAN[appleProductId];
  if (!planId) {
    return new Response(JSON.stringify({ error: 'Unknown product: ' + appleProductId }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const plan = PLANS[planId];
  const expiresAt = new Date(expiresDateMs).toISOString();
  const isExpired = expiresDateMs < Date.now();

  // Check for duplicate transaction
  const { data: existingOrder } = await supabaseAdmin
    .from('subscription_orders')
    .select('id')
    .eq('apple_transaction_id', appleTransactionId)
    .maybeSingle();

  if (existingOrder) {
    // Transaction already processed - just return success
    return new Response(JSON.stringify({
      success: true,
      alreadyProcessed: true,
      planId,
      expiresAt,
    }), { headers: corsHeaders });
  }

  // Create order record
  const { data: order, error: orderError } = await supabaseAdmin
    .from('subscription_orders')
    .insert({
      user_id: user.id,
      plan_id: planId,
      original_price: plan.price,
      discount_amount: 0,
      final_price: plan.price,
      has_invite_discount: false,
      status: 'completed',
      payment_method: 'apple_iap',
      apple_transaction_id: appleTransactionId,
      apple_original_transaction_id: originalTransactionId,
      apple_product_id: appleProductId,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (orderError) {
    console.error('Failed to create order:', orderError);
    return new Response(JSON.stringify({ error: 'Failed to create order record' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  // Activate subscription if not expired
  if (!isExpired) {
    await activateSubscription(supabaseAdmin, user.id, planId, expiresAt, originalTransactionId);
  }

  return new Response(JSON.stringify({
    success: true,
    planId,
    expiresAt,
    isTrialPeriod,
    orderId: order.id,
  }), { headers: corsHeaders });
}

// === Restore purchases ===
async function restorePurchases(supabaseAdmin: any, req: Request) {
  const { receiptData } = await req.json();
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

  if (!receiptData) {
    return new Response(JSON.stringify({ error: 'receiptData required' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const appSharedSecret = Deno.env.get('APPLE_SHARED_SECRET') || '';
  const verifyBody = {
    'receipt-data': receiptData,
    'password': appSharedSecret,
    'exclude-old-transactions': false,
  };

  let appleResult = await callAppleVerify(APPLE_PRODUCTION_URL, verifyBody);
  if (appleResult.status === 21007) {
    appleResult = await callAppleVerify(APPLE_SANDBOX_URL, verifyBody);
  }

  if (appleResult.status !== 0) {
    return new Response(JSON.stringify({
      error: 'Receipt verification failed',
      appleStatus: appleResult.status,
    }), { status: 400, headers: corsHeaders });
  }

  const latestReceipt = appleResult.latest_receipt_info || [];
  const activeSubscriptions: any[] = [];

  for (const tx of latestReceipt) {
    const expiresMs = Number(tx.expires_date_ms);
    if (expiresMs > Date.now()) {
      const planId = PRODUCT_TO_PLAN[tx.product_id];
      if (planId) {
        const expiresAt = new Date(expiresMs).toISOString();
        await activateSubscription(supabaseAdmin, user.id, planId, expiresAt, tx.original_transaction_id);
        activeSubscriptions.push({ planId, expiresAt });
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    restoredCount: activeSubscriptions.length,
    subscriptions: activeSubscriptions,
  }), { headers: corsHeaders });
}

// === Get subscription status ===
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
      trialEndsAt,
      status: isTrialActive ? 'trial' : 'inactive',
    }), { headers: corsHeaders });
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysUntilExpiry <= 7;

  let status = subscription.status;
  if (status === 'active' && isExpiringSoon) {
    status = 'expiring';
  }

  return new Response(JSON.stringify({
    hasSubscription: true,
    planId: subscription.plan_id,
    status,
    daysUntilExpiry: Math.max(0, daysUntilExpiry),
    isExpiringSoon,
    expiresAt: subscription.expires_at,
    autoRenew: subscription.auto_renew,
    paymentMethod: 'apple_iap',
  }), { headers: corsHeaders });
}

// === Handle Apple App Store Server Notifications V2 ===
async function handleAppleNotification(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { signedPayload } = body;

    if (!signedPayload) {
      return new Response(JSON.stringify({ error: 'Missing signedPayload' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Decode JWS payload (header.payload.signature)
    const parts = signedPayload.split('.');
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: 'Invalid JWS format' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const notificationType = payload.notificationType;
    const subtype = payload.subtype;
    const data = payload.data;

    console.log(`Apple notification: ${notificationType} / ${subtype}`);

    // 解码通知里的交易信息（不信任），取出 transactionId 后向 Apple 权威核验，防伪造通知
    let transactionInfo: any = null;
    if (data?.signedTransactionInfo) {
      const claimedTx = decodeJwsPayload(data.signedTransactionInfo);
      if (claimedTx?.transactionId) {
        transactionInfo = await fetchAppleTransaction(String(claimedTx.transactionId));
      }
    }

    // Decode signed renewal info if present
    let renewalInfo: any = null;
    if (data?.signedRenewalInfo) {
      const rnParts = data.signedRenewalInfo.split('.');
      if (rnParts.length === 3) {
        renewalInfo = JSON.parse(atob(rnParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      }
    }

    if (!transactionInfo) {
      console.log('No transaction info in notification, skipping');
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    const originalTransactionId = transactionInfo.originalTransactionId;
    const productId = transactionInfo.productId;
    const planId = PRODUCT_TO_PLAN[productId];

    if (!planId || !originalTransactionId) {
      console.log('Unknown product or missing transaction ID');
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // Find user by original transaction ID
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan_id')
      .eq('apple_original_transaction_id', originalTransactionId)
      .maybeSingle();

    if (!subscription) {
      console.log(`No subscription found for original_transaction_id: ${originalTransactionId}`);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    const userId = subscription.user_id;

    switch (notificationType) {
      case 'DID_RENEW': {
        // Subscription renewed successfully
        const expiresDateMs = transactionInfo.expiresDate;
        const expiresAt = new Date(expiresDateMs).toISOString();
        await activateSubscription(supabaseAdmin, userId, planId, expiresAt, originalTransactionId);
        console.log(`Subscription renewed for user ${userId}, expires ${expiresAt}`);
        break;
      }

      case 'EXPIRED': {
        // Subscription expired
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('plan_id', planId)
          .eq('status', 'active');
        console.log(`Subscription expired for user ${userId}`);
        break;
      }

      case 'DID_CHANGE_RENEWAL_STATUS': {
        // User turned auto-renew on/off
        const autoRenew = subtype !== 'AUTO_RENEW_DISABLED';
        await supabaseAdmin
          .from('subscriptions')
          .update({ auto_renew: autoRenew, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('plan_id', planId);
        console.log(`Auto-renew ${autoRenew ? 'enabled' : 'disabled'} for user ${userId}`);
        break;
      }

      case 'REFUND': {
        // Apple issued a refund
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('plan_id', planId)
          .eq('status', 'active');
        console.log(`Subscription refunded for user ${userId}`);
        break;
      }

      case 'DID_FAIL_TO_RENEW': {
        // Billing issue - renewal failed
        if (subtype === 'GRACE_PERIOD') {
          // Still in grace period
          console.log(`Billing retry in grace period for user ${userId}`);
        } else {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'billing_issue', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('plan_id', planId)
            .eq('status', 'active');
          console.log(`Billing failed for user ${userId}`);
        }
        break;
      }

      case 'REVOKE': {
        // Family sharing revoked or refund via Apple
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'revoked', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('plan_id', planId)
          .eq('status', 'active');
        console.log(`Subscription revoked for user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled Apple notification type: ${notificationType}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err: any) {
    console.error('Apple notification handler error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// === Helper: Call Apple receipt verification ===
async function callAppleVerify(url: string, body: Record<string, any>): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await response.json();
}

// === Helper: Activate subscription ===
async function activateSubscription(
  supabaseAdmin: any,
  userId: string,
  planId: string,
  expiresAt: string,
  appleOriginalTransactionId?: string,
) {
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .maybeSingle();

  const updateData: Record<string, any> = {
    status: 'active',
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  if (appleOriginalTransactionId) {
    updateData.apple_original_transaction_id = appleOriginalTransactionId;
  }

  if (existingSub) {
    await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', existingSub.id);
  } else {
    await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        ...updateData,
      });
  }
}

// === Helper: Verify JWS Transaction (StoreKit 2) ===
async function verifyJWSTransaction(
  supabaseAdmin: any,
  user: any,
  jwsTransaction: string,
  expectedProductId?: string,
) {
  try {
    // 1) 解码客户端 JWS（不信任），仅取出 transactionId
    const claimed = decodeJwsPayload(jwsTransaction);
    if (!claimed?.transactionId) {
      return new Response(JSON.stringify({ error: 'Invalid JWS format' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 2) 向 Apple App Store Server API 权威核验该交易（防伪造白嫖）
    const transactionInfo = await fetchAppleTransaction(String(claimed.transactionId));
    if (!transactionInfo) {
      return new Response(JSON.stringify({ error: 'Transaction could not be verified with Apple' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 以下一律使用 Apple 返回的权威字段，而非客户端声称的值
    const appleProductId = transactionInfo.productId;
    const transactionId = String(transactionInfo.transactionId);
    const originalTransactionId = String(transactionInfo.originalTransactionId);
    const expiresDateMs = transactionInfo.expiresDate;
    const isTrialPeriod = transactionInfo.offerType === 1; // introductory offer

    const planId = PRODUCT_TO_PLAN[appleProductId];
    if (!planId) {
      return new Response(JSON.stringify({ error: 'Unknown product: ' + appleProductId }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const plan = PLANS[planId];
    const expiresAt = new Date(expiresDateMs).toISOString();
    const isExpired = expiresDateMs < Date.now();

    // Check for duplicate transaction
    const { data: existingOrder } = await supabaseAdmin
      .from('subscription_orders')
      .select('id')
      .eq('apple_transaction_id', transactionId)
      .maybeSingle();

    if (existingOrder) {
      return new Response(JSON.stringify({
        success: true,
        alreadyProcessed: true,
        planId,
        expiresAt,
      }), { headers: corsHeaders });
    }

    // Create order record
    const { data: order, error: orderError } = await supabaseAdmin
      .from('subscription_orders')
      .insert({
        user_id: user.id,
        plan_id: planId,
        original_price: plan.price,
        discount_amount: 0,
        final_price: plan.price,
        has_invite_discount: false,
        status: 'completed',
        payment_method: 'apple_iap',
        apple_transaction_id: transactionId,
        apple_original_transaction_id: originalTransactionId,
        apple_product_id: appleProductId,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      return new Response(JSON.stringify({ error: 'Failed to create order record' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Activate subscription if not expired
    if (!isExpired) {
      await activateSubscription(supabaseAdmin, user.id, planId, expiresAt, originalTransactionId);
    }

    return new Response(JSON.stringify({
      success: true,
      planId,
      expiresAt,
      isTrialPeriod,
      orderId: order.id,
    }), { headers: corsHeaders });
  } catch (err: any) {
    console.error('JWS verification error:', err);
    return new Response(JSON.stringify({ error: 'JWS verification failed: ' + err.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }
}
