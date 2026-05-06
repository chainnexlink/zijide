import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Bell,
  Settings,
  Siren,
  HeartHandshake
} from 'lucide-react';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

type Invite = Tables<'invites'>;
type Profile = Tables<'profiles'>;

export default function InviteFriends() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      const code = `WAR${user.id.slice(0, 8).toUpperCase()}`;
      setInviteCode(code);
    }

    const { data: invitesData } = await supabase
      .from('invites')
      .select('*')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false });

    if (invitesData) {
      setInvites(invitesData);
    }

    setLoading(false);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/auth?invite=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareVia = (platform: string) => {
    const link = `${window.location.origin}/auth?invite=${inviteCode}`;
    const text = `加入 WarRescue，获取战区安全预警服务。使用我的邀请码：${inviteCode}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=邀请加入 WarRescue&body=${encodeURIComponent(text + '\n\n' + link)}`, '_blank');
        break;
      default:
        break;
    }
  };

  const registeredCount = invites.filter(i => i.status === 'registered' || i.status === 'rewarded').length;
  const rewardedCount = invites.filter(i => i.status === 'rewarded').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">邀请好友</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">邀请奖励</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5" />
                  邀请人获得当月订阅半价
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5" />
                  被邀请人无任何优惠
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5" />
                  月底自动重置
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4">我的邀请码</h3>

          <div className="flex items-center gap-2 p-4 bg-slate-700/50 rounded-xl mb-4">
            <span className="font-mono text-xl font-bold flex-1">{inviteCode}</span>
            <button
              onClick={copyInviteCode}
              className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={copyInviteLink}
            className="w-full h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 font-medium flex items-center justify-center gap-2 hover:bg-purple-500/30 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            复制邀请链接
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4">分享方式</h3>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => shareVia('whatsapp')}
              className="p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 mx-auto mb-2 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 font-bold">W</span>
              </div>
              <span className="text-sm text-slate-300">WhatsApp</span>
            </button>

            <button
              onClick={() => shareVia('email')}
              className="p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold">@</span>
              </div>
              <span className="text-sm text-slate-300">邮件</span>
            </button>

            <button
              onClick={copyInviteLink}
              className="p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 mx-auto mb-2 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Share2 className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-slate-300">更多</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              邀请记录
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">已邀请: {invites.length}</span>
              <span className="text-green-400">成功: {registeredCount}</span>
            </div>
          </div>

          <div className="space-y-3">
            {invites.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无邀请记录</p>
              </div>
            ) : (
              invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl"
                >
                  <div>
                    <p className="font-medium">{invite.invited_phone || invite.invited_email || '未知用户'}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(invite.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    invite.status === 'rewarded'
                      ? 'bg-green-500/20 text-green-400'
                      : invite.status === 'registered'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-600 text-slate-400'
                  }`}>
                    {invite.status === 'rewarded' ? '已奖励' :
                     invite.status === 'registered' ? '已注册' : '待注册'}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <Link to="/dashboard" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Bell className="w-6 h-6" />
              <span className="text-xs">首页</span>
            </Link>
            <Link to="/family-settings" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Users className="w-6 h-6" />
              <span className="text-xs">家庭</span>
            </Link>
            <Link to="/dashboard" className="flex flex-col items-center gap-1 p-2 -mt-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <Siren className="w-7 h-7 text-white" />
              </div>
            </Link>
            <Link to="/mutual-aid" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <HeartHandshake className="w-6 h-6" />
              <span className="text-xs">互助</span>
            </Link>
            <Link to="/settings" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Settings className="w-6 h-6" />
              <span className="text-xs">设置</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
