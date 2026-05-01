import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, SearchBar, Btn, DetailRow } from '../App';

export default function FamilyMgmtPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [groups, setGroups] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => { load(); }, [sub]);

  const load = async () => {
    const { data: g } = await supabase.from('family_groups').select('*').order('created_at', { ascending: false }).limit(200);
    setGroups(g || []);
    const { data: m } = await supabase.from('family_members').select('*').order('created_at', { ascending: false }).limit(500);
    setMembers(m || []);
  };

  const delGroup = async (id: string) => {
    if (!confirm('删除家庭组将移除所有成员，确定?')) return;
    await supabase.from('family_members').delete().eq('family_id', id);
    await supabase.from('family_groups').delete().eq('id', id);
    showToast('已删除'); load();
  };

  if (detail) {
    const d = detail;
    const groupMembers = members.filter(m => m.family_id === d.id);
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">{d.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3">家庭组信息</h3>
              <DetailRow label="ID" value={d.id} />
              <DetailRow label="名称" value={d.name} />
              <DetailRow label="管理员ID" value={d.admin_id} />
              <DetailRow label="邀请码" value={d.invite_code} />
              <DetailRow label="最大成员" value={d.max_members} />
              <DetailRow label="位置共享" value={d.location_sharing_enabled ? '开启' : '关闭'} />
              <DetailRow label="预警同步" value={d.alert_sync_enabled ? '开启' : '关闭'} />
              <DetailRow label="SOS同步" value={d.sos_sync_enabled ? '开启' : '关闭'} />
              <DetailRow label="集合点" value={d.evacuation_meeting_point} />
              <DetailRow label="创建时间" value={fmt(d.created_at)} />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">成员列表 ({groupMembers.length})</h3>
              {groupMembers.map(m => (
                <div key={m.id} className="p-3 bg-slate-700/50 rounded-lg mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white font-mono">{m.user_id.slice(0, 12)}</div>
                    <div className="text-xs text-slate-400">角色: {m.role} | 加入: {fmt(m.joined_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${m.is_online ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-xs text-slate-400">{m.is_online ? '在线' : '离线'}</span>
                  </div>
                </div>
              ))}
              {groupMembers.length === 0 && <div className="text-slate-500 text-center py-6">暂无成员</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sub === 'members') {
    const filtered = members.filter(m => !search || JSON.stringify(m).toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">成员管理 ({members.length})</h2>
          <Btn variant="secondary" onClick={load}>刷新</Btn>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索成员..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">成员ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">用户ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">家庭组ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">角色</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">在线</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">加入时间</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">最后活跃</th>
          </tr></thead><tbody>
            {filtered.map(m => (
              <tr key={m.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4 text-sm text-white font-mono">{m.id.slice(0,8)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{m.user_id.slice(0,12)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{m.family_id.slice(0,12)}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${m.role==='admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>{m.role}</span></td>
                <td className="p-4"><div className={`w-2.5 h-2.5 rounded-full ${m.is_online ? 'bg-green-500' : 'bg-gray-500'}`} /></td>
                <td className="p-4 text-sm text-slate-400">{fmt(m.joined_at)}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(m.last_seen_at)}</td>
              </tr>
            ))}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
        </div>
      </div>
    );
  }

  // Default: groups
  const filtered = groups.filter(g => !search || JSON.stringify(g).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">家庭组列表 ({groups.length})</h2>
        <Btn variant="secondary" onClick={load}>刷新</Btn>
      </div>
      <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索家庭组..." /></div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">名称</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">管理员</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">邀请码</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">成员数</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">功能</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">创建时间</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
        </tr></thead><tbody>
          {filtered.map(g => (
            <tr key={g.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4 text-sm font-medium text-white">{g.name}</td>
              <td className="p-4 text-sm text-slate-300 font-mono">{g.admin_id.slice(0,12)}</td>
              <td className="p-4 text-sm text-slate-300 font-mono">{g.invite_code}</td>
              <td className="p-4 text-sm text-white">{members.filter(m => m.family_id === g.id).length} / {g.max_members||5}</td>
              <td className="p-4 text-xs">
                <div className="flex flex-wrap gap-1">
                  {g.location_sharing_enabled && <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">定位</span>}
                  {g.alert_sync_enabled && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">预警</span>}
                  {g.sos_sync_enabled && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">SOS</span>}
                </div>
              </td>
              <td className="p-4 text-sm text-slate-400">{fmt(g.created_at)}</td>
              <td className="p-4"><div className="flex gap-2">
                <button onClick={() => setDetail(g)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <button onClick={() => delGroup(g.id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded text-red-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
        {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
      </div>
    </div>
  );
}
