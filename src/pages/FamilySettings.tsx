import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Settings,
  Bell,
  Siren,
  HeartHandshake,
  ChevronRight,
  Copy,
  MapPin,
  Shield,
  LogOut,
  Crown,
  MoreVertical,
  Check,
  X,
  Home,
  SlidersHorizontal,
  Phone,
  Mail,
  AlertCircle,
  Clock,
  Navigation,
  MessageSquare,
  Share2,
  QrCode,
  Search,
  Radio,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRealtimeFamily } from '../hooks/useRealtime';
import WarMap, { MapMarker } from '../components/WarMap';
import type { Tables } from '../supabase/types';

type FamilyGroup = Tables<'family_groups'>;
type FamilyMember = Tables<'family_members'> & { profile?: Tables<'profiles'> };
type Profile = Tables<'profiles'>;

export default function FamilySettings() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'activity'>('members');
  const [showMap, setShowMap] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);

  const { location, startWatching, stopWatching } = useGeolocation();
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myMemberIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setCurrentUser(profile);

    const { data: memberData } = await supabase
      .from('family_members')
      .select('*, family_groups(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberData && memberData.family_groups) {
      setFamily(memberData.family_groups as FamilyGroup);
      setIsAdmin(memberData.role === 'admin');
      myMemberIdRef.current = memberData.id;

      const { data: allMembers } = await supabase
        .from('family_members')
        .select('*, profiles(*)')
        .eq('family_id', memberData.family_id);

      if (allMembers) {
        setMembers(allMembers as FamilyMember[]);
      }
    }

    setLoading(false);
  };

  // -- Realtime: listen for family member location updates --
  useRealtimeFamily(family?.id, (updatedMember: any) => {
    if (!updatedMember) return;
    setMembers(prev =>
      prev.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember, profile: m.profile } : m)
    );
  });

  // -- Location broadcasting --
  const broadcastLocation = useCallback(async () => {
    if (!myMemberIdRef.current || !location) return;
    await supabase
      .from('family_members')
      .update({
        latitude: location.latitude,
        longitude: location.longitude,
        location_accuracy: location.accuracy,
        location_updated_at: new Date().toISOString(),
        is_online: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', myMemberIdRef.current);
  }, [location]);

  // Start/stop broadcasting when locationSharing changes
  useEffect(() => {
    let mounted = true;
    if (locationSharing && family?.location_sharing_enabled) {
      startWatching();
      const doBroadcast = () => { if (mounted) broadcastLocation(); };
      broadcastTimerRef.current = setInterval(doBroadcast, 15000);
      doBroadcast();
    } else {
      stopWatching();
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
    }
    return () => {
      mounted = false;
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
    };
  }, [locationSharing, family?.location_sharing_enabled, startWatching, stopWatching, broadcastLocation]);

  // Auto-enable location sharing if family has it enabled
  useEffect(() => {
    if (family?.location_sharing_enabled) {
      setLocationSharing(true);
    }
  }, [family?.location_sharing_enabled]);

  // Build map markers from family members
  const familyMapMarkers: MapMarker[] = members
    .filter(m => m.latitude != null && m.longitude != null)
    .map(m => ({
      id: m.id,
      lat: m.latitude!,
      lng: m.longitude!,
      type: 'family' as const,
      label: m.profile?.nickname || '家人',
      popup: `<b>${m.profile?.nickname || '家人'}</b><br/>${
        m.is_online ? '🟢 在线' : '⚪ 离线'
      }${m.location_updated_at ? '<br/>' + new Date(m.location_updated_at).toLocaleTimeString() : ''}`,
    }));

  const createFamily = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newFamilyName) return;

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: familyData } = await supabase
      .from('family_groups')
      .insert({
        name: newFamilyName,
        invite_code: inviteCode,
        admin_id: user.id,
        max_members: 6
      })
      .select()
      .single();

    if (familyData) {
      await supabase
        .from('family_members')
        .insert({
          family_id: familyData.id,
          user_id: user.id,
          role: 'admin'
        });

      setShowCreateModal(false);
      fetchFamilyData();
    }
  };

  const joinFamily = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !inviteCode) return;

    const { data: familyData } = await supabase
      .from('family_groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (familyData) {
      await supabase
        .from('family_members')
        .insert({
          family_id: familyData.id,
          user_id: user.id,
          role: 'member'
        });

      setShowJoinModal(false);
      fetchFamilyData();
    }
  };

  const copyInviteCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSetting = async (setting: string) => {
    if (!family || !isAdmin) return;

    const updates: Record<string, boolean> = {};
    if (setting === 'location') updates.location_sharing_enabled = !family.location_sharing_enabled;
    if (setting === 'sos') updates.sos_sync_enabled = !family.sos_sync_enabled;
    if (setting === 'alert') updates.alert_sync_enabled = !family.alert_sync_enabled;

    await supabase
      .from('family_groups')
      .update(updates as any)
      .eq('id', family.id);

    fetchFamilyData();
  };

  const removeMember = async (memberId: string) => {
    await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId);
    setShowMemberMenu(null);
    fetchFamilyData();
  };

  const leaveFamily = async () => {
    if (!family || !currentUser) return;

    const member = members.find(m => m.user_id === currentUser.id);
    if (member) {
      await supabase
        .from('family_members')
        .delete()
        .eq('id', member.id);
    }

    setFamily(null);
    setMembers([]);
  };

  const onlineCount = members.filter(m => m.is_online).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-slate-950 text-white pb-24 md:pb-6">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">{t('familyGroup') || '家庭组'}</span>
              </div>
            </div>
          </div>
        </nav>

        <main className="pt-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-indigo-500/20 rounded-3xl flex items-center justify-center">
                <Users className="w-12 h-12 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t('noFamilyGroup') || '您还没有加入家庭组'}</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">{t('familyGroupDesc') || '创建或加入家庭组，与家人共享位置和预警信息，在紧急时刻互相守护'}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  {t('createFamily') || '创建家庭组'}
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="flex-1 px-8 py-4 bg-slate-800 border border-slate-700 rounded-xl font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <QrCode className="w-5 h-5" />
                  {t('joinFamily') || '加入家庭组'}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                {t('familyFeatures') || '家庭组功能'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="font-medium mb-1">{t('locationSharing') || '位置共享'}</h4>
                  <p className="text-sm text-slate-400">{t('locationSharingDesc') || '实时查看家人位置'}</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mb-3">
                    <Siren className="w-5 h-5 text-red-400" />
                  </div>
                  <h4 className="font-medium mb-1">{t('sosSync') || 'SOS联动'}</h4>
                  <p className="text-sm text-slate-400">{t('sosSyncDesc') || '一人求助全员通知'}</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
                    <Bell className="w-5 h-5 text-amber-400" />
                  </div>
                  <h4 className="font-medium mb-1">{t('alertSync') || '预警同步'}</h4>
                  <p className="text-sm text-slate-400">{t('alertSyncDesc') || '预警信息家庭共享'}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        <BottomNav />

        <AnimatePresence>
          {showCreateModal && (
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
                <h3 className="text-xl font-bold mb-4">{t('createFamily') || '创建家庭组'}</h3>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">{t('familyName') || '家庭组名称'}</label>
                  <input
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder={t('enterFamilyName') || '输入家庭组名称'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="space-y-3">
                  <button
                    onClick={createFamily}
                    disabled={!newFamilyName}
                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('create') || '创建'}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-full h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    {t('cancel') || '取消'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showJoinModal && (
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
                <h3 className="text-xl font-bold mb-4">{t('joinFamily') || '加入家庭组'}</h3>
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">{t('inviteCode') || '邀请码'}</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder={t('enterInviteCode') || '输入邀请码'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 uppercase"
                  />
                </div>
                <div className="space-y-3">
                  <button
                    onClick={joinFamily}
                    disabled={!inviteCode}
                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('join') || '加入'}
                  </button>
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="w-full h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    {t('cancel') || '取消'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 md:pb-6">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">{t('familyGroup') || '家庭组'}</span>
            </div>
            <Link to="/settings" className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50">
              <Settings className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold mb-1">{family.name}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span>{members.length}/{family.max_members} {t('members') || '成员'}</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {onlineCount} {t('online') || '在线'}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-indigo-400" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-xl">
              <span className="text-sm text-slate-400">{t('inviteCode') || '邀请码'}:</span>
              <span className="font-mono font-medium text-lg tracking-wider">{family.invite_code}</span>
              <button
                onClick={copyInviteCode}
                className="ml-auto p-2 text-indigo-400 hover:text-indigo-300 transition-colors rounded-lg hover:bg-indigo-500/20"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors rounded-lg hover:bg-indigo-500/20"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 mb-6 border-b border-slate-800">
            {[
              { id: 'members', label: t('members') || '成员', icon: Users },
              { id: 'settings', label: t('settings') || '设置', icon: SlidersHorizontal },
              { id: 'activity', label: t('activity') || '动态', icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-indigo-400 border-b-2 border-indigo-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'members' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Family Location Map */}
              {family.location_sharing_enabled && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-4">
                  <div className="flex items-center justify-between p-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-medium">{t('familyLocation') || '家人位置'}</span>
                      {locationSharing && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          {t('broadcasting') || '广播中'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLocationSharing(!locationSharing)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          locationSharing ? 'text-green-400 bg-green-500/20' : 'text-slate-500 bg-slate-800'
                        }`}
                        title={locationSharing ? '停止共享位置' : '开始共享位置'}
                      >
                        {locationSharing ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setShowMap(!showMap)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {showMap && (
                    <div className="h-64 sm:h-80">
                      <WarMap
                        markers={familyMapMarkers}
                        userLocation={location}
                        fitMarkers={familyMapMarkers.length > 0}
                        zoom={12}
                      />
                    </div>
                  )}
                  {familyMapMarkers.length === 0 && showMap && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-500 text-sm bg-slate-900/80 px-3 py-1.5 rounded-lg">
                        {t('noLocationData') || '暂无家人位置数据'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t('familyMembers') || '家庭成员'}</h3>
                {isAdmin && members.length < (family.max_members || 6) && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    {t('invite') || '邀请'}
                  </button>
                )}
              </div>

              {members.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all"
                >
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold">
                        {member.profile?.nickname?.[0] || 'U'}
                      </span>
                    </div>
                    {member.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.profile?.nickname || t('user') || '用户'}</span>
                      {member.role === 'admin' && (
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          {t('admin') || '管理员'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {member.is_online
                        ? t('online') || '在线'
                        : member.last_seen_at
                        ? `${t('lastSeen') || '上次在线'} ${new Date(member.last_seen_at).toLocaleDateString()}`
                        : t('offline') || '离线'}
                    </p>
                    {family.location_sharing_enabled && member.latitude != null && member.location_updated_at && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {t('locationUpdated') || '位置更新于'} {new Date(member.location_updated_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/family-settings/member/${member.id}`)}
                      className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                    {isAdmin && member.user_id !== currentUser?.id && (
                      <div className="relative">
                        <button
                          onClick={() => setShowMemberMenu(showMemberMenu === member.id ? null : member.id)}
                          className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {showMemberMenu === member.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-10"
                          >
                            <button
                              onClick={() => removeMember(member.id)}
                              className="w-full px-4 py-3 text-left text-red-400 hover:bg-slate-800 rounded-xl text-sm flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              {t('removeMember') || '移除成员'}
                            </button>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="font-semibold mb-4">{t('permissionSettings') || '权限设置'}</h3>

              {[
                {
                  key: 'location',
                  icon: MapPin,
                  iconColor: 'text-blue-400',
                  iconBg: 'bg-blue-500/20',
                  title: t('locationSharing') || '位置共享',
                  desc: t('locationSharingDesc') || '家庭成员可查看彼此位置',
                  enabled: family.location_sharing_enabled
                },
                {
                  key: 'sos',
                  icon: Siren,
                  iconColor: 'text-red-400',
                  iconBg: 'bg-red-500/20',
                  title: t('sosSync') || 'SOS联动',
                  desc: t('sosSyncDesc') || '一人SOS全员通知',
                  enabled: family.sos_sync_enabled
                },
                {
                  key: 'alert',
                  icon: Bell,
                  iconColor: 'text-amber-400',
                  iconBg: 'bg-amber-500/20',
                  title: t('alertSync') || '预警同步',
                  desc: t('alertSyncDesc') || '向所有成员推送预警',
                  enabled: family.alert_sync_enabled
                }
              ].map((setting) => {
                const Icon = setting.icon;
                return (
                  <motion.div
                    key={setting.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${setting.iconBg} rounded-xl flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${setting.iconColor}`} />
                      </div>
                      <div>
                        <p className="font-medium">{setting.title}</p>
                        <p className="text-sm text-slate-400">{setting.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSetting(setting.key)}
                      disabled={!isAdmin}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        setting.enabled ? 'bg-indigo-500' : 'bg-slate-700'
                      } ${!isAdmin ? 'opacity-50' : ''}`}
                    >
                      <motion.div
                        animate={{ x: setting.enabled ? 24 : 4 }}
                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                      />
                    </button>
                  </motion.div>
                );
              })}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
              >
                <button
                  onClick={leaveFamily}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">{isAdmin ? t('disbandFamily') || '解散家庭组' : t('leaveFamily') || '退出家庭组'}</span>
                </button>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Clock className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">{t('noActivity') || '暂无动态'}</p>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">{t('inviteFamily') || '邀请家人'}</h3>
              <p className="text-slate-400 text-sm mb-4">{t('inviteDesc') || '分享邀请码给家人，他们可以通过此码加入家庭组'}</p>
              <div className="flex items-center gap-2 p-4 bg-slate-800 rounded-xl mb-4">
                <span className="font-mono text-2xl tracking-wider">{family?.invite_code}</span>
                <button
                  onClick={copyInviteCode}
                  className="ml-auto p-2 text-indigo-400 hover:text-indigo-300"
                >
                  {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('close') || '关闭'}
                </button>
                <button
                  onClick={copyInviteCode}
                  className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold text-white"
                >
                  {t('copy') || '复制'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
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
          <Link to="/family-settings" className="flex flex-col items-center gap-1 p-2 text-indigo-400">
            <Users className="w-6 h-6" />
            <span className="text-xs">{t('family')}</span>
          </Link>
          <Link to="/settings" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
            <SlidersHorizontal className="w-6 h-6" />
            <span className="text-xs">{t('settings')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
