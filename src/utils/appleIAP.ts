/**
 * Apple IAP Bridge - 连接 Web 前端和 iOS 原生 StoreKit
 *
 * 在 Capacitor iOS 环境中，通过原生 InAppPurchasePlugin 桥接
 * 与 StoreKit 2 通信。在非 iOS 环境中，所有方法返回不可用状态。
 */

// Apple 内购产品 ID，必须和 App Store Connect 中配置一致
export const APPLE_PRODUCT_IDS = {
  personal_monthly: 'com.warrescue.personal.monthly.v1',
  family_monthly: 'com.warrescue.family.monthly.v3',
} as const;

export const PLAN_TO_PRODUCT: Record<string, string> = {
  personal: APPLE_PRODUCT_IDS.personal_monthly,
  family: APPLE_PRODUCT_IDS.family_monthly,
};

export interface AppleProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceLocale: string;
  currencyCode: string;
}

export interface ApplePurchaseResult {
  success: boolean;
  transactionId?: string;
  receiptData?: string;
  jwsTransaction?: string;
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

// 插件单例 - 在模块加载时注册一次，之后所有函数复用同一实例
let _iapPlugin: any = null;
let _pluginInitAttempted = false;

function getIAPPlugin(): any {
  if (_iapPlugin) return _iapPlugin;
  if (_pluginInitAttempted) return _iapPlugin; // avoid retrying on failure

  _pluginInitAttempted = true;

  const cap = (window as any).Capacitor;
  if (!cap) return null;

  // Method 1: Direct access (auto-registered via CAPBridgedPlugin)
  if (cap.Plugins?.InAppPurchase) {
    _iapPlugin = cap.Plugins.InAppPurchase;
    return _iapPlugin;
  }
  if (cap.Plugins?.InAppPurchasePlugin) {
    _iapPlugin = cap.Plugins.InAppPurchasePlugin;
    return _iapPlugin;
  }

  // Method 2: registerPlugin (Capacitor 8 way) - must only be called ONCE
  try {
    if (cap.registerPlugin) {
      _iapPlugin = cap.registerPlugin('InAppPurchase');
      return _iapPlugin;
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
    await plugin.initialize();
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
    }));
  } catch (e) {
    console.error('Failed to fetch products:', e);
    return [];
  }
}

/**
 * 发起购买
 */
export async function purchaseProduct(productId: string): Promise<ApplePurchaseResult> {
  if (!isNativeIOS()) {
    return { success: false, error: 'Not running on iOS' };
  }

  const plugin = getIAPPlugin();
  if (!plugin) {
    return { success: false, error: 'Purchase service unavailable. Please restart the app and try again.' };
  }

  try {
    const result = await plugin.purchaseProduct({ productId });

    if (result?.pending) {
      return { success: false, error: 'Purchase is pending approval' };
    }

    if (result?.transactionId || result?.transaction) {
      return {
        success: true,
        transactionId: result.transactionId || result.transaction?.transactionId,
        receiptData: result.receiptData,
        jwsTransaction: result.jwsTransaction,
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
    const result = await plugin.getReceipt();
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
    await plugin.finishTransaction({ transactionId });
  } catch (e) {
    console.error('Failed to finish transaction:', e);
  }
}
