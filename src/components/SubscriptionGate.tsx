import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { useSubscription, PaidFeature } from '../hooks/useSubscription';
import { useI18n } from '../hooks/useI18n';

interface SubscriptionGateProps {
  feature: PaidFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FEATURE_NAMES: Record<string, Record<PaidFeature, string>> = {
  en: {
    sos_rescue: 'SOS Emergency Rescue',
    escape_route: 'Escape Route Navigation',
    auto_rescue: 'Auto Rescue',
    mutual_aid: 'Mutual Aid Rescue',
    realtime_push_alerts: 'Real-time Push Alerts',
    family_location: 'Family Location Sharing',
    family_sync: 'Family Alert Sync',
  },
  zh: {
    sos_rescue: 'SOS紧急救援',
    escape_route: '逃生路线导航',
    auto_rescue: '自动救援',
    mutual_aid: '互助救援',
    realtime_push_alerts: '实时推送预警',
    family_location: '家人位置共享',
    family_sync: '家人预警同步',
  },
};

/**
 * Wraps content that requires a subscription.
 * Shows a paywall prompt if user doesn't have access.
 */
export default function SubscriptionGate({ feature, children, fallback }: SubscriptionGateProps) {
  const { canAccessFeature, canAccessFamilyFeature, loading } = useSubscription();
  const { language } = useI18n();
  const navigate = useNavigate();

  if (loading) {
    return <>{children}</>;
  }

  const isFamilyFeature = feature === 'family_location' || feature === 'family_sync';
  const hasAccess = isFamilyFeature ? canAccessFamilyFeature() : canAccessFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const featureName = FEATURE_NAMES[language]?.[feature] || FEATURE_NAMES['en'][feature];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            {language === 'zh' ? '高级功能' : 'Premium Feature'}
          </h2>

          <p className="text-slate-400 text-sm mb-4">
            {language === 'zh'
              ? `「${featureName}」需要订阅才能使用`
              : `"${featureName}" requires a subscription`}
          </p>

          <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
              <Crown className="w-4 h-4" />
              {language === 'zh' ? '解锁全部功能' : 'Unlock All Features'}
            </div>
            <p className="text-slate-400 text-xs">
              {language === 'zh'
                ? '订阅后可使用 SOS 紧急救援、逃生路线、自动救援等全部功能'
                : 'Subscribe to access SOS Rescue, Escape Routes, Auto Rescue and more'}
            </p>
          </div>

          <button
            onClick={() => navigate('/subscription')}
            className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-red-500/25 transition-all flex items-center justify-center gap-2"
          >
            {language === 'zh' ? '查看订阅方案' : 'View Plans'}
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate(-1)}
            className="mt-3 w-full h-10 text-slate-400 text-sm hover:text-white transition-colors"
          >
            {language === 'zh' ? '返回' : 'Go Back'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
