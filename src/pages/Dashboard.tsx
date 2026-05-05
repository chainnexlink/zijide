import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Users,
  MapPin,
  Shield,
  Siren,
  HeartHandshake,
  Settings,
  ChevronRight,
  AlertTriangle,
  Navigation,
  LogOut,
  Menu,
  X,
  Globe,
  Zap,
  Radio,
  Activity,
  Clock,
  CheckCircle2,
  Wifi,
  Signal,
  Home,
  Map,
  Satellite,
  Siren as SirenIcon,
  AlertCircle,
  Info,
  Megaphone
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { useGeolocation } from '../hooks/useGeolocation';
import { useNotification } from '../hooks/useNotification';
import { useRealtimeAlerts } from '../hooks/useRealtime';
import { STATIC_SHELTERS } from '../data/shelters';
import type { Tables } from '../supabase/types';

type Alert = Tables<'alerts'>;
type Shelter = Tables<'shelters'>;
type Profile = Tables<'profiles'>;
type FamilyMember = Tables<'family_members'> & { profile?: Tables<'profiles'> };

interface DashboardStats {
  activeAlerts: number;
  nearbyShelters: number;
  familyOnline: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface DashboardAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'reward' | 'promotion' | 'info';
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, language, setLanguage, languages, dir } = useI18n();
  const { location, error: locationError, startWatching, stopWatching } = useGeolocation();
  const { pushNotification, requestPermission } = useNotification();
  const [user, setUser] = useState<Profile | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSOSModal, setShowSOSModal] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    activeAlerts: 0,
    nearbyShelters: 0,
    familyOnline: 0,
    riskLevel: 'low'
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAlertDetail, setShowAlertDetail] = useState<Alert | null>(null);
  const [dashAnnouncements, setDashAnnouncements] = useState<DashboardAnnouncement[]>([]);

  useEffect(() => {
    fetchUserData();
    fetchAlerts();
    fetchShelters();
    fetchFamilyMembers();
    fetchDashAnnouncements();
    startWatching();
    requestPermission();
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    const dataInterval = setInterval(() => {
      fetchAlerts();
      fetchFamilyMembers();
    }, 30000);
    return () => {
      stopWatching();
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, []);

  // Realtime: new alerts push native notification + update list
  useRealtimeAlerts((newAlert: Alert) => {
    setAlerts(prev => {
      if (prev.some(a => a.id === newAlert.id)) return prev;
      return [newAlert, ...prev].slice(0, 20);
    });
    const sevLabel = newAlert.severity === 'red' ? (t('urgent') || 'Urgent') : newAlert.severity === 'orange' ? (t('alertLabel') || 'Warning') : (t('notice') || 'Notice');
    pushNotification({
      title: `[${sevLabel}] ${newAlert.title}`,
      body: newAlert.description || `${newAlert.city || ''} ${newAlert.country || ''} - ${newAlert.alert_type}`,
      type: 'alert',
      severity: newAlert.severity as any,
      data: { alertId: newAlert.id },
    });
  });

  useEffect(() => {
    calculateStats();
  }, [alerts, shelters, familyMembers]);

  const fetchUserData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      setUser(data);
    }
    setLoading(false);
  };

  const fetchAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: settings } = await supabase
      .from('user_alert_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let query = supabase
      .from('alerts')
      .select('*')
      .is('end_time', null)
      .order('created_at', { ascending: false });

    const enabledTypes: string[] = [];
    if (settings) {
      if (settings.alert_air_strike) enabledTypes.push('air_strike');
      if (settings.alert_artillery) enabledTypes.push('artillery');
      if (settings.alert_conflict) enabledTypes.push('conflict');
      if (settings.alert_curfew) enabledTypes.push('curfew');
    }

    if (enabledTypes.length > 0) {
      query = query.in('alert_type', enabledTypes);
    }

    const { data } = await query.limit(10);
    setAlerts(data || []);
  };

  const fetchShelters = async () => {
    const { data } = await supabase
      .from('shelters')
      .select('*')
      .eq('status', 'open')
      .limit(5);
    setShelters((data && data.length > 0) ? data : STATIC_SHELTERS.filter(s => s.status === 'open').slice(0, 5).map(s => ({ ...s, description: s.description ?? null, is_verified: s.is_verified ?? null, manager_name: s.manager_name ?? null } as Shelter)));
  };

  const fetchFamilyMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberData } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberData) {
      const { data: members } = await supabase
        .from('family_members')
        .select('*, profiles(*)')
        .eq('family_id', memberData.family_id);
      setFamilyMembers(members || []);
    }
  };

  const calculateStats = () => {
    const redAlerts = alerts.filter(a => a.severity === 'red').length;
    const orangeAlerts = alerts.filter(a => a.severity === 'orange').length;
    const onlineCount = familyMembers.filter(m => m.is_online).length;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (redAlerts > 0) riskLevel = 'critical';
    else if (orangeAlerts > 0) riskLevel = 'high';
    else if (alerts.length > 0) riskLevel = 'medium';

    setStats({
      activeAlerts: alerts.length,
      nearbyShelters: shelters.length,
      familyOnline: onlineCount,
      riskLevel
    });
  };

  const fetchDashAnnouncements = async () => {
    try {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('announcements')
        .select('id, title, content, type, created_at')
        .eq('is_active', true)
        .lte('start_at', now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order('created_at', { ascending: false })
        .limit(3);
      setDashAnnouncements((data || []).map(d => ({
        id: d.id,
        title: d.title,
        content: d.content,
        type: (d.type || 'info') as DashboardAnnouncement['type'],
        created_at: d.created_at || '',
      })));
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const triggerSOS = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    try {
      const { data, error } = await supabase.functions.invoke('sos-service', {
        body: {
          action: 'trigger',
          userId: authUser.id,
          triggerMethod: 'manual',
          latitude: location?.latitude,
          longitude: location?.longitude
        }
      });

      if (error) throw error;

      setShowSOSModal(false);
      navigate('/sos-history');
    } catch (e: any) {
      console.error('SOS trigger failed, falling back to direct insert:', e);
      // 降级方案：先检查是否已有活跃SOS，避免重复
      try {
        const { data: existing } = await supabase
          .from('sos_records')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!existing) {
          await supabase.from('sos_records').insert({
            user_id: authUser.id,
            trigger_method: 'manual',
            status: 'active',
            stage: 1,
            latitude: location?.latitude,
            longitude: location?.longitude
          });
        }
        setShowSOSModal(false);
        navigate('/sos-history');
      } catch {
        alert(t('sosError') || 'SOS发送失败，请检查网络后重试');
      }
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-slate-500';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'red': return 'text-red-400';
      case 'orange': return 'text-orange-400';
      case 'yellow': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      air_strike: t('airStrike'),
      artillery: t('artillery'),
      conflict: t('conflict'),
      curfew: t('curfew'),
      chemical: t('chemical'),
      other: t('other')
    };
    return types[type] || type;
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'air_strike': return <SirenIcon className="w-4 h-4" />;
      case 'artillery': return <AlertCircle className="w-4 h-4" />;
      case 'conflict': return <AlertTriangle className="w-4 h-4" />;
      case 'curfew': return <Clock className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="text-white" dir={dir}>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{t('status') || 'Status'}</p>
              <p className="text-lg font-bold text-green-400">{t('currentSafe') || 'Safe'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t('aiMonitoring') || 'AI monitoring active'}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{t('alerts') || 'Alerts'}</p>
              <p className="text-lg font-bold">{stats.activeAlerts}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t('active') || 'Active alerts nearby'}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{t('nearbyShelter') || 'Shelters'}</p>
              <p className="text-lg font-bold">{stats.nearbyShelters}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t('available') || 'Available nearby'}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{t('family') || 'Family'}</p>
              <p className="text-lg font-bold">{stats.familyOnline}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t('online') || 'Online members'}</p>
        </motion.div>
      </div>

      {/* Main Content - Two Columns on Desktop/iPad Landscape */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Emergency Alert Banner */}
          {alerts.length > 0 && alerts[0].severity === 'red' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-2xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Siren className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <h3 className="font-bold text-red-400 text-lg">{alerts[0].title}</h3>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{alerts[0].description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />AI{t('recognition') || ' Detected'}</span>
                    <span>{alerts[0].city}, {alerts[0].country}</span>
                    {alerts[0].affected_radius_km && <span className="text-red-400 font-medium">{alerts[0].affected_radius_km}km</span>}
                  </div>
                </div>
                <button
                  onClick={() => setShowAlertDetail(alerts[0])}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/30 transition-colors flex-shrink-0"
                >
                  {t('viewDetails') || 'Details'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Alerts Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-800/50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-400" />
                <h2 className="font-semibold text-lg">{t('alerts') || 'Recent Alerts'}</h2>
              </div>
              <Link to="/alert-history" className="text-sm text-red-400 flex items-center gap-1 hover:text-red-300">
                {t('viewAll') || 'View All'}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800/30">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{t('noData') || 'No active alerts'}</p>
                </div>
              ) : (
                alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => setShowAlertDetail(alert)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getSeverityColor(alert.severity!)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{alert.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{alert.city} · {alert.country}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full bg-opacity-20 flex-shrink-0 ${getSeverityText(alert.severity!)}`}>
                      {getAlertTypeLabel(alert.alert_type)}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0 hidden sm:block">
                      {new Date(alert.created_at || '').toLocaleTimeString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5"
          >
            <h3 className="font-semibold mb-4">{t('quickActions') || 'Quick Actions'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/simulation')} className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Siren className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-xs font-medium">{t('simulationAlert') || 'Simulation'}</span>
              </button>
              <button onClick={() => navigate('/route-plan')} className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Map className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs font-medium">{t('escapeRoute') || 'Routes'}</span>
              </button>
              <button onClick={() => navigate('/shelters')} className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Home className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-xs font-medium">{t('nearbyShelter') || 'Shelters'}</span>
              </button>
              <button onClick={() => setShowSOSModal(true)} className="flex flex-col items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors group">
                <div className="w-10 h-10 bg-red-500/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Siren className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-xs font-medium text-red-400">SOS</span>
              </button>
            </div>
          </motion.div>

          {/* Announcements */}
          {dashAnnouncements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold">{t('announcements') || 'Announcements'}</h3>
                </div>
                <Link to="/announcements" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  {t('viewAll') || 'View All'}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2.5">
                {dashAnnouncements.map((ann) => {
                  const typeColor = ann.type === 'reward' ? 'border-yellow-500/40 bg-yellow-500/5' : ann.type === 'promotion' ? 'border-amber-500/40 bg-amber-500/5' : 'border-blue-500/40 bg-blue-500/5';
                  const dotColor = ann.type === 'reward' ? 'bg-yellow-400' : ann.type === 'promotion' ? 'bg-amber-400' : 'bg-blue-400';
                  return (
                    <Link
                      key={ann.id}
                      to="/announcements"
                      className={`block p-3 border rounded-xl ${typeColor} hover:brightness-125 transition-all`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ann.title}</p>
                          {ann.content && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ann.content}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(ann.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Family Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">{t('familyStatus') || 'Family'}</h3>
              </div>
              <Link to="/family-settings" className="text-xs text-blue-400 hover:text-blue-300">
                {t('viewAll') || 'View All'}
              </Link>
            </div>
            {familyMembers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">{t('noData') || 'No family members'}</p>
            ) : (
              <div className="space-y-3">
                {familyMembers.slice(0, 4).map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold">{member.profile?.nickname?.[0] || 'U'}</span>
                      </div>
                      {member.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.profile?.nickname || 'User'}</p>
                      <p className="text-xs text-slate-500">{member.is_online ? (t('online') || 'Online') : (t('offline') || 'Offline')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* AI Monitor Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">{t('aiMonitor') || 'AI Monitor'}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs">{t('dataCollectionActive') || 'Data Collection Active'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span className="text-blue-400 text-xs">{t('autoCleanupEnabled') || 'Auto-cleanup Enabled'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-amber-400 rounded-full" />
                <span className="text-amber-400 text-xs">{t('pushNotificationsReady') || 'Push Notifications Ready'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* SOS Modal */}
      <AnimatePresence>
        {showSOSModal && (
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
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Siren className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t('confirmSOS')}</h3>
                <p className="text-slate-400 text-sm">{t('sosWarning')}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={triggerSOS}
                  className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-red-500/30 transition-all"
                >
                  {t('confirm')}
                </button>
                <button
                  onClick={() => setShowSOSModal(false)}
                  className="w-full h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAlertDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setShowAlertDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-4 h-4 mt-1 rounded-full ${getSeverityColor(showAlertDetail.severity)}`} />
                <div>
                  <h3 className="text-lg font-bold">{showAlertDetail.title}</h3>
                  <span className={`text-sm ${getSeverityText(showAlertDetail.severity)}`}>
                    {showAlertDetail.severity?.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-slate-300 mb-4">{showAlertDetail.description}</p>
              <div className="space-y-2 text-sm text-slate-400 mb-4">
                <p><span className="text-slate-500">{t('type')}:</span> {getAlertTypeLabel(showAlertDetail.alert_type)}</p>
                <p><span className="text-slate-500">{t('location')}:</span> {showAlertDetail.city}, {showAlertDetail.country}</p>
                <p><span className="text-slate-500">{t('time')}:</span> {new Date(showAlertDetail.created_at || '').toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/alert/${showAlertDetail.id}`}
                  className="flex-1 h-12 bg-blue-500/20 text-blue-400 rounded-xl font-medium flex items-center justify-center hover:bg-blue-500/30 transition-colors"
                >
                  {t('viewDetails')}
                </Link>
                <button
                  onClick={() => setShowAlertDetail(null)}
                  className="flex-1 h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
