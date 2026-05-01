import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from './supabase';

// ==================== Account System ====================
export interface AdminAccount {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: 'superadmin' | 'admin' | 'viewer';
  createdAt: string;
}

const ACCOUNTS_KEY = 'wa_admin_accounts';
const SESSION_KEY = 'wa_admin_session';

// Default: admin / admin123
const DEFAULT_ACCOUNTS: AdminAccount[] = [{
  id: 'default-admin',
  username: 'admin',
  passwordHash: 'admin123',
  displayName: '测试管理员',
  role: 'admin',
  createdAt: '2024-01-01T00:00:00Z',
}];

export async function hashPwd(pwd: string): Promise<string> {
  return pwd;
}

export function getAdminAccounts(): AdminAccount[] {
  try {
    const stored: AdminAccount[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    const defaultIds = new Set(DEFAULT_ACCOUNTS.map(a => a.id));
    const customOnly = stored.filter(a => !defaultIds.has(a.id));
    return [...DEFAULT_ACCOUNTS, ...customOnly];
  } catch { return [...DEFAULT_ACCOUNTS]; }
}

export function saveAdminAccounts(accounts: AdminAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getSession(): AdminAccount | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

function setSession(account: AdminAccount | null) {
  if (account) localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  else localStorage.removeItem(SESSION_KEY);
}

// ==================== Context ====================
interface AdminCtx {
  supabase: typeof supabase;
  showToast: (msg: string) => void;
  navigate: (l1: string, l2?: string, l3?: string, data?: any) => void;
  level3Data: any;
  currentAdmin: AdminAccount | null;
}
export const AdminContext = createContext<AdminCtx>({} as AdminCtx);
export const useAdmin = () => useContext(AdminContext);

// ==================== Utility exports ====================
export const fmt = (d: string | null) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const sevColor = (s: string) => {
  const m: Record<string, string> = { red: 'bg-red-500/20 text-red-400 border-red-500/30', orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30', yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return m[s] || 'bg-blue-500/20 text-blue-400 border-blue-500/30';
};

export const stBadge = (status: string) => {
  const m: Record<string, string> = { active: 'bg-green-500/20 text-green-400', pending: 'bg-yellow-500/20 text-yellow-400', rescued: 'bg-blue-500/20 text-blue-400', cancelled: 'bg-gray-500/20 text-gray-400', approved: 'bg-green-500/20 text-green-400', dismissed: 'bg-red-500/20 text-red-400', completed: 'bg-blue-500/20 text-blue-400', expired: 'bg-gray-500/20 text-gray-400' };
  return m[status] || 'bg-slate-500/20 text-slate-400';
};

export const DetailRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex justify-between py-2.5 border-b border-slate-700/50">
    <span className="text-sm text-slate-400 shrink-0">{label}</span>
    <span className="text-sm text-white text-right max-w-[65%] break-all">{value ?? '-'}</span>
  </div>
);

export const Breadcrumb = ({ items, onNav }: { items: string[]; onNav: (idx: number) => void }) => (
  <div className="flex items-center gap-2 text-sm mb-0">
    {items.map((it, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="text-slate-600">/</span>}
        <button onClick={() => onNav(i)} className={i === items.length - 1 ? 'text-white font-medium' : 'text-slate-400 hover:text-blue-400'}>{it}</button>
      </React.Fragment>
    ))}
  </div>
);

export const SearchBar = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative flex-1">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
  </div>
);

export const Btn = ({ children, onClick, variant = 'primary', disabled, className = '' }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'success'; disabled?: boolean; className?: string }) => {
  const cls: Record<string, string> = { primary: 'bg-blue-600 hover:bg-blue-700 text-white', secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-300', danger: 'bg-red-600/20 hover:bg-red-600/40 text-red-400', success: 'bg-green-600 hover:bg-green-700 text-white' };
  return <button onClick={onClick} disabled={disabled} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${cls[variant]} ${className}`}>{children}</button>;
};

export const FilterBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`px-4 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{children}</button>
);

export const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export const StatCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
  <div className={`bg-gradient-to-br ${color} rounded-xl p-4 border border-white/10`}>
    <span className="text-white/70 text-xs">{label}</span>
    <div className="text-2xl font-bold text-white mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</div>
  </div>
);

// ==================== Page imports ====================
import DashboardPage from './pages/Dashboard';
import UserCenterPage from './pages/UserCenter';
import AlertCenterPage from './pages/AlertCenter';
import SOSRescuePage from './pages/SOSRescue';
import ShelterMgmtPage from './pages/ShelterMgmt';
import SubscriptionMgmtPage from './pages/SubscriptionMgmt';
import FamilyMgmtPage from './pages/FamilyMgmt';
import MutualAidPage from './pages/MutualAid';
import ContentMgmtPage from './pages/ContentMgmt';
import SystemMgmtPage from './pages/SystemMgmt';
import AIWorkMgmtPage from './pages/AIWorkMgmt';
import CustomerServicePage from './pages/CustomerService';
import RescueOrgMgmtPage from './pages/RescueOrgMgmt';

