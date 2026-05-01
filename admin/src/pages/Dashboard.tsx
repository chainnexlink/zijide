import React, { useState, useEffect } from 'react';
import { useAdmin, StatCard, fmt } from '../App';

export default function DashboardPage({ sub }: { sub: string }) {
  const { supabase, navigate } = useAdmin();
  const [stats, setStats] = useState<any>({});
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentSOS, setRecentSOS] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [pendingRescue, setPendingRescue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const load = async () => {
    const [u, a, s, sh, rp, sub_, o, f] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('alerts').select('*', { count: 'exact', head: true }),
      supabase.from('sos_records').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('shelters').select('*', { count: 'exact', head: true }),
      supabase.from('rescue_pending').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscription_orders').select('*', { count: 'exact', head: true }),
      supabase.from('family_groups').select('*', { count: 'exact', head: true }),
    ]);
    const today = new Date(); today.setHours(0,0,0,0);
    const { count: todayA } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
    const { count: rescued } = await supabase.from('sos_records').select('*', { count: 'exact', head: true }).eq('status', 'rescued');
    const { count: guests } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_guest', true);
    const { count: invites } = await supabase.from('invites').select('*', { count: 'exact', head: true });

    setStats({ users: u.count||0, alerts: a.count||0, activeSOS: s.count||0, shelters: sh.count||0, pendingRescue: rp.count||0, subs: sub_.count||0, orders: o.count||0, families: f.count||0, todayAlerts: todayA||0, rescued: rescued||0, guests: guests||0, invites: invites||0 });

    const { data: ra } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5);
    setRecentAlerts(ra || []);
    const { data: rs } = await supabase.from('sos_records').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5);
    setRecentSOS(rs || []);
    const { data: ru } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
    setRecentUsers(ru || []);
    const { data: rr } = await supabase.from('rescue_pending').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
    setPendingRescue(rr || []);
    setLoading(false);
  };

  if (sub === 'realtime') {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">实时监控</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[{ l: '活跃SOS', v: stats.activeSOS || 0, c: stats.activeSOS > 0 ? 'bg-red-500' : 'bg-green-500' },
            { l: '待审救援', v: stats.pendingRescue || 0, c: stats.pendingRescue > 0 ? 'bg-orange-500' : 'bg-green-500' },
            { l: '今日预警', v: stats.todayAlerts || 0, c: 'bg-blue-500' },
            { l: '活跃订阅', v: stats.subs || 0, c: 'bg-purple-500' }
          ].map(i => (
            <div key={i.l} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${i.c} animate-pulse`} />
                <span className="text-white font-medium text-sm">{i.l}</span>
              </div>
              <div className="text-3xl font-bold text-white">{i.v}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">活跃SOS实时列表</h3>
            {recentSOS.length > 0 ? recentSOS.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg mb-2">
                <div>
                  <div className="text-sm text-white">SOS #{s.id.slice(0,8)} - 阶段 {s.stage||1}</div>
                  <div className="text-xs text-slate-400">{s.trigger_method} | {fmt(s.created_at)}</div>
                </div>
                <button onClick={() => navigate('sos', 'records', 'detail', s)} className="text-xs text-blue-400 hover:text-blue-300">详情</button>
              </div>
            )) : <div className="text-slate-500 text-center py-8">暂无活跃SOS</div>}
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">待审批救援</h3>
            {pendingRescue.length > 0 ? pendingRescue.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg mb-2">
                <div>
                  <div className="text-sm text-white">{r.address || '未知位置'}</div>
                  <div className="text-xs text-slate-400">P{r.priority||0} | {fmt(r.created_at)}</div>
                </div>
                <button onClick={() => navigate('sos', 'rescue', 'detail', r)} className="text-xs text-blue-400 hover:text-blue-300">审批</button>
              </div>
            )) : <div className="text-slate-500 text-center py-8">暂无待审批</div>}
          </div>
        </div>
      </div>
    );
  }

  // Default: overview
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">数据概览</h2>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15A9 9 0 1 1 21 12"/></svg> 刷新
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="总用户数" value={stats.users||0} color="from-blue-600 to-blue-800" />
        <StatCard label="注册用户" value={(stats.users||0)-(stats.guests||0)} color="from-cyan-600 to-cyan-800" />
        <StatCard label="游客数" value={stats.guests||0} color="from-yellow-600 to-yellow-800" />
        <StatCard label="总预警" value={stats.alerts||0} color="from-red-600 to-red-800" />
        <StatCard label="今日预警" value={stats.todayAlerts||0} color="from-orange-600 to-orange-800" />
        <StatCard label="活跃SOS" value={stats.activeSOS||0} color="from-pink-600 to-pink-800" />
        <StatCard label="待审救援" value={stats.pendingRescue||0} color="from-purple-600 to-purple-800" />
        <StatCard label="已解救" value={stats.rescued||0} color="from-green-600 to-green-800" />
        <StatCard label="避难所" value={stats.shelters||0} color="from-emerald-600 to-emerald-800" />
        <StatCard label="家庭组" value={stats.families||0} color="from-indigo-600 to-indigo-800" />
        <StatCard label="活跃订阅" value={stats.subs||0} color="from-violet-600 to-violet-800" />
        <StatCard label="邀请数" value={stats.invites||0} color="from-teal-600 to-teal-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickList title="最近预警" items={recentAlerts} onMore={() => navigate('alerts', 'list')} render={a => (
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1"><div className="text-sm text-white truncate">{a.title}</div><div className="text-xs text-slate-400">{a.city} | {a.alert_type} | {fmt(a.created_at)}</div></div>
            <span className={`px-2 py-1 rounded text-xs border shrink-0 ml-2 ${a.severity === 'red' ? 'bg-red-500/20 text-red-400 border-red-500/30' : a.severity === 'orange' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>{a.severity}</span>
          </div>
        )} />
        <QuickList title="活跃SOS" items={recentSOS} onMore={() => navigate('sos', 'records')} render={s => (
          <div className="flex items-center justify-between">
            <div><div className="text-sm text-white">SOS #{s.id.slice(0,8)}</div><div className="text-xs text-slate-400">触发: {s.trigger_method} | 阶段: {s.stage||1} | {fmt(s.created_at)}</div></div>
            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">{s.status}</span>
          </div>
        )} />
        <QuickList title="待审批救援" items={pendingRescue} onMore={() => navigate('sos', 'rescue')} render={r => (
          <div className="flex items-center justify-between">
            <div><div className="text-sm text-white">{r.address || '未知位置'}</div><div className="text-xs text-slate-400">P{r.priority||0} | {fmt(r.created_at)}</div></div>
            <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">pending</span>
          </div>
        )} />
        <QuickList title="最新注册用户" items={recentUsers} onMore={() => navigate('users', 'list')} render={u => (
          <div className="flex items-center justify-between">
            <div><div className="text-sm text-white">{u.nickname || u.email || '未设置'}</div><div className="text-xs text-slate-400">{u.city||'-'} | {u.phone||u.email||'-'} | {fmt(u.created_at)}</div></div>
            {u.is_guest && <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">游客</span>}
          </div>
        )} />
      </div>
    </div>
  );
}

function QuickList({ title, items, onMore, render }: { title: string; items: any[]; onMore: () => void; render: (item: any) => React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">{title}</h3>
        <button onClick={onMore} className="text-sm text-blue-400 hover:text-blue-300">查看全部</button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => <div key={it.id || i} className="p-3 bg-slate-700/50 rounded-lg">{render(it)}</div>)}
        {items.length === 0 && <div className="text-center text-slate-500 py-6">暂无数据</div>}
      </div>
    </div>
  );
}
