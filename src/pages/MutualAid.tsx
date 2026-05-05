import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  MapPin,
  Navigation,
  Clock,
  AlertCircle,
  ChevronRight,
  Bell,
  Users,
  Siren,
  Settings,
  Info,
  Shield,
  Eye,
  EyeOff,
  Globe,
  Home,
  SlidersHorizontal,
  Search,
  Filter,
  X,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Award
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { useGeolocation } from '../hooks/useGeolocation';
import type { Tables } from '../supabase/types';

type SOSRecord = Tables<'sos_records'>;
type MutualAidSubscription = Tables<'mutual_aid_subscriptions'>;
type Profile = Tables<'profiles'>;

interface NearbySOS extends SOSRecord {
  distance: number;
  direction: string;
  timeRemaining: number;
  responderCount?: number;
}

export default function MutualAid() {
  const navigate = useNavigate();
  const { t, language, setLanguage, languages, dir } = useI18n();
  const { location, calculateDistance, getDirection } = useGeolocation();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<MutualAidSubscription | null>(null);
  const [nearbySOS, setNearbySOS] = useState<NearbySOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDistance, setFilterDistance] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'responding'>('all');
  const [showSOSDetail, setShowSOSDetail] = useState<NearbySOS | null>(null);
  const [userStats, setUserStats] = useState({ responses: 0, helped: 0, points: 0 });

  useEffect(() => {
    fetchSubscription();
    fetchUserStats();
    const interval = setInterval(fetchNearbySOS, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location && isSubscribed) {
      fetchNearbySOS();
    }
  }, [location, isSubscribed, filterDistance, filterStatus]);

  const fetchSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('mutual_aid_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSubscription(data);
      setIsSubscribed(data.is_active || false);
    }
    setLoading(false);
  };

  const fetchUserStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: responses } = await supabase
      .from('mutual_aid_responses')
      .select('*')
      .eq('responder_id', user.id);

    if (responses) {
      setUserStats({
        responses: responses.length,
        helped: responses.filter(r => r.status === 'completed').length,
        points: responses.length * 10
      });
    }
  };

  const fetchNearbySOS = useCallback(async () => {
    if (!location || !isSubscribed) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sosRecords } = await supabase
      .from('sos_records')
      .select('*, mutual_aid_responses(count)')
      .eq('status', filterStatus === 'all' ? 'active' : filterStatus)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sosRecords) {
      const nearby = sosRecords
        .filter((sos) => sos.latitude && sos.longitude)
        .map((sos) => {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            sos.latitude!,
            sos.longitude!
          );
          const direction = getDirection(
            location.latitude,
            location.longitude,
            sos.latitude!,
            sos.longitude!
          );
          const createdAt = new Date(sos.created_at || '');
          const timeElapsed = (Date.now() - createdAt.getTime()) / 1000 / 60;
          const timeRemaining = Math.max(0, 15 - timeElapsed);

          return {
            ...sos,
            distance,
            direction,
            timeRemaining,
            responderCount: sos.mutual_aid_responses?.length || 0
          };
        })
        .filter((sos) => sos.distance <= filterDistance)
        .sort((a, b) => a.distance - b.distance);

      setNearbySOS(nearby);
    }
  }, [location, isSubscribed, filterDistance, filterStatus, calculateDistance, getDirection]);

  const toggleSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isSubscribed) {
      await supabase
        .from('mutual_aid_subscriptions')
        .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
        .eq('user_id', user.id);
      setIsSubscribed(false);
    } else {
      const { data: existing } = await supabase
        .from('mutual_aid_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('mutual_aid_subscriptions')
          .update({ is_active: true, unsubscribed_at: null })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('mutual_aid_subscriptions')
          .insert({ user_id: user.id, is_active: true });
      }
      setIsSubscribed(true);
      fetchNearbySOS();
    }
  };

  const handleNavigate = (sos: NearbySOS) => {
    if (sos.latitude && sos.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${sos.latitude},${sos.longitude}`;
      window.open(url, '_blank');
    }
  };

  const handleRespond = async (sosId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('mutual_aid_responses').insert({
      sos_id: sosId,
      responder_id: user.id,
      status: 'responding'
    });

    fetchNearbySOS();
    fetchUserStats();
  };

  const formatDistance = (distance: number) => {
    if (distance < 0.1) {
      return `${(distance * 1000).toFixed(0)}${t('m')}`;
    }
    return `${distance.toFixed(1)}${t('km')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 md:pb-6" dir={dir}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <HeartHandshake className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">{t('mutualAid') || '互助'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterModal(true)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                <Filter className="w-5 h-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
                >
                  <Globe className="w-5 h-5" />
                </button>
                {showLangMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-800 transition-colors ${
                          language === lang.code ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
              <Link to="/settings" className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50">
                <Settings className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500/30 rounded-xl flex items-center justify-center">
                <Info className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">{t('mutualAidInfo') || '1公里互助'}</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    {t('nearbySOS') || '接收附近1公里内的SOS求助'}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    {t('timeRemaining') || '15分钟响应时间'}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    {t('privacyNotice') || '位置信息仅用于计算距离'}
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <Award className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <p className="text-xl font-bold">{userStats.responses}</p>
              <p className="text-xs text-slate-400">{t('responses') || '响应次数'}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <HeartHandshake className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <p className="text-xl font-bold">{userStats.helped}</p>
              <p className="text-xs text-slate-400">{t('helped') || '已帮助'}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-xl font-bold">{userStats.points}</p>
              <p className="text-xs text-slate-400">{t('points') || '积分'}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('subscribe') || '订阅互助'}</h3>
                  <p className="text-sm text-slate-400">{t('monitorRadius') || '监控范围'}: {filterDistance}{t('km')}</p>
                </div>
              </div>
              <button
                onClick={toggleSubscription}
                className={`relative w-16 h-9 rounded-full transition-colors ${
                  isSubscribed ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <motion.div
                  animate={{ x: isSubscribed ? 28 : 4 }}
                  className="absolute top-1 w-7 h-7 bg-white rounded-full shadow-md"
                />
              </button>
            </div>

            {subscription && (subscription.total_rewards ?? 0) > 0 && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {t('reward') || '奖励'}: {subscription.total_rewards}
                  </span>
                </div>
              </div>
            )}

            {!isSubscribed && (
              <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-400 text-center">{t('subscribeToSee') || '订阅后可查看附近的SOS求助'}</p>
              </div>
            )}
          </motion.div>

          {isSubscribed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="relative h-48 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full relative z-10">
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping" />
                  </div>
                </div>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                  <circle cx="200" cy="100" r="80" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  <circle cx="200" cy="100" r="120" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
                </svg>
                {nearbySOS.slice(0, 3).map((sos, index) => (
                  <motion.div
                    key={sos.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute"
                    style={{
                      left: `${30 + index * 25}%`,
                      top: `${20 + index * 20}%`
                    }}
                  >
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                      <Siren className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                ))}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="text-slate-400">{t('yourLocation') || '您的位置'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-slate-400">SOS</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
                    className="text-amber-400 flex items-center gap-1 text-sm"
                  >
                    {showPrivacyInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {t('privacy') || '隐私'}
                  </button>
                </div>
              </div>

              {showPrivacyInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300"
                >
                  <p className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5 text-amber-400" />
                    {t('privacyNotice') || '您的精确位置不会显示给其他用户，仅用于计算距离'}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {isSubscribed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <h3 className="font-semibold">{t('nearbySOS') || '附近求助'}</h3>
                </div>
                <span className="text-sm text-slate-400">{nearbySOS.length}</span>
              </div>

              <div className="space-y-3">
                {nearbySOS.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                    <HeartHandshake className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-400">{t('noNearbySOS') || '附近暂无求助'}</p>
                    <p className="text-sm text-slate-500 mt-1">{t('keepWatching') || '继续保持关注'}</p>
                  </div>
                ) : (
                  nearbySOS.map((sos, index) => (
                    <motion.div
                      key={sos.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setShowSOSDetail(sos)}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Siren className="w-6 h-6 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                              SOS
                            </span>
                            <span className="text-sm text-slate-400">
                              {formatDistance(sos.distance)}
                            </span>
                            <span className="text-sm text-slate-400">{sos.direction}</span>
                          </div>
                          <p className="text-sm text-slate-300 mb-2 truncate">{sos.address || t('location')}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.ceil(sos.timeRemaining)} {t('minutes')}
                            </span>
                            {(sos.responderCount ?? 0) > 0 && (
                              <span className="flex items-center gap-1 text-green-400">
                                <HeartHandshake className="w-3 h-3" />
                                {sos.responderCount} {t('responding')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t('filter') || '筛选'}</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">{t('distance') || '距离范围'}</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.5"
                    value={filterDistance}
                    onChange={(e) => setFilterDistance(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16">{filterDistance}km</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">{t('status') || '状态'}</label>
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: t('all') || '全部' },
                    { id: 'active', label: t('active') || '待响应' },
                    { id: 'responding', label: t('responding') || '响应中' }
                  ].map((status) => (
                    <button
                      key={status.id}
                      onClick={() => setFilterStatus(status.id as typeof filterStatus)}
                      className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        filterStatus === status.id
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowFilterModal(false)}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl font-semibold text-white"
              >
                {t('apply') || '应用'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSOSDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80"
            onClick={() => setShowSOSDetail(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t('sosDetail') || '求助详情'}</h3>
                <button
                  onClick={() => setShowSOSDetail(null)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                  <Siren className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">SOS</span>
                    <span className="text-sm text-slate-400">{formatDistance(showSOSDetail.distance)}</span>
                  </div>
                  <p className="text-slate-300 mt-1">{showSOSDetail.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-slate-800/50 rounded-xl text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <p className="text-lg font-bold">{Math.ceil(showSOSDetail.timeRemaining)}</p>
                  <p className="text-xs text-slate-400">{t('minutesRemaining') || '分钟剩余'}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl text-center">
                  <HeartHandshake className="w-5 h-5 mx-auto mb-1 text-green-400" />
                  <p className="text-lg font-bold">{showSOSDetail.responderCount || 0}</p>
                  <p className="text-xs text-slate-400">{t('responders') || '响应者'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleNavigate(showSOSDetail)}
                  className="flex-1 h-12 bg-blue-500/20 text-blue-400 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-500/30 transition-colors"
                >
                  <Navigation className="w-5 h-5" />
                  {t('navigate') || '导航'}
                </button>
                <button
                  onClick={() => {
                    handleRespond(showSOSDetail.id);
                    setShowSOSDetail(null);
                  }}
                  className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                >
                  <HeartHandshake className="w-5 h-5" />
                  {t('respond') || '响应'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50 md:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <Link to="/dashboard" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Home className="w-6 h-6" />
              <span className="text-xs">{t('home')}</span>
            </Link>
            <Link to="/shelters" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Shield className="w-6 h-6" />
              <span className="text-xs">{t('shelters') || '避难所'}</span>
            </Link>
            <Link to="/dashboard" className="flex flex-col items-center gap-1 p-2 -mt-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <Siren className="w-7 h-7 text-white" />
              </div>
            </Link>
            <Link to="/family-settings" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Users className="w-6 h-6" />
              <span className="text-xs">{t('family')}</span>
            </Link>
            <Link to="/mutual-aid" className="flex flex-col items-center gap-1 p-2 text-amber-400">
              <HeartHandshake className="w-6 h-6" />
              <span className="text-xs">{t('mutualAid')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
