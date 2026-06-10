/**
 * Apple IAP Bridge - 连接 Web 前端和 iOS 原生 StoreKit
 *
 * 在 Capacitor iOS 环境中，通过 @capgo/capacitor-purchases 或原生桥接
 * 与 StoreKit 通信。在非 iOS 环境中，所有方法返回不可用状态。
 */

// Apple 内购产品 ID，必须和 App Store Connect 中配置一致
export const APPLE_PRODUCT_IDS = {
  personal_monthly: 'com.warrescue.app.personal.monthly',
  family_monthly: 'com.warrescue.app.family.monthly',
} as const;

export const PLAN_TO_PRODUCT: Record<string, string> = {
  personal: APPLE_PRODUCT_IDS.personal_monthly,
  family: APPLE_PRODUCT_IDS.family_monthly,
};

/**
 * 介绍性优惠（Introductory Offer）—— 由 App Store Connect 配在订阅上，
 * StoreKit 对「合格新订阅用户」自动套用，无需后台签名（区别于 referral 那种 promotional offer）。
 */
export interface IntroductoryOffer {
  displayPrice: string;          // Apple 本地化后的优惠价文案（免费试用为 "Free"/"¥0.00"）
  priceValue: number;            // 数值优惠价（免费试用为 0）
  paymentMode: 'free_trial' | 'pay_as_you_go' | 'pay_up_front' | 'unknown';
  periodUnit: 'day' | 'week' | 'month' | 'year';
  periodValue: number;           // 单个周期长度（如 7 天 → unit=day, value=7）
  periodCount: number;           // 周期重复次数（仅 pay_as_you_go 可能 >1）
}

export interface AppleProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceLocale: string;
  currencyCode: string;
  // 是否对「当前用户」可用：资格按订阅组、每人一生一次。
  // 切勿用 introductoryOffer 是否存在来判断资格（那只代表产品配了优惠）。
  introEligible?: boolean;
  introductoryOffer?: IntroductoryOffer | null;
}

export interface ApplePurchaseResult {
  success: boolean;
  transactionId?: string;
  receiptData?: string;
  jwsTransaction?: string;
  offerApplied?: boolean;
  error?: string;
}

// 检测是否在 iOS 原生环境（Capacitor）中运行
export function isNativeIOS(): boolean {
  return !!(
    (window as any).Capacitor?.isNativePlatform?.() &&
    (window as any).Capacitor?.getPlatform?.() === 'ios'
  );
}

// 检测是否在任何 iOS 环境（含 Safari WebView）
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// 获取 Capacitor IAP 插件实例
function getIAPPlugin(): any {
  const cap = (window as any).Capacitor;
  if (!cap) return null;

  // Try direct access first (Capacitor auto-registers CAPBridgedPlugin)
  if (cap.Plugins?.InAppPurchase) return cap.Plugins.InAppPurchase;
  if (cap.Plugins?.InAppPurchasePlugin) return cap.Plugins.InAppPurchasePlugin;

  // Try registerPlugin (Capacitor 8 way for local plugins)
  try {
    if (cap.registerPlugin) {
      const plugin = cap.registerPlugin('InAppPurchase');
      return plugin;
    }
  } catch (e) {
    console.warn('Failed to register InAppPurchase plugin:', e);
  }

  return null;
}

/**
 * 初始化 IAP - 在 App 启动时调用一次
 */
export async function initializeIAP(): Promise<boolean> {
  if (!isNativeIOS()) return false;

  const plugin = getIAPPlugin();
  if (!plugin) {
    console.warn('IAP plugin not available');
    return false;
  }

  try {
    await plugin.initialize?.();
    return true;
  } catch (e) {
    console.error('IAP initialization failed:', e);
    return false;
  }
}

/**
 * 获取可购买的产品列表
 */
