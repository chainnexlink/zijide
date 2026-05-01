import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  Siren,
  Shield,
  Settings,
  LogOut,
  Bell,
  MapPin,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe,
  Smartphone,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Download,
  BarChart3,
  PieChart,
  Zap,
  Radio,
  Server,
  Database,
  Cpu,
  Wifi,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { Megaphone, Coins, MapPinned, MessageSquare, Award, Send } from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { useDemo } from '../App';
import type { Tables } from '../supabase/types';

type Alert = Tables<'alerts'>;
type SOSRecord = Tables<'sos_records'>;
type Profile = Tables<'profiles'>;
type Shelter = Tables<'shelters'>;
type FamilyGroup = Tables<'family_groups'>;
type Announcement = Tables<'announcements'>;
type CityAlert = Tables<'city_alerts'>;
type SupportMessage = Tables<'support_messages'>;

interface SupportConversation {
  user_id: string;
  nickname: string | null;
  email: string | null;
  last_message: string;
  last_time: string | null;
  unread_count: number;
}

interface Stats {
  totalUsers: number;
  activeAlerts: number;
  activeSOS: number;
  totalShelters: number;
  todayAlerts: number;
  resolvedSOS: number;
  totalFamilies: number;
  onlineUsers: number;
}

interface SystemStatus {
  monitor: 'running' | 'stopped' | 'error';
  database: 'connected' | 'disconnected';
  lastSync: string;
  uptime: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, language, setLanguage, languages, dir } = useI18n();
  const { isDemo } = useDemo();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeAlerts: 0,
    activeSOS: 0,
    totalShelters: 0,
    todayAlerts: 0,
    resolvedSOS: 0,
    totalFamilies: 0,
    onlineUsers: 0
  });
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [activeSOSList, setActiveSOSList] = useState<SOSRecord[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    monitor: 'running',
    database: 'connected',
    lastSync: new Date().toISOString(),
    uptime: '99.9%'
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'users' | 'shelters' | 'announcements' | 'points' | 'city-alerts' | 'support' | 'system'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateAlertModal, setShowCreateAlertModal] = useState(false);
  const [showCreateShelterModal, setShowCreateShelterModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertFilter, setAlertFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [annForm, setAnnForm] = useState({ title: '', content: '', type: 'promotion' as string, is_active: true });
  // City Alerts management
  const [cityAlerts, setCityAlerts] = useState<CityAlert[]>([]);
  const [cityAlertReporters, setCityAlertReporters] = useState<Record<string, any[]>>({});
  const [selectedCityAlert, setSelectedCityAlert] = useState<CityAlert | null>(null);
  // Support / Customer Service
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [selectedSupportUser, setSelectedSupportUser] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportReply, setSupportReply] = useState('');
  // Points management
  const [pointsUserSearch, setPointsUserSearch] = useState('');
  const [pointsSearchResults, setPointsSearchResults] = useState<Profile[]>([]);
  const [selectedPointsUser, setSelectedPointsUser] = useState<Profile | null>(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsType, setPointsType] = useState('earn_rescue');
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [showPointsModal, setShowPointsModal] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setIsAdmin(true);
      fetchAllData();
    } else {
      checkAdmin();
      fetchAllData();
      const interval = setInterval(() => {
        fetchStats();
        fetchRecentAlerts();
        fetchActiveSOS();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      navigate('/dashboard');
      return;
    }
    setIsAdmin(true);
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchStats(),
      fetchRecentAlerts(),
      fetchActiveSOS(),
      fetchUsers(),
      fetchShelters(),
      fetchAnnouncements(),
      fetchRecentTransactions(),
      fetchCityAlerts(),
      fetchSupportConversations()
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activeAlertsCount } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: activeSOSCount } = await supabase
      .from('sos_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: sheltersCount } = await supabase
      .from('shelters')
      .select('*', { count: 'exact', head: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayAlertsCount } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { count: resolvedCount } = await supabase
      .from('sos_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rescued');

    const { count: familiesCount } = await supabase
      .from('family_groups')
      .select('*', { count: 'exact', head: true });

    const { count: onlineCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);

    setStats({
      totalUsers: usersCount || 0,
      activeAlerts: activeAlertsCount || 0,
      activeSOS: activeSOSCount || 0,
      totalShelters: sheltersCount || 0,
      todayAlerts: todayAlertsCount || 0,
      resolvedSOS: resolvedCount || 0,
      totalFamilies: familiesCount || 0,
      onlineUsers: onlineCount || 0
    });
  };

  const fetchRecentAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentAlerts(data || []);
  };

  const fetchActiveSOS = async () => {
    const { data } = await supabase
      .from('sos_records')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);
    setActiveSOSList(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setUsers(data || []);
  };

  const fetchShelters = async () => {
    const { data } = await supabase
      .from('shelters')
      .select('*')
      .order('created_at', { ascending: false });
    setShelters(data || []);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
  };

  const saveAnnouncement = async () => {
    if (!annForm.title.trim()) return;
    if (editingAnnouncement) {
      await supabase
        .from('announcements')
        .update({ title: annForm.title, content: annForm.content, type: annForm.type, is_active: annForm.is_active })
        .eq('id', editingAnnouncement.id);
    } else {
      await supabase
        .from('announcements')
        .insert({ title: annForm.title, content: annForm.content, type: annForm.type, is_active: annForm.is_active });
    }
    setShowAnnouncementModal(false);
    setEditingAnnouncement(null);
    setAnnForm({ title: '', content: '', type: 'promotion', is_active: true });
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    fetchAnnouncements();
  };

  const openEditAnnouncement = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setAnnForm({ title: ann.title, content: ann.content || '', type: ann.type || 'promotion', is_active: ann.is_active ?? true });
    setShowAnnouncementModal(true);
  };

  const openCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnForm({ title: '', content: '', type: 'promotion', is_active: true });
    setShowAnnouncementModal(true);
  };

  // ===== Points Management =====
  const searchUsersForPoints = async (query: string) => {
    setPointsUserSearch(query);
    if (query.length < 2) { setPointsSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`nickname.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    setPointsSearchResults(data || []);
  };

  const fetchRecentTransactions = async () => {
    const { data } = await supabase
      .from('point_transactions')
      .select('*, profiles:user_id(nickname, email)')
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentTransactions(data || []);
  };

  const awardPoints = async () => {
    if (!selectedPointsUser || !pointsAmount || parseInt(pointsAmount) <= 0) return;
    const amount = parseInt(pointsAmount);
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    // Insert transaction record
    await supabase.from('point_transactions').insert({
      user_id: selectedPointsUser.id,
      amount,
      type: pointsType,
      reason: pointsReason || null,
      created_by: adminUser?.id || null
    });

    // Upsert user_points balance
    const { data: existing } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', selectedPointsUser.id)
      .single();

    if (existing) {
      await supabase.from('user_points').update({
        balance: existing.balance + amount,
        total_earned: existing.total_earned + amount,
        updated_at: new Date().toISOString()
      }).eq('user_id', selectedPointsUser.id);
    } else {
      await supabase.from('user_points').insert({
        user_id: selectedPointsUser.id,
        balance: amount,
        total_earned: amount,
        total_spent: 0
      });
    }

    // Reset form
    setShowPointsModal(false);
    setSelectedPointsUser(null);
    setPointsAmount('');
    setPointsReason('');
    setPointsType('earn_rescue');
    fetchRecentTransactions();
  };

  // ===== City Alerts Management =====
  const fetchCityAlerts = async () => {
    const { data } = await supabase
      .from('city_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setCityAlerts(data || []);
  };

  const fetchCityAlertReporters = async (alertId: string) => {
    const { data } = await supabase
      .from('city_alert_reporters')
      .select('*, profiles:user_id(nickname, email)')
      .eq('city_alert_id', alertId)
      .order('report_order', { ascending: true });
    setCityAlertReporters(prev => ({ ...prev, [alertId]: data || [] }));
  };

  const confirmCityAlert = async (alertId: string) => {
    const { data: { user: admin } } = await supabase.auth.getUser();
    await supabase.from('city_alerts').update({
      is_confirmed: true,
      confirmed_at: new Date().toISOString(),
      confirmed_by: admin?.id || null
    }).eq('id', alertId);
    fetchCityAlerts();
  };

  const closeCityAlert = async (alertId: string) => {
    await supabase.from('city_alerts').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', alertId);
    fetchCityAlerts();
  };

  const rewardTopReporters = async (alert: CityAlert) => {
    if (alert.reward_granted) return;
    const { data: reporters } = await supabase
      .from('city_alert_reporters')
      .select('*')
      .eq('city_alert_id', alert.id)
      .order('report_order', { ascending: true })
      .limit(10);
    if (!reporters || reporters.length === 0) return;
    const { data: { user: admin } } = await supabase.auth.getUser();
    const rewardPerUser = 50;
    for (const r of reporters) {
      await supabase.from('point_transactions').insert({
        user_id: r.user_id,
        amount: rewardPerUser,
        type: 'earn_alert',
        reason: `同城预警前${reporters.length}触发奖励 - ${alert.city}`,
        reference_id: alert.id,
        created_by: admin?.id || null
      });
      const { data: existing } = await supabase.from('user_points').select('*').eq('user_id', r.user_id).single();
      if (existing) {
        await supabase.from('user_points').update({
          balance: existing.balance + rewardPerUser,
          total_earned: existing.total_earned + rewardPerUser,
          updated_at: new Date().toISOString()
        }).eq('user_id', r.user_id);
      } else {
        await supabase.from('user_points').insert({ user_id: r.user_id, balance: rewardPerUser, total_earned: rewardPerUser, total_spent: 0 });
      }
      await supabase.from('city_alert_reporters').update({ reward_given: true, reward_amount: rewardPerUser }).eq('id', r.id);
    }
    await supabase.from('city_alerts').update({ reward_granted: true }).eq('id', alert.id);
    fetchCityAlerts();
  };

  // ===== Support / Customer Service =====
  const fetchSupportConversations = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('user_id, content, sender_role, created_at, is_read, profiles:user_id(nickname, email)')
      .order('created_at', { ascending: false });
    if (!data) { setSupportConversations([]); return; }
    const convMap: Record<string, SupportConversation> = {};
    for (const msg of data as any[]) {
      const uid = msg.user_id;
      if (!convMap[uid]) {
        convMap[uid] = {
          user_id: uid,
          nickname: msg.profiles?.nickname || null,
          email: msg.profiles?.email || null,
          last_message: msg.content,
          last_time: msg.created_at,
          unread_count: 0
        };
      }
      if (!msg.is_read && msg.sender_role === 'user') {
        convMap[uid].unread_count++;
      }
    }
    setSupportConversations(Object.values(convMap).sort((a, b) => (b.last_time || '').localeCompare(a.last_time || '')));
  };

  const loadConversation = async (userId: string) => {
    setSelectedSupportUser(userId);
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    setSupportMessages(data || []);
    await supabase.from('support_messages').update({ is_read: true }).eq('user_id', userId).eq('sender_role', 'user').eq('is_read', false);
    fetchSupportConversations();
  };

  const sendSupportReply = async () => {
    if (!supportReply.trim() || !selectedSupportUser) return;
    const { data: { user: admin } } = await supabase.auth.getUser();
    await supabase.from('support_messages').insert({
      user_id: selectedSupportUser,
      content: supportReply.trim(),
      sender_role: 'admin',
      admin_id: admin?.id || null,
      is_read: false
    });
    setSupportReply('');
    loadConversation(selectedSupportUser);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const triggerMonitor = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('monitor', {
        body: { action: 'collect' }
      });
      if (!error) {
        fetchStats();
        fetchRecentAlerts();
      }
    } catch (e) {
      console.error('Monitor trigger failed:', e);
    }
  };

  const createAlert = async (alertData: Partial<Alert>) => {
    const { error } = await supabase.from('alerts').insert(alertData as any);
    if (!error) {
      fetchRecentAlerts();
      fetchStats();
      setShowCreateAlertModal(false);
    }
  };

  const updateAlertStatus = async (alertId: string, isActive: boolean) => {
    await supabase
      .from('alerts')
      .update({ is_active: isActive })
      .eq('id', alertId);
    fetchRecentAlerts();
    fetchStats();
  };

  const deleteAlert = async (alertId: string) => {
    await supabase.from('alerts').delete().eq('id', alertId);
    fetchRecentAlerts();
    fetchStats();
  };

  const resolveSOS = async (sosId: string) => {
    await supabase
      .from('sos_records')
      .update({ status: 'rescued' })
      .eq('id', sosId);
    fetchActiveSOS();
    fetchStats();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'red': return 'bg-red-500 text-red-400';
      case 'orange': return 'bg-orange-500 text-orange-400';
      case 'yellow': return 'bg-yellow-500 text-yellow-400';
      default: return 'bg-slate-500 text-slate-400';
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

  const filteredAlerts = recentAlerts.filter(alert => {
    if (alertFilter === 'active') return alert.is_active;
    if (alertFilter === 'expired') return !alert.is_active;
    return true;
  }).filter(alert =>
    searchQuery === '' ||
    alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (alert.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (alert.country || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    searchQuery === '' ||
    user.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white" dir={dir}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">{t('appName')} Admin</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <Link to="/dashboard" className="p-2 text-slate-300 hover:text-white">
                <Smartphone className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-300 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">{t('home')}</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm">
                <Activity className="w-4 h-4" />
                <span>AI Monitor {systemStatus.monitor}</span>
              </div>
              <button
                onClick={triggerMonitor}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('refresh')}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-8 border-b border-slate-800">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'alerts', label: 'Alerts', icon: Bell },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'shelters', label: 'Shelters', icon: Shield },
              { id: 'announcements', label: 'Announcements', icon: Megaphone },
              { id: 'points', label: 'Points', icon: Coins },
              { id: 'city-alerts', label: 'City Alerts', icon: MapPinned },
              { id: 'support', label: 'Support', icon: MessageSquare },
              { id: 'system', label: 'System', icon: Server }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-red-400 border-b-2 border-red-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                  <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="blue" delay={0} />
                  <StatCard icon={Bell} label="Active Alerts" value={stats.activeAlerts} color="red" delay={0.1} />
                  <StatCard icon={Siren} label="Active SOS" value={stats.activeSOS} color="amber" delay={0.2} />
                  <StatCard icon={Shield} label="Shelters" value={stats.totalShelters} color="green" delay={0.3} />
                  <StatCard icon={TrendingUp} label="Today Alerts" value={stats.todayAlerts} color="purple" delay={0.4} />
                  <StatCard icon={CheckCircle} label="Resolved SOS" value={stats.resolvedSOS} color="cyan" delay={0.5} />
                  <StatCard icon={Users} label="Families" value={stats.totalFamilies} color="indigo" delay={0.6} />
                  <StatCard icon={Activity} label="Online" value={stats.onlineUsers} color="emerald" delay={0.7} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-red-400" />
                        <h2 className="font-semibold">{t('alerts')}</h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('alerts')}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {recentAlerts.slice(0, 5).map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-xl"
                        >
                          <div className={`w-3 h-3 mt-1.5 rounded-full ${getSeverityColor(alert.severity).split(' ')[0]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{alert.title}</span>
                              <span className="text-xs text-slate-400">{getAlertTypeLabel(alert.alert_type)}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{alert.city} · {alert.country}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${alert.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                            {alert.is_active ? 'Active' : 'Expired'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Siren className="w-5 h-5 text-amber-400" />
                        <h2 className="font-semibold">Active SOS</h2>
                      </div>
                      <span className="text-sm text-slate-400">{activeSOSList.length} active</span>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {activeSOSList.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50 text-green-400" />
                          <p>No active SOS</p>
                        </div>
                      ) : (
                        activeSOSList.map((sos) => (
                          <div
                            key={sos.id}
                            className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-xl"
                          >
                            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                              <Siren className="w-5 h-5 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">SOS #{sos.id.slice(0, 8)}</span>
                                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                                  Stage {sos.stage}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                {sos.latitude && sos.longitude ? (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {sos.latitude.toFixed(4)}, {sos.longitude.toFixed(4)}
                                  </span>
                                ) : (
                                  'Location not available'
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => resolveSOS(sos.id)}
                              className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/30"
                            >
                              Resolve
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                      <Globe className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">AI Monitor Status</h3>
                      <p className="text-sm text-slate-300 mb-3">
                        24/7 real-time monitoring active. Collecting alerts from Ukraine, Israel, Syria, Turkey, and Palestine.
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-green-400">Data Collection Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full" />
                          <span className="text-blue-400">Auto-cleanup Enabled</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-400 rounded-full" />
                          <span className="text-amber-400">Push Notifications Ready</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'alerts' && (
              <motion.div
                key="alerts"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search alerts..."
                        className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm w-64"
                      />
                    </div>
                    <select
                      value={alertFilter}
                      onChange={(e) => setAlertFilter(e.target.value as any)}
                      className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                    >
                      <option value="all">All Alerts</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setShowCreateAlertModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                  >
                    <Plus className="w-4 h-4" />
                    Create Alert
                  </button>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Location</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Severity</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Created</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlerts.map((alert) => (
                        <tr key={alert.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${alert.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                              {alert.is_active ? 'Active' : 'Expired'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{alert.title}</td>
                          <td className="px-4 py-3 text-sm text-slate-400">{getAlertTypeLabel(alert.alert_type)}</td>
                          <td className="px-4 py-3 text-sm text-slate-400">{alert.city}, {alert.country}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(alert.severity).split(' ')[0]} bg-opacity-20`}>
                              {alert.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {new Date(alert.created_at || '').toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateAlertStatus(alert.id, !alert.is_active)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                {alert.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => deleteAlert(alert.id)}
                                className="p-1 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm w-64"
                    />
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">User</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Location</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold">{user.nickname?.[0] || 'U'}</span>
                              </div>
                              <span className="text-sm font-medium">{user.nickname || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">{user.email}</td>
                          <td className="px-4 py-3 text-sm text-slate-400">{user.city || 'Unknown'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${user.is_online ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                              {user.is_online ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {new Date(user.created_at || '').toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'shelters' && (
              <motion.div
                key="shelters"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search shelters..."
                      className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm w-64"
                    />
                  </div>
                  <button
                    onClick={() => setShowCreateShelterModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
                  >
                    <Plus className="w-4 h-4" />
                    Add Shelter
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shelters.map((shelter) => (
                    <motion.div
                      key={shelter.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-green-400" />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${shelter.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {shelter.status}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-1">{shelter.name}</h3>
                      <p className="text-sm text-slate-400 mb-3">{shelter.city}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Capacity</span>
                        <span className="font-medium">{shelter.current_occupancy}/{shelter.capacity}</span>
                      </div>
                      <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${((shelter.current_occupancy || 0) / (shelter.capacity || 1)) * 100}%` }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'announcements' && (
              <motion.div
                key="announcements"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-400" />
                    Announcements Management
                  </h2>
                  <button
                    onClick={openCreateAnnouncement}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Announcement
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { type: 'reward', label: 'Rewards', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
                    { type: 'promotion', label: 'Promotions', color: 'text-blue-400', bg: 'bg-blue-500/20' },
                    { type: 'info', label: 'Info', color: 'text-slate-400', bg: 'bg-slate-500/20' }
                  ].map(cat => (
                    <div key={cat.type} className={`${cat.bg} border border-slate-700 rounded-xl p-4 text-center`}>
                      <p className={`text-2xl font-bold ${cat.color}`}>{announcements.filter(a => a.type === cat.type).length}</p>
                      <p className="text-sm text-slate-400">{cat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {announcements.length === 0 && (
                    <div className="text-center py-12 text-slate-500">No announcements yet. Create your first announcement.</div>
                  )}
                  {announcements.map((ann) => (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              ann.type === 'reward' ? 'bg-yellow-500/20 text-yellow-400' :
                              ann.type === 'promotion' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {ann.type === 'reward' ? 'Reward' : ann.type === 'promotion' ? 'Promotion' : 'Info'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ann.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {ann.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h3 className="font-medium text-white">{ann.title}</h3>
                          {ann.content && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{ann.content}</p>}
                          <p className="text-xs text-slate-500 mt-2">{ann.created_at ? new Date(ann.created_at).toLocaleDateString() : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button onClick={() => openEditAnnouncement(ann)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteAnnouncement(ann.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Create/Edit Announcement Modal */}
                <AnimatePresence>
                  {showAnnouncementModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                      onClick={() => setShowAnnouncementModal(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold">{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h3>
                          <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm text-slate-400 mb-1 block">Title</label>
                            <input
                              type="text"
                              value={annForm.title}
                              onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                              placeholder="Announcement title..."
                            />
                          </div>
                          <div>
                            <label className="text-sm text-slate-400 mb-1 block">Content</label>
                            <textarea
                              value={annForm.content}
                              onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 min-h-[100px] resize-y"
                              placeholder="Announcement content..."
                            />
                          </div>
                          <div>
                            <label className="text-sm text-slate-400 mb-1 block">Type</label>
                            <select
                              value={annForm.type}
                              onChange={(e) => setAnnForm({ ...annForm, type: e.target.value })}
                              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                            >
                              <option value="reward">Reward (Platform Rewards)</option>
                              <option value="promotion">Promotion (Platform Info)</option>
                              <option value="info">Info (General)</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-sm text-slate-400">Active</label>
                            <button
                              onClick={() => setAnnForm({ ...annForm, is_active: !annForm.is_active })}
                              className={`w-10 h-6 rounded-full transition-colors ${annForm.is_active ? 'bg-green-500' : 'bg-slate-600'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${annForm.is_active ? 'translate-x-4' : ''}`} />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => setShowAnnouncementModal(false)}
                            className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveAnnouncement}
                            className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium"
                          >
                            {editingAnnouncement ? 'Update' : 'Create'}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'points' && (
              <motion.div
                key="points"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    Points Management
                  </h2>
                  <button
                    onClick={() => setShowPointsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl hover:bg-yellow-500/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Award Points
                  </button>
                </div>

                {/* Recent Transactions */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-700">
                    <h3 className="font-medium text-sm text-slate-300">Recent Point Transactions</h3>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {recentTransactions.length === 0 && (
                      <div className="text-center py-12 text-slate-500">No transactions yet</div>
                    )}
                    {recentTransactions.map((tx: any) => (
                      <div key={tx.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            <Coins className={`w-4 h-4 ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {tx.profiles?.nickname || tx.profiles?.email || tx.user_id?.slice(0, 8)}
                            </p>
                            <p className="text-xs text-slate-400">{tx.reason || tx.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </p>
                          <p className="text-xs text-slate-500">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Award Points Modal */}
                <AnimatePresence>
                  {showPointsModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                      onClick={() => setShowPointsModal(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Coins className="w-5 h-5 text-yellow-400" />
                            Award Points to User
                          </h3>
                          <button onClick={() => setShowPointsModal(false)} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          {/* User Search */}
                          <div>
                            <label className="text-sm text-slate-400 mb-1 block">Search User</label>
                            <input
                              type="text"
                              value={pointsUserSearch}
                              onChange={(e) => searchUsersForPoints(e.target.value)}
                              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                              placeholder="Enter nickname or email..."
                            />
                            {pointsSearchResults.length > 0 && !selectedPointsUser && (
                              <div className="mt-2 bg-slate-700 rounded-xl border border-slate-600 max-h-40 overflow-y-auto">
                                {pointsSearchResults.map(u => (
                                  <button
                                    key={u.id}
                                    onClick={() => { setSelectedPointsUser(u); setPointsUserSearch(u.nickname || u.email || ''); setPointsSearchResults([]); }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-600/50 transition-colors flex items-center gap-3"
                                  >
                                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                                      <Users className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{u.nickname || 'No name'}</p>
                                      <p className="text-xs text-slate-400">{u.email}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {selectedPointsUser && (
                              <div className="mt-2 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2">
                                <Users className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm">{selectedPointsUser.nickname || selectedPointsUser.email}</span>
                                <button onClick={() => { setSelectedPointsUser(null); setPointsUserSearch(''); }} className="ml-auto text-slate-400 hover:text-white">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Points Amount */}
                          <div>
                            <label className="text-sm text-slate-400 mb-1 block">Points Amount</label>
                            <input
                              type="number"
                              value={pointsAmount}
                              onChange={(e) => setPointsAmount(e.target.value)}
                              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                              placeholder="e.g. 100"
                              min="1"
                            />
                          </div>
                          {/* Type */}
                          <div>
                            <label className="text-sm text-slate-400 mb-1 block">Award Type</label>
                            <select
                              value={pointsType}
                              onChange={(e) => setPointsType(e.target.value)}
                              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500"
                            >
                              <option value="earn_rescue">Rescue Reward</option>
                              <option value="earn_alert">City Alert Reward</option>
                              <option value="earn_referral">Referral Reward</option>
                              <option value="earn_admin">Admin Award</option>
                            </select>
                          </div>
                          {/* Reason */}
                          <div>
                            <label className="text-sm text-slate-400 mb-1 block">Reason</label>
                            <textarea
                              value={pointsReason}
                              onChange={(e) => setPointsReason(e.target.value)}
                              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 min-h-[80px] resize-y"
                              placeholder="e.g. Successfully assisted in rescue operation #123"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => setShowPointsModal(false)}
                            className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={awardPoints}
                            disabled={!selectedPointsUser || !pointsAmount || parseInt(pointsAmount) <= 0}
                            className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Award Points
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ===== City Alerts Tab ===== */}
            {activeTab === 'city-alerts' && (
              <motion.div
                key="city-alerts"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MapPinned className="w-5 h-5 text-orange-400" />
                    City Alert Management
                  </h2>
                  <button onClick={fetchCityAlerts} className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>

                {cityAlerts.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <MapPinned className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No city alerts recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cityAlerts.map((ca) => (
                      <div key={ca.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                ca.severity === 'red' ? 'bg-red-500/20 text-red-400' :
                                ca.severity === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>{ca.severity?.toUpperCase()}</span>
                              <span className="text-white font-semibold">{ca.city}</span>
                              {ca.country && <span className="text-slate-400 text-sm">({ca.country})</span>}
                              {ca.is_confirmed && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Confirmed</span>}
                              {!ca.is_active && <span className="px-2 py-0.5 bg-slate-600/50 text-slate-400 rounded text-xs">Closed</span>}
                            </div>
                            <p className="text-slate-400 text-sm">{ca.alert_type} | {ca.user_count} users reported</p>
                            {ca.description && <p className="text-slate-500 text-sm mt-1">{ca.description}</p>}
                            <p className="text-slate-600 text-xs mt-1">
                              First report: {ca.first_report_time ? new Date(ca.first_report_time).toLocaleString() : '--'}
                              {ca.confirmed_at && <> | Confirmed: {new Date(ca.confirmed_at).toLocaleString()}</>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ca.is_active && !ca.is_confirmed && (
                              <button onClick={() => confirmCityAlert(ca.id)} className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/30">
                                <CheckCircle className="w-3.5 h-3.5 inline mr-1" />Confirm
                              </button>
                            )}
                            {ca.is_confirmed && !ca.reward_granted && (
                              <button onClick={() => rewardTopReporters(ca)} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs hover:bg-amber-500/30">
                                <Award className="w-3.5 h-3.5 inline mr-1" />Reward Top 10
                              </button>
                            )}
                            {ca.reward_granted && (
                              <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500/60 rounded-lg text-xs">Rewarded</span>
                            )}
                            {ca.is_active && (
                              <button onClick={() => closeCityAlert(ca.id)} className="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-xs hover:bg-slate-600">
                                <XCircle className="w-3.5 h-3.5 inline mr-1" />Close
                              </button>
                            )}
                            <button onClick={() => { setSelectedCityAlert(selectedCityAlert?.id === ca.id ? null : ca); fetchCityAlertReporters(ca.id); }}
                              className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600">
                              <Eye className="w-3.5 h-3.5 inline mr-1" />Reporters
                            </button>
                          </div>
                        </div>

                        {selectedCityAlert?.id === ca.id && (
                          <div className="mt-4 pt-4 border-t border-slate-700">
                            <h4 className="text-sm font-medium text-slate-300 mb-3">Reporter List (order by trigger time)</h4>
                            {(cityAlertReporters[ca.id] || []).length === 0 ? (
                              <p className="text-slate-500 text-sm">No reporters found</p>
                            ) : (
                              <div className="space-y-2">
                                {(cityAlertReporters[ca.id] || []).map((r: any, idx: number) => (
                                  <div key={r.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 10 ? 'bg-amber-500/30 text-amber-400' : 'bg-slate-600 text-slate-400'}`}>
                                        {idx + 1}
                                      </span>
                                      <div>
                                        <span className="text-white text-sm">{r.profiles?.nickname || r.profiles?.email || r.user_id.slice(0, 8)}</span>
                                        <span className="text-slate-500 text-xs ml-2">{r.reported_at ? new Date(r.reported_at).toLocaleString() : ''}</span>
                                      </div>
                                    </div>
                                    {r.reward_given && (
                                      <span className="text-amber-400 text-xs">+{r.reward_amount} pts</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ===== Support / Customer Service Tab ===== */}
            {activeTab === 'support' && (
              <motion.div
                key="support"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-teal-400" />
                    Customer Service
                  </h2>
                  <button onClick={fetchSupportConversations} className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: 480 }}>
                  {/* Conversation list */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-slate-700 bg-slate-800">
                      <p className="text-sm font-medium text-slate-300">Conversations ({supportConversations.length})</p>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                      {supportConversations.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-sm">No messages yet</div>
                      ) : supportConversations.map((conv) => (
                        <button
                          key={conv.user_id}
                          onClick={() => loadConversation(conv.user_id)}
                          className={`w-full text-left p-4 border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors ${
                            selectedSupportUser === conv.user_id ? 'bg-slate-700/50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-sm font-medium truncate">
                              {conv.nickname || conv.email || conv.user_id.slice(0, 8)}
                            </span>
                            {conv.unread_count > 0 && (
                              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs truncate">{conv.last_message}</p>
                          <p className="text-slate-600 text-xs mt-1">{conv.last_time ? new Date(conv.last_time).toLocaleString() : ''}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat area */}
                  <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                    {!selectedSupportUser ? (
                      <div className="flex-1 flex items-center justify-center text-slate-500">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Select a conversation</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 border-b border-slate-700 bg-slate-800">
                          <p className="text-sm font-medium text-slate-300">
                            {supportConversations.find(c => c.user_id === selectedSupportUser)?.nickname
                              || supportConversations.find(c => c.user_id === selectedSupportUser)?.email
                              || selectedSupportUser.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 340 }}>
                          {supportMessages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] px-4 py-2 rounded-xl text-sm ${
                                msg.sender_role === 'admin'
                                  ? 'bg-blue-500/20 text-blue-100 rounded-br-sm'
                                  : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                              }`}>
                                <p>{msg.content}</p>
                                <p className="text-[10px] mt-1 opacity-50">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 border-t border-slate-700 flex items-center gap-2">
                          <input
                            type="text"
                            value={supportReply}
                            onChange={(e) => setSupportReply(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendSupportReply()}
                            placeholder="Type a reply..."
                            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={sendSupportReply}
                            className="p-2 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'system' && (
              <motion.div
                key="system"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Server className="w-5 h-5 text-blue-400" />
                      System Status
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Radio className="w-5 h-5 text-green-400" />
                          <span>AI Monitor</span>
                        </div>
                        <span className="text-green-400 text-sm">{systemStatus.monitor}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Database className="w-5 h-5 text-blue-400" />
                          <span>Database</span>
                        </div>
                        <span className="text-green-400 text-sm">{systemStatus.database}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Wifi className="w-5 h-5 text-amber-400" />
                          <span>API Status</span>
                        </div>
                        <span className="text-green-400 text-sm">Operational</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-400" />
                      Performance Metrics
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-cyan-400" />
                          <span>Uptime</span>
                        </div>
                        <span className="text-cyan-400 text-sm font-medium">{systemStatus.uptime}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Zap className="w-5 h-5 text-yellow-400" />
                          <span>Response Time</span>
                        </div>
                        <span className="text-yellow-400 text-sm font-medium">45ms</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Cpu className="w-5 h-5 text-pink-400" />
                          <span>CPU Usage</span>
                        </div>
                        <span className="text-pink-400 text-sm font-medium">23%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, delay }: { icon: any, label: string, value: number, color: string, delay: number }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/20 text-red-400',
    amber: 'bg-amber-500/20 text-amber-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/20 text-emerald-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 ${colorClasses[color].split(' ')[0]} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[1]}`} />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </motion.div>
  );
}