// ==================== Menu Config ====================
interface MenuItem { key: string; label: string; icon: React.ReactNode; children: { key: string; label: string }[]; }

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: '仪表盘', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, children: [{ key: 'overview', label: '数据概览' }, { key: 'realtime', label: '实时监控' }] },
  { key: 'users', label: '用户中心', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, children: [{ key: 'list', label: '用户列表' }, { key: 'guests', label: '游客管理' }, { key: 'invites', label: '邀请管理' }, { key: 'settings', label: '用户设置' }] },
  { key: 'alerts', label: '预警中心', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, children: [{ key: 'list', label: '预警列表' }, { key: 'ai', label: 'AI预警管理' }, { key: 'cityAlert', label: '同城预警' }, { key: 'simulation', label: '模拟预警' }, { key: 'alertSettings', label: '预警设置' }] },
  { key: 'sos', label: 'SOS/救援', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>, children: [{ key: 'records', label: 'SOS记录' }, { key: 'rescue', label: '救援审批' }, { key: 'responses', label: '互助响应' }] },
  { key: 'shelters', label: '避难所管理', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>, children: [{ key: 'list', label: '避难所列表' }, { key: 'facilities', label: '设施统计' }] },
  { key: 'rescueorgs', label: '救援组织管理', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, children: [{ key: 'list', label: '组织列表' }, { key: 'statistics', label: '统计分析' }, { key: 'aiSchedule', label: 'AI采集计划' }] },
  { key: 'subscriptions', label: '订阅支付', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, children: [{ key: 'plans', label: '方案管理' }, { key: 'list', label: '订阅管理' }, { key: 'orders', label: '订单管理' }, { key: 'revenue', label: '收入统计' }] },
  { key: 'family', label: '家庭管理', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, children: [{ key: 'groups', label: '家庭组列表' }, { key: 'members', label: '成员管理' }] },
  { key: 'mutualaid', label: '互助系统', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/></svg>, children: [{ key: 'events', label: '求助事件' }, { key: 'subscriptions', label: '互助订阅' }, { key: 'responses', label: '响应记录' }, { key: 'skills', label: '技能管理' }, { key: 'messages', label: '聊天记录' }, { key: 'reviews', label: '评价管理' }, { key: 'rewards', label: '奖励管理' }, { key: 'analytics', label: '数据分析' }] },
  { key: 'customerservice', label: '客服中心', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, children: [{ key: 'sessions', label: '会话列表' }, { key: 'messages', label: '消息记录' }] },
  { key: 'content', label: '内容管理', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, children: [{ key: 'announcements', label: '公告管理' }, { key: 'cities', label: '城市管理' }] },
  { key: 'aiwork', label: 'AI工作管理', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.93-4H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="9.5" cy="15.5" r="1"/><circle cx="14.5" cy="15.5" r="1"/></svg>, children: [{ key: 'overview', label: 'AI总览' }, { key: 'monitor', label: '实时监控' }, { key: 'timeAnalysis', label: '时间差分析' }, { key: 'shelterAI', label: '避难所AI' }] },
  { key: 'system', label: '系统管理', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>, children: [{ key: 'monitor', label: '服务监控' }, { key: 'aiCollect', label: 'AI采集管理' }, { key: 'functions', label: 'Edge Functions' }, { key: 'notifications', label: '通知日志' }, { key: 'sms', label: 'SMS记录' }, { key: 'admins', label: '管理员管理' }] },
];