export async function fetchProducts(): Promise<AppleProduct[]> {
  if (!isNativeIOS()) return [];

  const plugin = getIAPPlugin();
  if (!plugin) return [];

  try {
    const productIds = Object.values(APPLE_PRODUCT_IDS);
    const result = await plugin.getProducts({ productIds });
    return (result?.products || []).map((p: any) => ({
      productId: p.productId || p.identifier,
      title: p.title || p.localizedTitle,
      description: p.description || p.localizedDescription,
      price: p.price || p.localizedPrice,
      priceLocale: p.priceLocale || '',
      currencyCode: p.currencyCode || p.priceCurrencyCode || '',
      introEligible: p.introEligible === true,
      introductoryOffer: p.introductoryOffer ?? null,
    }));
  } catch (e) {
    console.error('Failed to fetch products:', e);
    return [];
  }
}

/**
 * 发起购买
 */
export interface PromoOffer {
  offerId: string;
  keyId: string;
  nonce: string;
  timestamp: number;
  signature: string;
  appAccountToken?: string;
}

export async function purchaseProduct(productId: string, offer?: PromoOffer): Promise<ApplePurchaseResult> {
  if (!isNativeIOS()) {
    return { success: false, error: 'Not running on iOS' };
  }

  const plugin = getIAPPlugin();
  if (!plugin) {
    return { success: false, error: 'Purchase service unavailable. Please restart the app and try again.' };
  }

  try {
    const args: any = { productId };
    if (offer) {
      args.offerId = offer.offerId;
      args.keyId = offer.keyId;
      args.nonce = offer.nonce;
      args.timestamp = offer.timestamp;
      args.signature = offer.signature;
      if (offer.appAccountToken) args.appAccountToken = offer.appAccountToken;
    }
    const result = await plugin.purchaseProduct(args);

    if (result?.pending) {
      return { success: false, error: 'Purchase is pending approval' };
    }

    if (result?.transactionId || result?.transaction) {
      return {
        success: true,
        transactionId: result.transactionId || result.transaction?.transactionId,
        receiptData: result.receiptData,
        jwsTransaction: result.jwsTransaction,
        offerApplied: result.offerApplied === true,
      };
    }

    return { success: false, error: 'Purchase was not completed' };
  } catch (e: any) {
    // 用户取消购买不算错误
    if (e?.code === 'USER_CANCELLED' || e?.message?.includes('cancel') || e?.message?.includes('Cancel')) {
      return { success: false, error: 'cancelled' };
    }
    console.error('Purchase failed:', e);
    return { success: false, error: e?.message || 'Purchase failed' };
  }
}

/**
 * 获取 App Store 收据数据（Base64）
 */
export async function getReceiptData(): Promise<string | undefined> {
  if (!isNativeIOS()) return undefined;

  const plugin = getIAPPlugin();
  if (!plugin) return undefined;

  try {
    const result = await plugin.getReceipt?.();
    return result?.receiptData || result?.receipt;
  } catch (e) {
    console.error('Failed to get receipt:', e);
    return undefined;
  }
}

/**
 * 恢复购买
 */
export async function restorePurchases(): Promise<ApplePurchaseResult> {
  if (!isNativeIOS()) {
    return { success: false, error: 'Not running on iOS' };
  }

  const plugin = getIAPPlugin();
  if (!plugin) {
    return { success: false, error: 'Purchase service unavailable. Please restart the app and try again.' };
  }

  try {
    const result = await plugin.restorePurchases();
    return {
      success: true,
      receiptData: result?.receiptData,
      restoredCount: result?.restoredCount || 0,
    } as any;
  } catch (e: any) {
    console.error('Restore failed:', e);
    return { success: false, error: e?.message || 'Restore failed' };
  }
}

/**
 * 完成交易（告诉 StoreKit 我们已处理完毕）
 */
export async function finishTransaction(transactionId: string): Promise<void> {
  if (!isNativeIOS()) return;

  const plugin = getIAPPlugin();
  if (!plugin) return;

  try {
    await plugin.finishTransaction?.({ transactionId });
  } catch (e) {
    console.error('Failed to finish transaction:', e);
  }
}
