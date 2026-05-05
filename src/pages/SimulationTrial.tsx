import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  Shield,
  Smartphone,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Play,
  ChevronRight,
  MapPin,
  Zap,
  Radio,
  Siren,
  X,
  Navigation,
  Users,
  Volume2,
  Eye,
  Map,
  ArrowRight,
  Activity,
  Bomb,
  Swords,
  Moon
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { useDemo } from '../App';
import { useSubscription } from '../hooks/useSubscription';
import SubscriptionGate from '../components/SubscriptionGate';
import type { Tables } from '../supabase/types';

type SimulationTrial = Tables<'simulation_trials'>;
type SimulationAlert = Tables<'simulation_alerts'>;
type SimulationNotification = Tables<'simulation_notifications'>;

interface AlertWithNotifications extends SimulationAlert {
  simulation_notifications?: SimulationNotification[];
}

interface DemoScenarioStep {
  id: string;
  phase: 'detection' | 'alert' | 'notification' | 'action' | 'resolved';
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  timestamp: string;
  details: string[];
}

const ALERT_TYPE_STYLE: Record<string, { icon: React.ElementType; color: string; bgColor: string; severity: string; labelKey: string; descKey: string }> = {
  air_strike: { icon: Siren, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30', severity: 'red', labelKey: 'airStrikeAlert', descKey: 'airStrikeAlertDesc' },
  artillery: { icon: Bomb, color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30', severity: 'orange', labelKey: 'artilleryAlert', descKey: 'artilleryAlertDesc' },
  conflict: { icon: Swords, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30', severity: 'yellow', labelKey: 'conflictAlert', descKey: 'conflictAlertDesc' },
  curfew: { icon: Moon, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30', severity: 'info', labelKey: 'curfewNotice', descKey: 'curfewNoticeDesc' },
};

const FEATURE_STYLE = [
  { icon: Bell, titleKey: 'featRealtimeAlert', descKey: 'featRealtimeAlertDesc', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  { icon: Map, titleKey: 'featSmartRoute', descKey: 'featSmartRouteDesc', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  { icon: Shield, titleKey: 'featNearbyShelter', descKey: 'featNearbyShelterDesc', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  { icon: Users, titleKey: 'featFamilySafety', descKey: 'featFamilySafetyDesc', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  { icon: Activity, titleKey: 'featAIMonitor', descKey: 'featAIMonitorDesc', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  { icon: Volume2, titleKey: 'featDualNotify', descKey: 'featDualNotifyDesc', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
];

export default function SimulationTrial() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { isDemo } = useDemo();
  const { canAccessFeature, loading: subLoading } = useSubscription();

  if (!subLoading && !canAccessFeature('auto_rescue')) {
    return <SubscriptionGate feature="auto_rescue"><></></SubscriptionGate>;
  }

  // Build dynamic i18n versions
  const ALERT_TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string; severity: string; description: string }> = Object.fromEntries(
    Object.entries(ALERT_TYPE_STYLE).map(([k, v]) => [k, { icon: v.icon, label: t(v.labelKey) || k, color: v.color, bgColor: v.bgColor, severity: v.severity, description: t(v.descKey) || '' }])
  );

  const FEATURE_ENTRIES = FEATURE_STYLE.map(f => ({
    icon: f.icon, title: t(f.titleKey) || '', desc: t(f.descKey) || '', color: f.color, bgColor: f.bgColor
  }));
  const [trial, setTrial] = useState<SimulationTrial | null>(null);
  const [alerts, setAlerts] = useState<AlertWithNotifications[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showAlertDetail, setShowAlertDetail] = useState<AlertWithNotifications | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'scenario' | 'features'>('overview');

  // Demo simulation state
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStepIndex, setDemoStepIndex] = useState(-1);
  const [demoScenarioType, setDemoScenarioType] = useState<string>('');
  const [demoSteps, setDemoSteps] = useState<DemoScenarioStep[]>([]);
  const [demoAlerts, setDemoAlerts] = useState<AlertWithNotifications[]>([]);

  useEffect(() => {
    if (isDemo) {
      // In demo mode, simulate an active trial
      const now = new Date();
      const expires = new Date(now.getTime() + 6 * 24 * 3600000);
      setTrial({
        id: 'demo-trial',
        user_id: 'demo-user',
        is_active: true,
        started_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
        expires_at: expires.toISOString(),
        created_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
      } as SimulationTrial);
      setLoading(false);
    } else {
      checkTrialStatus();
    }
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (trial?.id && !isDemo) {
      fetchAlerts();
    }
  }, [trial]);

  // Auto-advance demo scenario
  useEffect(() => {
    if (!demoRunning || demoStepIndex >= demoSteps.length - 1) return;
    const timer = setTimeout(() => {
      setDemoStepIndex(prev => prev + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [demoRunning, demoStepIndex, demoSteps.length]);

  const updateTimeRemaining = () => {
    if (!trial?.expires_at) return;
    const expires = new Date(trial.expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) { setTimeRemaining(t('expired')); return; }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeRemaining(`${days}${t('days') || '天'} ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  const checkTrialStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    try {
      const { data, error } = await supabase.functions.invoke('simulation-alert', {
        body: { action: 'get_trial_status', user_id: user.id }
      });
      if (error) throw error;
      if (data?.trial) setTrial(data.trial);
    } catch (err) {
      console.error('Failed to check trial status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    if (!trial?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('simulation-alert', {
        body: { action: 'get_alerts', user_id: user.id, trial_id: trial.id }
      });
      if (error) throw error;
      setAlerts(data?.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  const buildScenarioSteps = (type: string): DemoScenarioStep[] => {
    const meta = ALERT_TYPE_META[type];
    const now = new Date();
    const fmt = (offset: number) => new Date(now.getTime() + offset * 1000).toLocaleTimeString();
    return [
      { id: '1', phase: 'detection', title: t('aiDataCollection') || 'AI Data Collection', description: `${meta.label}`, icon: Activity, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', timestamp: fmt(0), details: [] },
      { id: '2', phase: 'detection', title: t('aiThreatAnalysis') || 'AI Threat Analysis', description: '92%', icon: Zap, color: 'text-amber-400', bgColor: 'bg-amber-500/20', timestamp: fmt(3), details: [] },
      { id: '3', phase: 'alert', title: t('alertGeneration') || 'Alert Generation', description: meta.label, icon: meta.icon, color: meta.color, bgColor: meta.bgColor.split(' ')[0], timestamp: fmt(5), details: [] },
      { id: '4', phase: 'notification', title: t('multiChannelPush') || 'Multi-channel Push', description: 'Push + SMS + In-app', icon: Bell, color: 'text-red-400', bgColor: 'bg-red-500/20', timestamp: fmt(6), details: [] },
      { id: '5', phase: 'notification', title: t('familyNotification') || 'Family Notification', description: '', icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/20', timestamp: fmt(8), details: [] },
      { id: '6', phase: 'action', title: t('escapeRoutePlan') || 'Escape Route Plan', description: '1.2km', icon: Navigation, color: 'text-green-400', bgColor: 'bg-green-500/20', timestamp: fmt(10), details: [] },
      { id: '7', phase: 'resolved', title: t('continuousMonitor') || 'Continuous Monitoring', description: '', icon: Shield, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', timestamp: fmt(15), details: [] },
    ];
  };

  const startDemoScenario = (type: string) => {
    const steps = buildScenarioSteps(type);
    const meta = ALERT_TYPE_META[type];
    setDemoScenarioType(type);
    setDemoSteps(steps);
    setDemoStepIndex(0);
    setDemoRunning(true);

    // Also add a demo alert
    const now = new Date();
    const demoAlert: AlertWithNotifications = {
      id: `demo-sim-${Date.now()}`,
      trial_id: 'demo-trial',
      title: meta.label + ' - ' + (type === 'air_strike' ? '基辅市区' : type === 'artillery' ? '顿涅茨克' : type === 'conflict' ? '贝鲁特南部' : '巴格达'),
      description: meta.description,
      alert_type: type,
      severity: meta.severity === 'info' ? 'yellow' : meta.severity,
      city: type === 'air_strike' ? '基辅' : type === 'artillery' ? '顿涅茨克' : type === 'conflict' ? '贝鲁特' : '巴格达',
      country: type === 'air_strike' ? '乌克兰' : type === 'artillery' ? '乌克兰' : type === 'conflict' ? '黎巴嫩' : '伊拉克',
      latitude: 50.4501,
      longitude: 30.5234,
      reliability_score: 92,
      acknowledged: false,
      created_at: now.toISOString(),
      simulation_notifications: [
        { id: `n1-${Date.now()}`, alert_id: '', channel: 'push', status: 'delivered', sent_at: now.toISOString(), delivered_at: now.toISOString(), created_at: now.toISOString() } as unknown as SimulationNotification,
        { id: `n2-${Date.now()}`, alert_id: '', channel: 'sms', status: 'delivered', sent_at: now.toISOString(), delivered_at: new Date(now.getTime() + 2000).toISOString(), created_at: now.toISOString() } as unknown as SimulationNotification,
        { id: `n3-${Date.now()}`, alert_id: '', channel: 'in_app', status: 'delivered', sent_at: now.toISOString(), delivered_at: now.toISOString(), created_at: now.toISOString() } as unknown as SimulationNotification,
      ],
    } as AlertWithNotifications;
    setDemoAlerts(prev => [demoAlert, ...prev]);
  };

  const triggerSimulationAlert = async (type: string) => {
    if (isDemo) {
      startDemoScenario(type);
      setActiveTab('scenario');
      return;
    }
    if (!trial?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('simulation-alert', {
        body: { action: 'trigger_alert', user_id: user.id, trial_id: trial.id, alert_type: type }
      });
      if (error) throw error;
      if (data?.alert) fetchAlerts();
    } catch (err) {
      console.error('Failed to trigger alert:', err);
    }
  };

  const startTrial = async () => {
    if (isDemo) {
      setShowStartModal(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulation-alert', {
        body: { action: 'start_trial', user_id: user.id }
      });
      if (error) throw error;
      if (data?.trial) { setTrial(data.trial); setShowStartModal(false); fetchAlerts(); }
    } catch (err) {
      console.error('Failed to start trial:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const allAlerts = isDemo ? demoAlerts : alerts;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="text-white">
        <div className="max-w-4xl mx-auto pt-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
              <Siren className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4">{t('simulationTitle') || '7天预警体验'}</h1>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              {t('simulationDesc') || '体验完整的AI预警系统，包括实时推送通知、短信提醒、双向并行通知机制。'}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <Bell className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{t('pushNotification')}</h3>
                <p className="text-sm text-slate-400">{t('realTimeAlert') || '实时推送'}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <MessageSquare className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{t('smsNotification') || '短信通知'}</h3>
                <p className="text-sm text-slate-400">{t('smsBackup') || '备用通道'}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <Zap className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{t('dualChannel') || '双向并行'}</h3>
                <p className="text-sm text-slate-400">{t('guaranteedDelivery') || '确保送达'}</p>
              </div>
            </div>
            <button onClick={() => setShowStartModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-red-500/30 transition-all">
              {t('startTrial') || '开始7天体验'}
            </button>
          </motion.div>
        </div>

        <AnimatePresence>
          {showStartModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('confirmStartTrial') || '确认开始体验?'}</h3>
                  <p className="text-slate-400 text-sm">{t('trialDesc') || '您将获得7天的完整预警体验，系统将模拟真实的预警场景。'}</p>
                </div>
                <div className="space-y-3">
                  <button onClick={startTrial}
                    className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl font-semibold text-white">{t('confirm')}</button>
                  <button onClick={() => setShowStartModal(false)}
                    className="w-full h-12 bg-slate-700 rounded-xl font-medium text-slate-300 hover:bg-slate-600 transition-colors">{t('cancel')}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Siren className="w-6 h-6 text-red-400" />
          <h1 className="text-2xl font-bold">{t('simulationTitle') || '模拟预警'}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className={trial.is_active ? 'text-green-400' : 'text-red-400'}>{timeRemaining}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'overview', label: t('overview') || 'Overview' },
          { key: 'scenario', label: t('scenarioTab') || 'Scenario' },
          { key: 'features', label: t('featuresTab') || 'Features' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:text-white'
            }`}>
            {t(key) || label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Stats Banner */}
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold mb-1">{t('trialActive') || '体验进行中'}</h2>
                <p className="text-slate-400 text-sm">{t('expiresAt') || '到期时间'}: {new Date(trial.expires_at!).toLocaleString()}</p>
              </div>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <Siren className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{allAlerts.length}</p>
                <p className="text-xs text-slate-400">{t('totalAlerts') || '预警总数'}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{allAlerts.filter(a => a.acknowledged).length}</p>
                <p className="text-xs text-slate-400">{t('acknowledged') || '已确认'}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{allAlerts.filter(a => !a.acknowledged).length}</p>
                <p className="text-xs text-slate-400">{t('pending') || '待确认'}</p>
              </div>
            </div>
          </div>

          {/* Trigger Buttons */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-2">{t('triggerSimulation') || '触发模拟预警'}</h3>
            <p className="text-sm text-slate-400 mb-4">{t('triggerDesc') || 'Select an alert type to simulate the full alert scenario'}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(ALERT_TYPE_META).map(([type, meta]) => {
                const Icon = meta.icon;
                return (
                  <button key={type} onClick={() => triggerSimulationAlert(type)}
                    className={`p-4 border rounded-xl hover:scale-[1.02] transition-all text-left ${meta.bgColor}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 ${meta.bgColor.split(' ')[0]} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                    </div>
                    <span className="font-medium text-sm">{meta.label}</span>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{meta.description.slice(0, 30)}...</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Demo Alerts */}
          {allAlerts.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">{t('recentAlerts') || '最近模拟预警'}</h3>
              <div className="space-y-3">
                {allAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} onClick={() => setShowAlertDetail(alert)}
                    className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity!)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{alert.title}</p>
                      <p className="text-xs text-slate-400">{alert.city} · {new Date(alert.created_at!).toLocaleTimeString()}</p>
                    </div>
                    {alert.acknowledged && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notification Channels */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold mb-4">{t('notificationChannels') || '通知渠道'}</h3>
            <div className="space-y-3">
              {[
                { icon: Bell, label: t('pushNotification') || 'Push', color: 'text-red-400', status: t('enabled') || 'Enabled' },
                { icon: MessageSquare, label: t('smsNotification') || 'SMS', color: 'text-green-400', status: t('enabled') || 'Enabled' },
                { icon: Smartphone, label: t('inAppNotification') || 'In-app', color: 'text-blue-400', status: t('enabled') || 'Enabled' },
              ].map((ch, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <ch.icon className={`w-5 h-5 ${ch.color}`} />
                    <span className="text-sm">{ch.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400">{ch.status}</span>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Scenario Tab - Full simulation walkthrough */}
      {activeTab === 'scenario' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {!demoRunning ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-red-500/20">
                <Play className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">{t('selectScenarioToStart') || 'Select a scenario to start'}</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">{t('selectScenarioDesc') || 'Click an alert type below to see the full simulation flow'}</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {Object.entries(ALERT_TYPE_META).map(([type, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button key={type} onClick={() => triggerSimulationAlert(type)}
                      className={`p-5 border rounded-2xl hover:scale-105 transition-all ${meta.bgColor}`}>
                      <Icon className={`w-8 h-8 ${meta.color} mx-auto mb-3`} />
                      <p className="font-medium text-sm">{meta.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Scenario Header */}
              <div className={`border rounded-2xl p-5 ${ALERT_TYPE_META[demoScenarioType]?.bgColor || 'bg-slate-900/50 border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => { const Icon = ALERT_TYPE_META[demoScenarioType]?.icon || Siren; return <Icon className={`w-6 h-6 ${ALERT_TYPE_META[demoScenarioType]?.color || 'text-red-400'}`} />; })()}
                    <div>
                      <h2 className="text-lg font-bold">{ALERT_TYPE_META[demoScenarioType]?.label} - {t('simulationScenario') || 'Simulation'}</h2>
                      <p className="text-sm text-slate-400">{ALERT_TYPE_META[demoScenarioType]?.description}</p>
                    </div>
                  </div>
                  <button onClick={() => { setDemoRunning(false); setDemoStepIndex(-1); }}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Timeline Steps */}
              <div className="space-y-1">
                {demoSteps.map((step, i) => {
                  const isActive = i === demoStepIndex;
                  const isDone = i < demoStepIndex;
                  const isLocked = i > demoStepIndex;
                  const Icon = step.icon;
                  return (
                    <motion.div key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: isLocked ? 0.4 : 1, x: 0 }}
                      transition={{ delay: isDone ? 0 : 0.2 }}
                      className={`relative flex gap-4 p-4 rounded-xl transition-all ${isActive ? 'bg-slate-800/80 border border-slate-700 ring-1 ring-slate-600' : isDone ? 'bg-slate-900/30' : 'bg-slate-900/20'}`}>
                      {/* Timeline line */}
                      {i < demoSteps.length - 1 && (
                        <div className={`absolute left-[29px] top-[52px] w-0.5 h-[calc(100%-20px)] ${isDone ? 'bg-green-500/50' : 'bg-slate-700'}`} />
                      )}
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 z-10 ${isDone ? 'bg-green-500/20' : isActive ? step.bgColor : 'bg-slate-800'}`}>
                        {isDone ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Icon className={`w-5 h-5 ${isActive ? step.color : 'text-slate-500'}`} />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            step.phase === 'detection' ? 'bg-cyan-500/20 text-cyan-400' :
                            step.phase === 'alert' ? 'bg-red-500/20 text-red-400' :
                            step.phase === 'notification' ? 'bg-amber-500/20 text-amber-400' :
                            step.phase === 'action' ? 'bg-green-500/20 text-green-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {step.phase === 'detection' ? (t('phaseDetection') || 'Detection') : step.phase === 'alert' ? (t('phaseAlert') || 'Alert') : step.phase === 'notification' ? (t('phaseNotification') || 'Notification') : step.phase === 'action' ? (t('phaseAction') || 'Action') : (t('phaseMonitor') || 'Monitor')}
                          </span>
                          <span className="text-xs text-slate-500">{step.timestamp}</span>
                        </div>
                        <h4 className="font-semibold text-sm">{step.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                        {(isDone || isActive) && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 space-y-1">
                            {step.details.map((d, j) => (
                              <div key={j} className="flex items-center gap-2 text-xs text-slate-500">
                                <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-green-400' : 'bg-slate-500 animate-pulse'}`} />
                                {d}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Replay / New Scenario */}
              {demoStepIndex >= demoSteps.length - 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-center pt-4">
                  <button onClick={() => { setDemoStepIndex(0); setDemoRunning(true); }}
                    className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
                    {t('replayScenario') || 'Replay'}
                  </button>
                  <button onClick={() => { setDemoRunning(false); setDemoStepIndex(-1); }}
                    className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors">
                    {t('selectOtherScenario') || 'Other Scenario'}
                  </button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Feature intro banner */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">{t('warrescuePlatform') || 'WarRescue Alert Platform'}</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t('warrescuePlatformDesc') || 'AI-powered real-time alert system with multi-source data fusion.'}
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_ENTRIES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                  <div className={`w-12 h-12 ${feat.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${feat.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Scenario Flow Diagram */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-4">{t('alertFullFlow') || 'Alert Full Flow'}</h3>
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
              {[
                { label: t('dataCollection') || 'Data Collection', icon: Radio, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
                { label: t('aiAnalysis') || 'AI Analysis', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/20' },
                { label: t('alertGenerationShort') || 'Alert Generation', icon: Siren, color: 'text-red-400', bg: 'bg-red-500/20' },
                { label: t('multiChannelPushShort') || 'Multi-channel Push', icon: Bell, color: 'text-orange-400', bg: 'bg-orange-500/20' },
                { label: t('escapeGuide') || 'Escape Guide', icon: Navigation, color: 'text-green-400', bg: 'bg-green-500/20' },
                { label: t('continuousMonitorShort') || 'Monitoring', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/20' },
              ].map((step, i, arr) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-2 min-w-[80px]">
                    <div className={`w-12 h-12 ${step.bg} rounded-xl flex items-center justify-center`}>
                      <step.icon className={`w-6 h-6 ${step.color}`} />
                    </div>
                    <span className="text-xs text-slate-400 text-center whitespace-nowrap">{step.label}</span>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-[-16px]" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Quick navigation */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-4">{t('featureEntry') || 'Feature Entry'}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: t('alertHistoryLabel') || 'Alert History', path: '/alert-history', icon: Bell, color: 'text-red-400' },
                { label: t('shelterLabel') || 'Shelters', path: '/shelters', icon: Shield, color: 'text-green-400' },
                { label: t('escapeRouteLabel') || 'Escape Route', path: '/route-plan', icon: Map, color: 'text-blue-400' },
                { label: t('familyManage') || 'Family', path: '/family-settings', icon: Users, color: 'text-purple-400' },
              ].map((item, i) => (
                <button key={i} onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 transition-colors">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {showAlertDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setShowAlertDetail(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-4 h-4 mt-1 rounded-full ${getSeverityColor(showAlertDetail.severity!)}`} />
                <div>
                  <h3 className="text-lg font-bold">{showAlertDetail.title}</h3>
                  <span className={`text-sm ${
                    showAlertDetail.severity === 'red' ? 'text-red-400' :
                    showAlertDetail.severity === 'orange' ? 'text-orange-400' :
                    showAlertDetail.severity === 'yellow' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>{showAlertDetail.severity?.toUpperCase()}</span>
                </div>
              </div>
              <p className="text-slate-300 mb-4">{showAlertDetail.description}</p>
              <div className="space-y-2 text-sm text-slate-400 mb-4">
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{showAlertDetail.city}, {showAlertDetail.country}</p>
                <p className="flex items-center gap-2"><Zap className="w-4 h-4" />{t('reliability') || '可信度'}: {showAlertDetail.reliability_score}%</p>
                <p className="flex items-center gap-2"><Clock className="w-4 h-4" />{new Date(showAlertDetail.created_at!).toLocaleString()}</p>
              </div>
              {showAlertDetail.simulation_notifications && showAlertDetail.simulation_notifications.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">{t('notificationRecords') || 'Notification Records'}</h4>
                  <div className="space-y-2">
                    {showAlertDetail.simulation_notifications.map((n) => (
                      <div key={n.id} className="flex items-center gap-2 text-sm">
                        {n.channel === 'push' ? <Bell className="w-4 h-4" /> : n.channel === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                        <span className="text-slate-400">{n.channel}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">{n.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setShowAlertDetail(null)}
                className="w-full h-12 bg-slate-700 rounded-xl font-medium text-slate-300 hover:bg-slate-600 transition-colors">
                {t('close') || '关闭'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
