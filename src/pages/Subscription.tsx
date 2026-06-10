import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Crown,
  Users,
  Check,
  ChevronRight,
  Gift,
  Clock,
  Shield,
  ArrowLeft,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import {
  isNativeIOS,
  initializeIAP,
  fetchProducts,
  purchaseProduct,
  restorePurchases,
  finishTransaction,
  PLAN_TO_PRODUCT,
  type AppleProduct,
  type IntroductoryOffer,
} from '../utils/appleIAP';

interface Plan {
  id: 'personal' | 'family';
  name: string;
  price: number;
  applePrice?: string;
  duration: number;
  features: string[];
}

const PLANS: Record<string, Plan> = {
  personal: {
    id: 'personal',
    name: 'personal',
    price: 39.99,
    duration: 30,
    features: [
      'realtime_alerts',
      'escape_route',
      'sos_rescue',
      'offline_map',
      'auto_rescue'
    ]
  },
  family: {
    id: 'family',
    name: 'family',
    price: 99.99,
    duration: 30,
    features: [
      'personal_all',
      'family_location',
      'family_sync',
      'max_5_members'
    ]
  }
};

const FEATURE_LABELS: Record<string, Record<string, string>> = {
  zh: {
    realtime_alerts: '实时预警',
    escape_route: '逃生路线导航',
    sos_rescue: 'SOS紧急救援',
    offline_map: '离线地图',
    auto_rescue: '自动救援',
    personal_all: '个人方案全部功能',
    family_location: '家人位置共享',
    family_sync: '家人预警同步',
    max_5_members: '最多5人'
  },
  en: {
    realtime_alerts: 'Real-time Alerts',
    escape_route: 'Escape Route Navigation',
    sos_rescue: 'SOS Emergency Rescue',
    offline_map: 'Offline Maps',
    auto_rescue: 'Auto Rescue',
    personal_all: 'All Personal Plan Features',
    family_location: 'Family Location Sharing',
    family_sync: 'Family Alert Sync',
    max_5_members: 'Up to 5 Members'
  }
};

