import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  MapPin,
  Users,
  Phone,
  Clock,
  Navigation,
  Droplets,
  Zap,
  Stethoscope,
  BedDouble,
  Share2,
  Heart,
  AlertTriangle,
  CheckCircle2,
  X,
  Siren,
  Home,
  Star,
  MessageSquare,
  ChevronRight,
  Wifi,
  Utensils,
  Thermometer
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { STATIC_SHELTERS } from '../data/shelters';
import type { Tables } from '../supabase/types';

type Shelter = Tables<'shelters'>;

const getFacilityIcons = (t: (key: string) => string) => ({
  has_water: { icon: Droplets, label: t('drinkingWater') || '饮用水', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  has_electricity: { icon: Zap, label: t('electricity') || '电力供应', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  has_medical: { icon: Stethoscope, label: t('medical') || '医疗设施', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  has_toilet: { icon: BedDouble, label: t('toilet') || '卫生间', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  has_rest_area: { icon: BedDouble, label: t('restArea') || '休息区', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  has_wifi: { icon: Wifi, label: t('wifi') || 'WiFi', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  has_food: { icon: Utensils, label: t('food') || '食物供应', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  has_heating: { icon: Thermometer, label: t('heating') || '供暖', color: 'text-rose-400', bgColor: 'bg-rose-500/20' }
});

const getStatusConfig = (t: (key: string) => string) => ({
  open: { label: t('open') || '开放中', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle2 },
  crowded: { label: t('crowded') || '拥挤', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: AlertTriangle },
  full: { label: t('full') || '已满', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: X },
  closed: { label: t('closed') || '已关闭', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: X }
});

export default function ShelterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'reviews' | 'photos'>('info');

  useEffect(() => {
    if (id) {
      fetchShelter();
      checkFavorite();
    }
  }, [id]);

  const fetchShelter = async () => {
    const { data } = await supabase
      .from('shelters')
      .select('*')
      .eq('id', id!)
      .single();

    if (data) {
      setShelter(data);
    } else {
      const fallback = STATIC_SHELTERS.find(s => s.id === id);
      if (fallback) setShelter(fallback as any);
    }
    setLoading(false);
  };

  const checkFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && id) {
      const { data } = await supabase
        .from('favorite_shelters')
        .select('*')
        .eq('user_id', user.id)
        .eq('shelter_id', id)
        .maybeSingle();
      setIsFavorite(!!data);
    }
  };

  const toggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;

    if (isFavorite) {
      await supabase
        .from('favorite_shelters')
        .delete()
        .eq('user_id', user.id)
        .eq('shelter_id', id);
    } else {
      await supabase
        .from('favorite_shelters')
        .insert({ user_id: user.id, shelter_id: id });
    }
    setIsFavorite(!isFavorite);
  };

  const handleNavigate = () => {
    if (shelter?.latitude && shelter?.longitude) {
      navigate(`/navigation?name=${encodeURIComponent(shelter.name || '')}&address=${encodeURIComponent(shelter.address || '')}&lat=${shelter.latitude}&lng=${shelter.longitude}`);
    }
  };

  const handleShare = async () => {
    if (navigator.share && shelter) {
      try {
        await navigator.share({
          title: shelter.name,
          text: `避难所: ${shelter.name} - ${shelter.address}`,
          url: window.location.href
        });
      } catch {
        setShowShareModal(true);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!shelter) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">{t('shelterNotFound') || '避难所信息不存在'}</p>
        </div>
      </div>
    );
  }

  const status = getStatusConfig(t)[(shelter.status || 'closed') as keyof ReturnType<typeof getStatusConfig>];
  const StatusIcon = status.icon;
  const occupancyPercent = shelter.capacity
    ? Math.round(((shelter.current_occupancy || 0) / shelter.capacity) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">{t('shelterDetail') || '避难所详情'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFavorite}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite ? 'text-red-400 bg-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-green-500/20 rounded-3xl flex items-center justify-center">
              <Shield className="w-12 h-12 text-green-400" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${status.bgColor} ${status.color} flex items-center gap-1`}>
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </span>
              {shelter.is_verified && (
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('verified') || '已认证'}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold mb-2">{shelter.name}</h1>
            <div className="flex items-start gap-1 text-slate-400">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{shelter.address}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-xl font-bold">{shelter.current_occupancy || 0}</p>
              <p className="text-xs text-slate-400">{t('current') || '当前人数'}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <Shield className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <p className="text-xl font-bold">{shelter.capacity || '-'}</p>
              <p className="text-xs text-slate-400">{t('capacity') || '总容量'}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <p className="text-xl font-bold">4.8</p>
              <p className="text-xs text-slate-400">{t('rating') || '评分'}</p>
            </div>
          </motion.div>

          {shelter.capacity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">{t('occupancyRate') || '使用率'}</span>
                <span className={`text-sm font-medium ${
                  occupancyPercent > 90 ? 'text-red-400' :
                  occupancyPercent > 70 ? 'text-amber-400' : 'text-green-400'
                }`}>
                  {occupancyPercent}%
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${occupancyPercent}%` }}
                  className={`h-full rounded-full ${
                    occupancyPercent > 90 ? 'bg-red-500' :
                    occupancyPercent > 70 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                />
              </div>
              <p className="text-sm text-slate-400 mt-2">
                {t('remaining') || '剩余空位'}: {shelter.capacity - (shelter.current_occupancy || 0)} {t('people') || '人'}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
          >
            <h3 className="font-semibold mb-4">{t('facilities') || '设施信息'}</h3>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(getFacilityIcons(t)).map(([key, config]) => {
                const hasFacility = shelter[key as keyof Shelter];
                const Icon = config.icon;
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-xl text-center transition-all ${
                      hasFacility
                        ? `${config.bgColor} ${config.color}`
                        : 'bg-slate-800/30 text-slate-600'
                    }`}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-xs">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
          >
            <h3 className="font-semibold mb-4">{t('contactInfo') || '联系信息'}</h3>
            <div className="space-y-3">
              {shelter.phone && (
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">{t('phone') || '联系电话'}</p>
                    <p className="font-medium">{shelter.phone}</p>
                  </div>
                  <a
                    href={`tel:${shelter.phone}`}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                  >
                    {t('call') || '拨打'}
                  </a>
                </div>
              )}

              {shelter.opening_hours && (
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">{t('openingHours') || '开放时间'}</p>
                    <p className="font-medium">{shelter.opening_hours}</p>
                  </div>
                </div>
              )}

              {shelter.manager_name && (
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">{t('manager') || '负责人'}</p>
                    <p className="font-medium">{shelter.manager_name}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {shelter.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
            >
              <h3 className="font-semibold mb-2">{t('description') || '简介'}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{shelter.description}</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex gap-3"
          >
            <button
              onClick={handleNavigate}
              className="flex-1 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/30 transition-all"
            >
              <Navigation className="w-5 h-5" />
              {t('navigate') || '导航前往'}
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="h-14 px-4 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t('share') || '分享'}</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center gap-3 p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  <Share2 className="w-5 h-5 text-blue-400" />
                  <span>{t('copyLink') || '复制链接'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full"
            >
              {reportSubmitted ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('reportSubmitted') || '已提交'}</h3>
                  <p className="text-slate-400 text-sm mb-4">{t('reportThankYou') || '感谢您的反馈，我们会尽快核实处理'}</p>
                  <button
                    onClick={() => { setShowReportModal(false); setReportSubmitted(false); setReportReason(''); }}
                    className="w-full h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    {t('close') || '关闭'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t('reportIssue') || '报告问题'}</h3>
                    <p className="text-slate-400 text-sm">{t('reportDescription') || '报告此避难所的信息问题'}</p>
                  </div>
                  <div className="space-y-2 mb-4">
                    {[
                      { key: 'closed', label: t('reportClosed') || '避难所已关闭' },
                      { key: 'wrong_location', label: t('reportWrongLocation') || '位置信息不准确' },
                      { key: 'no_resources', label: t('reportNoResources') || '设施/物资不符' },
                      { key: 'unsafe', label: t('reportUnsafe') || '存在安全隐患' },
                      { key: 'other', label: t('reportOther') || '其他问题' },
                    ].map(r => (
                      <button
                        key={r.key}
                        onClick={() => setReportReason(r.key)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                          reportReason === r.key
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        if (!reportReason || !shelter) return;
                        setReportSubmitting(true);
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          await supabase.from('shelter_update_logs').insert({
                            shelter_id: shelter.id,
                            update_type: 'report',
                            changed_fields: { reason: reportReason },
                            updated_by: user?.id || 'anonymous',
                          });
                        } catch { /* best effort */ }
                        setReportSubmitted(true);
                        setReportSubmitting(false);
                      }}
                      disabled={!reportReason || reportSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl font-semibold text-white disabled:opacity-50"
                    >
                      {reportSubmitting ? (t('submitting') || '提交中...') : (t('submitReport') || '提交报告')}
                    </button>
                    <button
                      onClick={() => { setShowReportModal(false); setReportReason(''); }}
                      className="w-full h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      {t('cancel') || '取消'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white"
            >
              <Home className="w-6 h-6" />
              <span className="text-xs">{t('home')}</span>
            </button>
            <button
              onClick={() => navigate('/shelters')}
              className="flex flex-col items-center gap-1 p-2 text-green-400"
            >
              <Shield className="w-6 h-6" />
              <span className="text-xs">{t('shelters') || '避难所'}</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex flex-col items-center gap-1 p-2 -mt-4"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <Siren className="w-7 h-7 text-white" />
              </div>
            </button>
            <button
              onClick={() => navigate('/family-settings')}
              className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white"
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">{t('family')}</span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white"
            >
              <Shield className="w-6 h-6" />
              <span className="text-xs">{t('settings')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
