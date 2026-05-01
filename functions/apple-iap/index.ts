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
  personal_monthly: 'com.warrescue.personal.monthly',
  family_monthly: 'com.warrescue.family.monthly',
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
  const { receiptData, transactionId, productId } = await req.json();
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

  // Verify receipt with Apple
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

    // Decode signed transaction info if present
    let transactionInfo: any = null;
    if (data?.signedTransactionInfo) {
      const txParts = data.signedTransactionInfo.split('.');
      if (txParts.length === 3) {
        transactionInfo = JSON.parse(atob(txParts[1].replace(/-/g, '+').replace(/_/g, '/')));
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