export default function Subscription() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [appleProducts, setAppleProducts] = useState<AppleProduct[]>([]);
  const [isIOS, setIsIOS] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [referral, setReferral] = useState<{ code: string; availableCoupons: number; referredCount: number } | null>(null);

  // Initialize Apple IAP on mount
  useEffect(() => {
    const init = async () => {
      const native = isNativeIOS();
      setIsIOS(native);

      if (native) {
        const initialized = await initializeIAP();
        if (initialized) {
          const products = await fetchProducts();
          setAppleProducts(products);
        }
        // Don't show error here - only show when user tries to purchase
      }

      await fetchPlans();
      await fetchSubscriptionStatus();
      await fetchReferral();
    };
    init();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('apple-iap', {
        body: { action: 'get-products' }
      });

      if (error) throw error;

      const plansList = Object.values(PLANS).map((plan) => ({
        ...plan,
        name: plan.id === 'personal' ? (t('personalPlan') || 'Personal Plan') : (t('familyPlan') || 'Family Plan')
      }));

      setPlans(plansList);
    } catch (e) {
      setPlans(Object.values(PLANS).map((plan) => ({
        ...plan,
        name: plan.id === 'personal' ? (t('personalPlan') || 'Personal Plan') : (t('familyPlan') || 'Family Plan')
      })));
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('apple-iap', {
        body: { action: 'get-subscription-status' }
      });

      if (error) throw error;
      setCurrentSubscription(data);
    } catch (e) {
      console.error('Failed to fetch subscription:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferral = async () => {
    try {
      const { data } = await supabase.functions.invoke('apple-iap', { body: { action: 'get-referral' } });
      if (data?.code) setReferral({ code: data.code, availableCoupons: data.availableCoupons || 0, referredCount: data.referredCount || 0 });
    } catch (e) { /* ignore */ }
  };

  // Apple IAP purchase flow
  const handleSelectPlan = async (planId: string) => {
    if (purchasing) return;
    setSelectedPlan(planId);

    if (!isIOS) {
      setPaymentMessage({
        type: 'info',
        text: language === 'zh'
          ? '请在 iOS App 中完成订阅购买'
          : 'Please complete the subscription purchase in the iOS App'
      });
      return;
    }

    const productId = PLAN_TO_PRODUCT[planId];
    if (!productId) {
      setPaymentMessage({ type: 'error', text: 'Product not found' });
      return;
    }

    setPurchasing(true);
    setPaymentMessage(null);

    try {
      // 若有可用券，先向后端签发促销优惠（50% off），带券购买；签券失败则按原价
      let offer: any = undefined;
      let usedCoupon = false;
      if ((referral?.availableCoupons || 0) > 0) {
        try {
          const { data: sig } = await supabase.functions.invoke('apple-iap', {
            body: { action: 'sign-promo-offer', productId },
          });
          if (sig?.eligible && sig?.signature) {
            offer = {
              offerId: sig.offerId, keyId: sig.keyId, nonce: sig.nonce,
              timestamp: sig.timestamp, signature: sig.signature, appAccountToken: sig.username,
            };
            usedCoupon = true;
          }
        } catch (e) { /* 签券失败按原价 */ }
      }

      // Initiate Apple IAP purchase（带券或原价）
      const result = await purchaseProduct(productId, offer);

      if (!result.success) {
        if (result.error === 'cancelled') {
          // User cancelled - not an error
          setPurchasing(false);
          setSelectedPlan(null);
          return;
        }
        throw new Error(result.error || 'Purchase failed');
      }

      // Send receipt to server for verification
      setPaymentMessage({
        type: 'info',
        text: language === 'zh' ? '正在验证购买...' : 'Verifying purchase...'
      });

      const { data, error } = await supabase.functions.invoke('apple-iap', {
        body: {
          action: 'verify-receipt',
          receiptData: result.receiptData,
          jwsTransaction: result.jwsTransaction,
          transactionId: result.transactionId,
          productId,
        }
      });

      if (error) throw error;

      if (data.success) {
        // 带券购买成功 → 核销券（仅当券确实生效；iOS<17.4 不支持则不核销，券自动释放）
        if (usedCoupon && result.offerApplied) {
          try {
            await supabase.functions.invoke('apple-iap', {
              body: { action: 'consume-coupon', transactionId: result.transactionId },
            });
          } catch (e) { /* ignore */ }
          await fetchReferral();
        }
        // Finish the transaction with StoreKit
        if (result.transactionId) {
          await finishTransaction(result.transactionId);
        }

        setPaymentMessage({
          type: 'success',
          text: language === 'zh' ? '订阅成功！' : 'Subscription activated!'
        });
        await fetchSubscriptionStatus();
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (e: any) {
      console.error('Purchase error:', e);
      setPaymentMessage({
        type: 'error',
        text: e.message || (language === 'zh' ? '购买失败，请重试' : 'Purchase failed, please try again')
      });
    } finally {
      setPurchasing(false);
      setSelectedPlan(null);
    }
  };

  // Restore purchases
  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    setPaymentMessage(null);

    try {
      const result = await restorePurchases();

      if (!result.success) {
        throw new Error(result.error || 'Restore failed');
      }

      if (result.receiptData) {
        const { data, error } = await supabase.functions.invoke('apple-iap', {
          body: {
            action: 'restore-purchases',
            receiptData: result.receiptData,
          }
        });

        if (error) throw error;

        if (data.restoredCount > 0) {
          setPaymentMessage({
            type: 'success',
            text: language === 'zh'
              ? `已恢复 ${data.restoredCount} 个订阅`
              : `Restored ${data.restoredCount} subscription(s)`
          });
          await fetchSubscriptionStatus();
        } else {
          setPaymentMessage({
            type: 'info',
            text: language === 'zh' ? '没有找到可恢复的订阅' : 'No subscriptions to restore'
          });
        }
      }
    } catch (e: any) {
      console.error('Restore error:', e);
      setPaymentMessage({
        type: 'error',
        text: e.message || (language === 'zh' ? '恢复失败' : 'Restore failed')
      });
    } finally {
      setRestoring(false);
    }
  };

  // Apple handles refunds - redirect to Apple subscription management
  const handleManageSubscription = () => {
    if (isIOS) {
      // Open Apple subscription management page
      window.location.href = 'https://apps.apple.com/account/subscriptions';
    } else {
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    }
  };

  const getFeatureLabel = (feature: string) => {
    return FEATURE_LABELS[language]?.[feature] || feature;
  };

  // Get Apple price for a plan (from StoreKit products)
  const getApplePrice = (planId: string): string | null => {
    const productId = PLAN_TO_PRODUCT[planId];
    const product = appleProducts.find(p => p.productId === productId);
    return product?.price || null;
  };

  // Get the introductory offer for a plan — only when the CURRENT user is eligible
  // (new subscriber). StoreKit auto-applies it at checkout; we just surface it here.
  const getIntroOffer = (planId: string): IntroductoryOffer | null => {
    const productId = PLAN_TO_PRODUCT[planId];
    const product = appleProducts.find(p => p.productId === productId);
    if (!product || !product.introEligible || !product.introductoryOffer) return null;
    return product.introductoryOffer;
  };

  // Build a human-readable two-line label for an intro offer.
  const formatIntroOffer = (offer: IntroductoryOffer): { line1: string; line2: string } => {
    const zh = language === 'zh';
    const uz: Record<string, string> = { day: '天', week: '周', month: '个月', year: '年' };
    const ue: Record<string, string> = { day: 'day', week: 'week', month: 'month', year: 'year' };
    const n = offer.periodValue;
    const periodZh = `${n}${uz[offer.periodUnit] || ''}`;
    const periodEn = `${n} ${ue[offer.periodUnit] || ''}${n > 1 ? 's' : ''}`;
    const tail = { line2: zh ? '到期后按下方价格自动续订' : 'then renews at the price below' };
    if (offer.paymentMode === 'free_trial') {
      return { line1: zh ? `新用户首 ${periodZh}免费试用` : `Free for your first ${periodEn}`, ...tail };
    }
    if (offer.paymentMode === 'pay_up_front') {
      return { line1: zh ? `新用户首 ${periodZh}仅 ${offer.displayPrice}` : `${offer.displayPrice} for your first ${periodEn}`, ...tail };
    }
    if (offer.paymentMode === 'pay_as_you_go') {
      const c = offer.periodCount;
      const totalEn = `${c} ${ue[offer.periodUnit] || ''}${c > 1 ? 's' : ''}`;
      return { line1: zh ? `新用户前 ${c} 期每期仅 ${offer.displayPrice}` : `${offer.displayPrice} each for your first ${totalEn}`, ...tail };
    }
    return { line1: zh ? `新用户介绍性优惠 ${offer.displayPrice}` : `Introductory offer: ${offer.displayPrice}`, ...tail };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center flex-col gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      {paymentMessage && (
        <div className={`fixed top-0 left-0 right-0 z-[100] p-4 text-center text-sm font-medium ${
          paymentMessage.type === 'success' ? 'bg-green-600' :
          paymentMessage.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {paymentMessage.text}
          <button onClick={() => setPaymentMessage(null)} className="ml-4 underline">x</button>
        </div>
      )}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-white">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">{t('subscribe')}</span>
            </div>
            {isIOS && (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${restoring ? 'animate-spin' : ''}`} />
                {language === 'zh' ? '恢复购买' : 'Restore'}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {referral && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-red-500/15 to-orange-500/15 border border-red-500/30 rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold">
                {language === 'zh' ? '邀请好友 · 得 50% 续费券' : 'Refer friends · Earn 50%-off coupons'}
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              {language === 'zh'
                ? '好友用你的推荐码注册成功，你即得 1 张 50% off 续费券（3 个月内有效，每次用 1 张）。'
                : 'When a friend signs up with your code you earn a 50%-off renewal coupon (valid 3 months, one per renewal).'}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-800/70 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-400">{language === 'zh' ? '我的推荐码' : 'Your code'}</span>
                <span className="font-mono font-bold tracking-widest text-red-300">{referral.code}</span>
                <button
                  onClick={() => {
                    try { navigator.clipboard?.writeText(referral.code); } catch (e) { /* ignore */ }
                    setPaymentMessage({ type: 'info', text: language === 'zh' ? '推荐码已复制' : 'Code copied' });
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {language === 'zh' ? '复制' : 'Copy'}
                </button>
              </div>
              <div className="text-sm text-slate-300">
                {language === 'zh' ? '可用券' : 'Coupons'}: <span className="font-bold text-green-400">{referral.availableCoupons}</span>
                {'  ·  '}
                {language === 'zh' ? '已推荐' : 'Referred'}: <span className="font-bold">{referral.referredCount}</span>
              </div>
            </div>
            {referral.availableCoupons > 0 && (
              <p className="text-xs text-green-400 mt-2">
                {language === 'zh'
                  ? '✓ 你有可用半价券，下单时会自动以 50% off 续费。'
                  : '✓ You have a coupon — checkout will automatically apply 50% off.'}
              </p>
            )}
          </motion.div>
        )}

        {currentSubscription?.hasSubscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-6 h-6 text-green-400" />
              <h3 className="font-semibold text-green-400">
                {currentSubscription.planId === 'personal' ? (t('personalPlan') || 'Personal Plan') : (t('familyPlan') || 'Family Plan')} {t('active')}
              </h3>
            </div>
            <p className="text-slate-300">
              {t('timeRemaining')}: {currentSubscription.daysUntilExpiry} {t('days')}
            </p>
            {currentSubscription.isExpiringSoon && (
              <p className="text-amber-400 text-sm mt-2">
                {t('warning')}: {t('subscriptionExpiringSoon')}
              </p>
            )}
            <button
              onClick={handleManageSubscription}
              className="mt-4 px-4 py-2 text-sm bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {language === 'zh' ? '管理订阅' : 'Manage Subscription'}
            </button>
          </motion.div>
        )}

        {currentSubscription?.isTrialActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-amber-400" />
              <h3 className="font-semibold text-amber-400">{t('trial')} {t('active')}</h3>
            </div>
            <p className="text-slate-300">
              {t('timeRemaining')}: {Math.ceil((new Date(currentSubscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} {t('days')}
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">{t('choosePlan')}</h1>
          <p className="text-slate-400">{t('subscriptionDesc')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan, index) => {
            const applePrice = getApplePrice(plan.id);
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-slate-800/50 border rounded-2xl p-6 ${
                  selectedPlan === plan.id
                    ? 'border-red-500 ring-2 ring-red-500/20'
                    : 'border-slate-700 hover:border-slate-600'
                } transition-all`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    plan.id === 'personal' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                  }`}>
                    {plan.id === 'personal' ? (
                      <Shield className="w-6 h-6 text-blue-400" />
                    ) : (
                      <Users className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-slate-400 text-sm">{plan.duration} {t('days')}</p>
                  </div>
                </div>

                <div className="mb-6">
                  {(() => {
                    const intro = getIntroOffer(plan.id);
                    if (!intro) return null;
                    const { line1, line2 } = formatIntroOffer(intro);
                    return (
                      <div className="mb-3 inline-flex flex-col gap-0.5 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                        <span className="text-green-400 text-sm font-semibold flex items-center gap-1.5">
                          <Gift className="w-4 h-4" />
                          {line1}
                        </span>
                        <span className="text-green-300/70 text-xs">{line2}</span>
                      </div>
                    );
                  })()}
                  <div className="flex items-baseline gap-2">
                    {applePrice ? (
                      <span className="text-4xl font-bold">{applePrice}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">$</span>
                        <span className="text-4xl font-bold">{plan.price.toFixed(2)}</span>
                      </>
                    )}
                    <span className="text-slate-400">/{t('month')}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-slate-300">{getFeatureLabel(feature)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={purchasing}
                  className={`w-full h-12 rounded-xl font-semibold transition-all disabled:opacity-50 ${
                    purchasing && selectedPlan === plan.id
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {purchasing && selectedPlan === plan.id
                    ? (language === 'zh' ? '处理中...' : 'Processing...')
                    : (language === 'zh' ? '订阅' : 'Subscribe')}
                </button>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            {t('inviteReward')}
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            {t('inviteDesc')}
          </p>
          <Link
            to="/invite-friends"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300"
          >
            {t('inviteFriends')}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Apple required subscription terms */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>{language === 'zh' ? '订阅将通过您的 Apple ID 账户付款' : 'Payment will be charged to your Apple ID account'}</p>
          <p>{language === 'zh' ? '订阅会自动续费，除非在当前周期结束前至少24小时关闭自动续费' : 'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period'}</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white underline">
              {language === 'zh' ? '使用条款' : 'Terms of Use'}
            </a>
            <a href="#/privacy" className="text-slate-400 hover:text-white underline">
              {language === 'zh' ? '隐私政策' : 'Privacy Policy'}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