// ==================== Main App ====================
export default function App() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [level1, setLevel1] = useState('dashboard');
  const [level2, setLevel2] = useState('overview');
  const [level3, setLevel3] = useState<string | null>(null);
  const [level3Data, setLevel3Data] = useState<any>(null);
  const [expandedMenu, setExpandedMenu] = useState<string>('dashboard');

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  const navigate = useCallback((l1: string, l2?: string, l3?: string, data?: any) => {
    setLevel1(l1);
    if (l2) setLevel2(l2);
    else { const item = menuItems.find(m => m.key === l1); if (item?.children[0]) setLevel2(item.children[0].key); }
    setLevel3(l3 || null);
    setLevel3Data(data || null);
    setExpandedMenu(l1);
  }, []);

  useEffect(() => {
    const session = getSession();
    if (session) {
      const accounts = getAdminAccounts();
      const found = accounts.find(a => a.id === session.id);
      if (found) setCurrentAdmin(found);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => { setSession(null); setCurrentAdmin(null); };
  const handleLogin = (account: AdminAccount) => { setSession(account); setCurrentAdmin(account); };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!currentAdmin) return <LoginPage onLogin={handleLogin} />;

  const currentL1 = menuItems.find(m => m.key === level1) || menuItems[0];
  const bcItems = [currentL1.label, currentL1.children.find(c => c.key === level2)?.label || ''];
  if (level3) bcItems.push(level3);

  const renderPage = () => {
    const props = { sub: level2 };
    switch (level1) {
      case 'dashboard': return <DashboardPage {...props} />;
      case 'users': return <UserCenterPage {...props} />;
      case 'alerts': return <AlertCenterPage {...props} />;
      case 'sos': return <SOSRescuePage {...props} />;
      case 'shelters': return <ShelterMgmtPage {...props} />;
      case 'rescueorgs': return <RescueOrgMgmtPage {...props} />;
      case 'subscriptions': return <SubscriptionMgmtPage {...props} />;
      case 'family': return <FamilyMgmtPage {...props} />;
      case 'mutualaid': return <MutualAidPage {...props} />;
      case 'content': return <ContentMgmtPage {...props} />;
      case 'customerservice': return <CustomerServicePage {...props} />;
      case 'aiwork': return <AIWorkMgmtPage {...props} />;
      case 'system': return <SystemMgmtPage {...props} />;
      default: return <DashboardPage sub="overview" />;
    }
  };

  const roleName: Record<string, string> = { superadmin: '超级管理员', admin: '管理员', viewer: '只读' };

  return (
    <AdminContext.Provider value={{ supabase, showToast, navigate, level3Data, currentAdmin }}>
      <div className="min-h-screen bg-slate-900 flex">
        {/* Sidebar */}
        <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col fixed h-full z-40 overflow-y-auto">
          <div className="p-4 border-b border-slate-700 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/></svg>
            </div>
            <div><div className="font-bold text-white text-sm">WarRescue</div><div className="text-[10px] text-slate-400">后台管理系统</div></div>
          </div>
          <nav className="flex-1 py-1">
            {menuItems.map(item => (
              <div key={item.key}>
                <button onClick={() => { setExpandedMenu(expandedMenu === item.key ? '' : item.key); navigate(item.key); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${level1 === item.key ? 'text-blue-400 bg-blue-600/10' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}>
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left text-xs">{item.label}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${expandedMenu === item.key ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                {expandedMenu === item.key && (
                  <div className="bg-slate-900/30">
                    {item.children.map(child => (
                      <button key={child.key} onClick={() => { setLevel1(item.key); setLevel2(child.key); setLevel3(null); setLevel3Data(null); }}
                        className={`w-full text-left pl-11 pr-4 py-2 text-xs transition-colors ${level1 === item.key && level2 === child.key ? 'text-blue-400 bg-blue-600/10 border-r-2 border-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'}`}>
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-slate-700 text-center"><div className="text-[10px] text-slate-500">v1.0.0</div></div>
        </aside>

        <main className="flex-1 ml-56">
          <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
            <Breadcrumb items={bcItems.filter(Boolean) as string[]} onNav={(idx) => { if (idx <= 1) { setLevel3(null); setLevel3Data(null); } }} />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white">{currentAdmin.displayName}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${currentAdmin.role === 'superadmin' ? 'bg-red-500/20 text-red-400' : currentAdmin.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {roleName[currentAdmin.role] || currentAdmin.role}
                </span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> 退出
              </button>
            </div>
          </header>
          <div className="p-6">{renderPage()}</div>
        </main>
        {toastMsg && <div className="fixed bottom-6 right-6 bg-slate-800 border border-slate-600 rounded-xl px-5 py-3 shadow-xl z-50 text-sm text-white">{toastMsg}</div>}
      </div>
    </AdminContext.Provider>
  );
}

function LoginPage({ onLogin }: { onLogin: (account: AdminAccount) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    const accounts = getAdminAccounts();
    const match = accounts.find(a => a.username === username && a.passwordHash === password);
    if (match) { onLogin(match); }
    else { setError('用户名或密码错误'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-white">WarRescue 后台管理</h1>
          <p className="text-slate-400 mt-2 text-sm">仅限授权管理员访问</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          {error && <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">{error}</div>}
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm" placeholder="输入用户名" required />
          </div>
          <div className="mb-6">
            <label className="block text-sm text-slate-400 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm" placeholder="输入密码" required />
          </div>
          <button type="submit" disabled={busy} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm">
            {busy ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
