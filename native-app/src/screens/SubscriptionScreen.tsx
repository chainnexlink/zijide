import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { finishTransaction, getAvailablePurchases, useIAP, type DiscountOfferInputIOS, type ProductSubscription, type Purchase } from 'expo-iap';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'Subscription'>;
type Status = { hasSubscription?: boolean; planId?: string; status?: string; expiresAt?: string; daysUntilExpiry?: number; autoRenew?: boolean; isTrialActive?: boolean; trialEndsAt?: string };
const PRODUCTS = [
  { id: 'com.warrescue.app.personal.monthly', plan: 'personal', title: '个人守护', features: ['完整预警与危险区', 'SOS与安全路线', '1公里互助'] },
  { id: 'com.warrescue.app.family.monthly', plan: 'family', title: '家庭守护', features: ['包含个人版全部能力', '最多6位家庭成员', '位置、电量、预警与SOS联动'] },
] as const;
const PRODUCT_IDS = new Set<string>(PRODUCTS.map((item) => item.id));

export function SubscriptionScreen({ navigation }: Props) {
  const [status, setStatus] = useState<Status>({}); const [coupons, setCoupons] = useState(0); const [busy, setBusy] = useState(false); const [statusLoading, setStatusLoading] = useState(true); const [statusError, setStatusError] = useState(''); const [storeChecked, setStoreChecked] = useState(false); const [storeError, setStoreError] = useState(''); const processing = useRef(new Set<string>());
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const [result, referral] = await Promise.all([
        supabase.functions.invoke('apple-iap', { body: { action: 'get-subscription-status' } }),
        supabase.functions.invoke('apple-iap', { body: { action: 'get-referral' } }),
      ]);
      if (result.error || result.data?.error) throw new Error(result.data?.error || result.error?.message || '订阅状态加载失败');
      setStatus(result.data || {});
      setCoupons(referral.error || referral.data?.error ? 0 : referral.data?.availableCoupons || 0);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : '订阅状态加载失败');
    } finally {
      setStatusLoading(false);
    }
  }, []);
  const verify = useCallback(async (purchase: Purchase, options: { finish?: boolean; consumeCoupon?: boolean; notify?: boolean; refresh?: boolean } = {}) => {
    const key = purchase.purchaseToken || purchase.transactionId || purchase.id;
    if (!key || processing.current.has(key)) return false;
    processing.current.add(key);
    setBusy(true);
    try {
      if (!PRODUCT_IDS.has(purchase.productId)) throw new Error('Apple 返回了未知订阅商品');
      if (!purchase.purchaseToken) throw new Error('Apple 未返回可验证的交易凭证');
      const { data, error } = await supabase.functions.invoke('apple-iap', { body: { action: 'verify-receipt', jwsTransaction: purchase.purchaseToken, transactionId: purchase.transactionId || purchase.id, productId: purchase.productId } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || '收据验证失败');
      if (options.finish !== false) {
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {
          Alert.alert('订阅已激活', '交易已通过服务器验证，但 App Store 交易确认暂时失败。下次启动或“恢复购买”时会自动重试。');
        }
      }
      if (options.consumeCoupon !== false) {
        const consumed = await supabase.functions.invoke('apple-iap', { body: { action: 'consume-coupon', transactionId: purchase.transactionId || purchase.id } });
        if (consumed.error || consumed.data?.error) console.warn('Coupon reconciliation failed');
      }
      if (options.refresh !== false) await loadStatus();
      if (options.notify !== false) Alert.alert('订阅已激活', `有效期至 ${new Date(data.expiresAt).toLocaleString('zh-CN')}`);
      return true;
    } catch (error) {
      if (options.notify !== false) Alert.alert('购买验证失败', error instanceof Error ? error.message : '请稍后恢复购买');
      return false;
    } finally {
      processing.current.delete(key);
      setBusy(false);
    }
  }, [loadStatus]);
  const iap = useIAP({ onPurchaseSuccess: (purchase) => { void verify(purchase); }, onPurchaseError: (error) => { if (error.code !== 'user-cancelled') Alert.alert('购买失败', error.message); setBusy(false); }, onError: (error) => setStoreError(error.message || 'App Store 暂时不可用') });
  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => {
    if (!iap.connected) return;
    setStoreChecked(false);
    setStoreError('');
    void iap.fetchProducts({ skus: PRODUCTS.map((item) => item.id), type: 'subs' })
      .catch((error) => setStoreError(error instanceof Error ? error.message : '商品加载失败'))
      .finally(() => setStoreChecked(true));
  }, [iap.connected]);
  const storeProduct = (id: string) => iap.subscriptions.find((item) => item.id === id);
  const purchase = async (id: string) => { if (Platform.OS !== 'ios') return Alert.alert('暂不可购买', '当前版本的订阅商品由 Apple App Store 提供。'); if (!iap.connected) return Alert.alert('App Store 未连接', '请检查网络和 Apple ID 后重试。'); if (!storeProduct(id)) return Alert.alert('商品暂不可用', '该订阅尚未在当前 App Store 地区生效，请稍后重试。'); setBusy(true); try { const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) throw new Error('登录已失效，请重新登录'); let offer: DiscountOfferInputIOS | undefined; if (coupons > 0) { const signed = await supabase.functions.invoke('apple-iap', { body: { action: 'sign-promo-offer', productId: id } }); if (signed.data?.eligible) offer = { identifier: signed.data.offerId, keyIdentifier: signed.data.keyId, nonce: signed.data.nonce, timestamp: signed.data.timestamp, signature: signed.data.signature }; } await iap.requestPurchase({ request: { apple: { sku: id, appAccountToken: auth.user.id, withOffer: offer }, google: { skus: [id] } }, type: 'subs' }); } catch (error) { setBusy(false); Alert.alert('无法发起购买', error instanceof Error ? error.message : '请稍后重试'); } };
  const restore = async () => {
    if (Platform.OS !== 'ios') return Alert.alert('暂不可用', '恢复购买目前仅支持 Apple App Store。');
    if (!iap.connected) return Alert.alert('App Store 未连接', '请检查网络和 Apple ID 后重试。');
    setBusy(true);
    try {
      await iap.restorePurchases();
      const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true, alsoPublishToEventListenerIOS: false });
      const eligible = purchases.filter((item) => PRODUCT_IDS.has(item.productId));
      let restored = 0;
      for (const item of eligible) {
        if (await verify(item, { finish: false, consumeCoupon: false, notify: false, refresh: false })) restored += 1;
      }
      await loadStatus();
      Alert.alert('恢复购买完成', restored > 0 ? `已核验并恢复 ${restored} 项有效订阅。` : '当前 Apple ID 没有可恢复的有效 WarRescue 订阅。');
    } catch (error) {
      Alert.alert('恢复失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setBusy(false);
    }
  };
  return <Screen title="订阅服务" subtitle="由 Apple App Store 安全结算" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    {statusLoading ? <ActivityIndicator color={colors.info} /> : null}
    {statusError ? <View style={styles.error}><Text style={styles.errorText}>{statusError}</Text><Pressable onPress={() => void loadStatus()}><Text style={styles.retry}>重新加载</Text></Pressable></View> : null}
    {storeError ? <View style={styles.error}><Text style={styles.errorText}>App Store 商品加载失败：{storeError}</Text></View> : null}
    {status.hasSubscription || status.isTrialActive ? <View style={styles.active}><Text style={styles.activeTitle}>{status.isTrialActive ? '免费试用中' : `${status.planId === 'family' ? '家庭版' : '个人版'}已生效`}</Text><Text style={styles.activeText}>状态：{status.status} · {status.expiresAt || status.trialEndsAt ? `有效期至 ${new Date(status.expiresAt || status.trialEndsAt!).toLocaleString('zh-CN')}` : '有效期由 Apple 管理'}</Text></View> : null}
    {coupons > 0 ? <View style={styles.coupon}><Text style={styles.couponTitle}>你有 {coupons} 张推荐5折券</Text><Text style={styles.couponText}>下次符合条件的月度订阅购买会自动尝试使用一张。</Text></View> : null}
    {PRODUCTS.map((plan) => <Plan key={plan.id} product={storeProduct(plan.id)} title={plan.title} price={storeProduct(plan.id)?.displayPrice || '价格以 App Store 为准'} features={plan.features} active={status.planId === plan.plan && status.hasSubscription === true} disabled={busy || !iap.connected || !storeProduct(plan.id)} checked={storeChecked} onPress={() => void purchase(plan.id)} />)}
    {busy ? <ActivityIndicator color={colors.info} /> : null}
    <Pressable style={styles.restore} onPress={() => void restore()} disabled={busy}><Text style={styles.restoreText}>恢复购买</Text></Pressable>
    <Pressable onPress={() => void Linking.openURL('https://apps.apple.com/account/subscriptions')}><Text style={styles.manage}>在 Apple 中管理或取消订阅</Text></Pressable>
    <Text style={styles.legal}>订阅将通过 Apple ID 自动续期，除非在当前周期结束至少24小时前取消。实际价格以 App Store 显示为准。</Text>
  </Screen>;
}

