import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  Shield,
  Navigation,
  Siren,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
  Clock,
  Menu,
  X,
  Activity,
  HeartHandshake,
  CreditCard,
  Map,
  Megaphone,
  BellRing,
  Check,
  Trash2
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import { useDemo } from '../App';
import { useNotification } from '../hooks/useNotification';
import { useRealtimeAlerts } from '../hooks/useRealtime';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

export default function WebLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage, languages } = useI18n();
  const { isDemo, exitDemo } = useDemo();
  const { notifications, unreadCount, pushNotification, requestPermission, markRead, markAllRead, clearAll } = useNotification();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    requestPermission();
  }, []);

  // Global realtime alert listener - push notification for any new alert
  useRealtimeAlerts((newAlert: any) => {
    const sevLabel = newAlert.severity === 'red' ? (t('urgent') || 'Urgent') : newAlert.severity === 'orange' ? (t('alertLabel') || 'Warning') : (t('notice') || 'Notice');
    pushNotification({
      title: `[${sevLabel}] ${newAlert.title}`,
      body: newAlert.description || `${newAlert.city || ''} ${newAlert.country || ''} - ${newAlert.alert_type}`,
      type: 'alert',
      severity: newAlert.severity,
      data: { alertId: newAlert.id },
    });
  });

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const mainNav: NavItem[] = [
    { icon: LayoutDashboard, label: t('home') || 'Dashboard', path: '/dashboard' },
    { icon: Bell, label: t('alerts') || 'Alerts', path: '/alert-history' },
    { icon: Shield, label: t('nearbyShelter') || 'Shelters', path: '/shelters' },
    { icon: Map, label: t('escapeRoute') || 'Route Plan', path: '/route-plan' },
    { icon: Siren, label: 'SOS', path: '/sos-history' },
    { icon: Users, label: t('family') || 'Family', path: '/family-settings' },
    { icon: Megaphone, label: t('announcements') || 'Announcements', path: '/announcements' },
    { icon: HeartHandshake, label: t('mutualAid') || 'Mutual Aid', path: '/mutual-aid' },
  ];

  const bottomNav: NavItem[] = [
    { icon: CreditCard, label: t('subscription') || 'Subscription', path: '/subscription' },
  ];

  const handleLogout = async () => {
    if (isDemo) {
      exitDemo();
      navigate('/');
    } else {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800/50 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 flex-shrink-0">
          <Siren className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-white">WarRescue</h1>
            <p className="text-[10px] text-slate-500 leading-none">{t('aiMonitorRunning') || 'AI Monitoring Active'}</p>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className={`text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 ${collapsed ? 'text-center' : 'px-3'}`}>
          {collapsed ? '...' : (t('main') || 'MAIN').toUpperCase()}
        </p>
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-red-500/15 text-red-400 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-red-400' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="my-4 border-t border-slate-800/50" />

        <p className={`text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 ${collapsed ? 'text-center' : 'px-3'}`}>
          {collapsed ? '...' : (t('system') || 'SYSTEM').toUpperCase()}
        </p>
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-red-500/15 text-red-400 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-red-400' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t border-slate-800/50">
        {!collapsed && isDemo && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Activity className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-400">Demo Mode</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>{t('logout') || 'Logout'}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Desktop/iPad Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900/50 border-r border-slate-800/50 transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
        style={{ position: 'sticky', top: 0, height: '100vh' }}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[260px] h-full bg-slate-900 border-r border-slate-800/50 z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
          <div className="flex items-center justify-between h-14 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 text-slate-400 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="hidden sm:inline">{t('aiMonitorRunning') || 'AI Monitor Running'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifPanel(!showNotifPanel); setShowLangMenu(false); }}
                  className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  {unreadCount > 0 ? <BellRing className="w-5 h-5 text-red-400" /> : <Bell className="w-5 h-5" />}
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifPanel && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-[70vh] flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                      <span className="font-semibold text-white text-sm">{t('notificationCenter') || '通知中心'}</span>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="p-1.5 text-slate-400 hover:text-blue-400 rounded" title={t('markAllRead') || '全部已读'}>
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={clearAll} className="p-1.5 text-slate-400 hover:text-red-400 rounded" title={t('clearNotifications') || '清空'}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowNotifPanel(false)} className="p-1.5 text-slate-400 hover:text-white rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm">{t('noNotificationsYet') || '暂无通知'}</div>
                      ) : (
                        notifications.slice(0, 50).map(n => (
                          <button
                            key={n.id}
                            onClick={() => {
                              markRead(n.id);
                              if (n.data?.alertId) { navigate(`/alert/${n.data.alertId}`); setShowNotifPanel(false); }
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${!n.read ? 'bg-slate-800/30' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                n.type === 'sos' ? 'bg-red-500' :
                                n.severity === 'red' ? 'bg-red-500' :
                                n.severity === 'orange' ? 'bg-orange-500' :
                                n.severity === 'yellow' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                                <p className="text-[10px] text-slate-600 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                              </div>
                              {!n.read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => { setShowLangMenu(!showLangMenu); setShowNotifPanel(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors text-sm"
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">{languages.find(l => l.code === language)?.name}</span>
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 py-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-800 transition-colors ${
                          language === lang.code ? 'text-red-400' : 'text-slate-300'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <button
                onClick={() => { navigate('/settings'); setShowLangMenu(false); setShowNotifPanel(false); }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
                title={t('settings') || 'Settings'}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
