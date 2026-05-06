import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Bell,
  AlertTriangle,
  Map,
  Database,
  Users,
  HeartHandshake,
  Globe,
  LogOut,
  ChevronRight,
  Siren,
  Shield,
  Home,
  SlidersHorizontal,
  Moon,
  Sun,
  Smartphone,
  Mail,
  CreditCard,
  Coins,
  FileText,
  HelpCircle,
  Info,
  Check,
  X,
  Crown,
  Zap
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import type { Language } from '../i18n';
import type { Tables } from '../supabase/types';

type Profile = Tables<'profiles'>;

interface SettingsItem {
  icon: React.ElementType;
  label: string;
  description: string;
  path: string;
  color: string;
  bgColor: string;
  badge?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { t, language, setLanguage, languages } = useI18n();
  const [user, setUser] = useState<Profile | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('wa_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

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
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Call edge function to delete user data
        await supabase.functions.invoke('delete-account', {
          body: { userId: authUser.id }
        });
      }
      await supabase.auth.signOut();
      navigate('/');
    } catch (e) {
      console.error('Delete account error:', e);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleLanguageChange = async (langCode: Language) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase
        .from('profiles')
        .update({ language: langCode })
        .eq('id', authUser.id);
      setLanguage(langCode);
    }
    setShowLangModal(false);
  };

  const settingsGroups = [
    {
      title: t('account') || '账号',
      items: [
        {
          icon: User,
          label: t('profile') || '个人资料',
          description: t('profileDesc') || '编辑头像、昵称等基本信息',
          path: '/profile-edit',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20'
        },
        {
          icon: Lock,
          label: t('security') || '账号安全',
          description: t('securityDesc') || '修改密码、绑定手机邮箱',
          path: '/account-security',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20'
        },
        {
          icon: CreditCard,
          label: t('subscription') || '订阅管理',
          description: t('subscriptionDesc') || '管理您的订阅计划',
          path: '/subscription',
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          badge: t('pro') || 'Pro'
        },
        {
          icon: Coins,
          label: t('myPoints') || '我的积分',
          description: t('pointsDesc') || '积分可抵扣订阅费用',
          path: '/points',
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/20'
        }
      ] as SettingsItem[]
    },
    {
      title: t('preferences') || '偏好',
      items: [
        {
          icon: Bell,
          label: t('notifications') || '通知设置',
          description: t('notificationsDesc') || '推送、声音、震动提醒',
          path: '/notification-settings',
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/20'
        },
        {
          icon: AlertTriangle,
          label: t('alertSettings') || '预警设置',
          description: t('alertSettingsDesc') || '监控范围、预警类型',
          path: '/alert-settings',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20'
        },
        {
          icon: Map,
          label: t('mapSettings') || '地图设置',
          description: t('mapSettingsDesc') || '地图类型、离线地图',
          path: '/map-settings',
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/20'
        },
        {
          icon: Database,
          label: t('storage') || '存储设置',
          description: t('storageDesc') || '清理缓存、管理空间',
          path: '/storage-settings',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/20'
        }
      ] as SettingsItem[]
    },
    {
      title: t('features') || '功能',
      items: [
        {
          icon: Shield,
          label: t('emergencyProfile') || '紧急医疗资料',
          description: t('emergencyProfileDesc') || '血型、过敏史、紧急联系人',
          path: '/emergency-profile',
          color: 'text-rose-400',
          bgColor: 'bg-rose-500/20'
        },
        {
          icon: Users,
          label: t('familyGroup') || '家庭组管理',
          description: t('familyGroupDesc') || '管理家庭成员和权限',
          path: '/family-settings',
          color: 'text-indigo-400',
          bgColor: 'bg-indigo-500/20'
        },
        {
          icon: HeartHandshake,
          label: t('mutualAid') || '1公里互助',
          description: t('mutualAidDesc') || '订阅附近SOS预警',
          path: '/mutual-aid',
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/20'
        }
      ] as SettingsItem[]
    },
    {
      title: t('about') || '关于',
      items: [
        {
          icon: HelpCircle,
          label: t('help') || '帮助中心',
          description: t('helpDesc') || '常见问题、使用指南',
          path: '/help',
          color: 'text-teal-400',
          bgColor: 'bg-teal-500/20'
        },
        {
          icon: FileText,
          label: t('terms') || '用户协议',
          description: t('termsDesc') || '服务条款、隐私政策',
          path: '/terms',
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/20'
        },
        {
          icon: Info,
          label: t('aboutApp') || '关于应用',
          description: t('aboutAppDesc') || '版本信息、反馈建议',
          path: '/about',
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/20'
        }
      ] as SettingsItem[]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <SlidersHorizontal className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">{t('settings') || '设置'}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user?.nickname || t('user') || '用户'}</h2>
                <p className="text-slate-400">{user?.phone || user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    {t('proMember') || 'Pro会员'}
                  </span>
                </div>
              </div>
              <Link
                to="/profile-edit"
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                <ChevronRight className="w-6 h-6" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="font-medium">{t('language') || '语言'}</p>
                  <p className="text-sm text-slate-400">
                    {languages.find(l => l.code === language)?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLangModal(true)}
                className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                {t('change') || '更改'}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <p className="font-medium">{t('darkMode') || '深色模式'}</p>
                  <p className="text-sm text-slate-400">{isDarkMode ? t('on') || '开启' : t('off') || '关闭'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const next = !isDarkMode;
                  setIsDarkMode(next);
                  localStorage.setItem('wa_dark_mode', String(next));
                }}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  isDarkMode ? 'bg-indigo-500' : 'bg-slate-700'
                }`}
              >
                <motion.div
                  animate={{ x: isDarkMode ? 24 : 4 }}
                  className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                />
              </button>
            </div>
          </motion.div>

          {settingsGroups.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + groupIndex * 0.05 }}
              className="mb-6"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-3 px-1">{group.title}</h3>
              <div className="space-y-2">
                {group.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (groupIndex * 0.05) + (itemIndex * 0.02) }}
                    >
                      <Link
                        to={item.path}
                        className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group"
                      >
                        <div className={`w-10 h-10 ${item.bgColor} rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{item.label}</h3>
                            {item.badge && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400">{item.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-4 space-y-3"
          >
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t('logout') || '退出登录'}</span>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-center gap-2 p-3 text-slate-500 hover:text-red-400 transition-colors text-sm"
            >
              {language === 'zh' ? '删除账号' : 'Delete Account'}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center text-slate-500 text-sm"
          >
            <p className="font-medium">WarRescue v{process.env.APP_VERSION || '1.0.0'}</p>
            <p className="mt-1">{t('slogan') || '在战区，每一秒都值得被守护'}</p>
            <p className="mt-2 text-xs">&copy; 2026 WarRescue. All rights reserved.</p>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {showLangModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80"
            onClick={() => setShowLangModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{t('selectLanguage') || '选择语言'}</h3>
                  <button
                    onClick={() => setShowLangModal(false)}
                    className="p-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full p-4 rounded-xl text-left transition-colors flex items-center justify-between ${
                      language === lang.code
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{lang.name}</span>
                    {language === lang.code && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutModal && (
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
                  <LogOut className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t('confirmLogout') || '确认退出'}</h3>
                <p className="text-slate-400 text-sm">{t('logoutDesc') || '退出后需要重新登录'}</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl font-semibold text-white"
                >
                  {t('confirm') || '确认'}
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
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
        {showDeleteModal && (
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
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {language === 'zh' ? '删除账号' : 'Delete Account'}
                </h3>
                <p className="text-slate-400 text-sm">
                  {language === 'zh'
                    ? '此操作不可撤销。您的所有数据将被永久删除，包括订阅信息、个人资料和历史记录。'
                    : 'This action cannot be undone. All your data will be permanently deleted, including subscriptions, profile, and history.'}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 rounded-xl font-semibold text-white disabled:opacity-50"
                >
                  {deleting
                    ? (language === 'zh' ? '删除中...' : 'Deleting...')
                    : (language === 'zh' ? '确认删除' : 'Delete Permanently')}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('cancel') || '取消'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50">
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
            <Link to="/settings" className="flex flex-col items-center gap-1 p-2 text-red-400">
              <SlidersHorizontal className="w-6 h-6" />
              <span className="text-xs">{t('settings')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