function Plan({ product: _product, title, price, features, active, disabled, checked, onPress }: { product?: ProductSubscription; title: string; price: string; features: readonly string[]; active: boolean; disabled: boolean; checked: boolean; onPress: () => void }) { return <View style={[styles.plan, active && styles.planActive]}><View style={styles.planTop}><Text style={styles.planTitle}>{title}</Text><Text style={styles.price}>{price}</Text></View>{features.map((item) => <Text key={item} style={styles.feature}>✓ {item}</Text>)}<Pressable style={[styles.buy, (active || disabled) && styles.buyDisabled]} onPress={onPress} disabled={active || disabled}><Text style={styles.buyText}>{active ? '当前方案' : !_product ? checked ? '商品暂不可用' : '正在连接 App Store' : '通过 Apple 订阅'}</Text></Pressable></View>; }
const styles = StyleSheet.create({ back: { color: colors.info, fontWeight: '800' }, error: { backgroundColor: '#450A0A', borderColor: '#EF444466', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }, errorText: { color: '#FECACA', lineHeight: 20 }, retry: { color: colors.info, fontWeight: '900' }, active: { backgroundColor: '#052E16', borderColor: '#22C55E66', borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm }, activeTitle: { color: colors.safe, fontSize: 19, fontWeight: '900' }, activeText: { color: '#BBF7D0', lineHeight: 20 }, coupon: { backgroundColor: '#422006', borderColor: '#F59E0B66', borderWidth: 1, borderRadius: radius.md, padding: spacing.lg }, couponTitle: { color: colors.warning, fontWeight: '900' }, couponText: { color: '#FDE68A', marginTop: 6 }, plan: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }, planActive: { borderColor: colors.safe }, planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, planTitle: { color: colors.text, fontSize: 21, fontWeight: '900' }, price: { color: colors.info, fontSize: 16, fontWeight: '900' }, feature: { color: '#CBD5E1' }, buy: { height: 49, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }, buyDisabled: { opacity: 0.45 }, buyText: { color: colors.white, fontWeight: '900' }, restore: { height: 48, borderColor: colors.info, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, restoreText: { color: colors.info, fontWeight: '900' }, manage: { color: colors.info, textAlign: 'center', fontWeight: '800' }, legal: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' } });
