import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, stBadge, SearchBar, FilterBtn, Btn, Modal, DetailRow } from '../App';

export default function UserCenterPage({ sub }: { sub: string }) {
  const { supabase, showToast, navigate } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [alertSettings, setAlertSettings] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [sub]);

  const loadData = async () => {
    setLoading(true);
    if (sub === 'list' || sub === 'guests') {
      const q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
      if (sub === 'guests') q.eq('is_guest', true);
      const { data } = await q;
      setUsers(data || []);
    } else if (sub === 'invites') {
      const { data } = await supabase.from('invites').select('*').order('created_at', { ascending: false }).limit(200);
      setInvites(data || []);
    } else if (sub === 'settings') {
      const { data } = await supabase.from('user_alert_settings').select('*').order('created_at', { ascending: false }).limit(200);
      setAlertSettings(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此用户?')) return;
    await supabase.from('profiles').delete().eq('id', id);
    showToast('用户已删除');
    loadData();
  };

  const handleDeleteAllUserData = async (userId: string) => {
    if (!confirm(`确定要删除该用户的所有数据吗？\n\n此操作将删除：\n• 订阅记录\n• 订单记录\n• 互助记录和消息\n• 家庭成员信息\n• SOS记录\n• 积分记录\n• 用户资料\n\n此操作不可撤销！`)) return;
    if (!confirm('再次确认：此操作不可恢复，确定继续？')) return;

    // Table-to-column mapping: some tables use different column names for user reference
    const tableColumns: [string, string][] = [
      ['subscriptions', 'user_id'],
      ['subscription_orders', 'user_id'],
      ['mutual_aid_messages', 'sender_id'],
      ['mutual_aid_event_responses', 'responder_id'],
      ['mutual_aid_events', 'user_id'],
      ['mutual_aid_skills', 'user_id'],
      ['mutual_aid_settings', 'user_id'],
      ['mutual_aid_reviews', 'reviewer_id'],
      ['mutual_aid_subscriptions', 'user_id'],
      ['family_members', 'user_id'],
      ['sos_records', 'user_id'],
      ['simulation_trials', 'user_id'],
      ['user_points', 'user_id'],
      ['point_transactions', 'user_id'],
      ['user_alert_settings', 'user_id'],
      ['invites', 'inviter_id'],
      ['profiles', 'id'],
    ];

    let errors: string[] = [];
    for (const [table, column] of tableColumns) {
      const { error } = await supabase.from(table).delete().eq(column, userId);
      if (error && !error.message.includes('0 rows')) {
        errors.push(`${table}: ${error.message}`);
      }
    }
    // Also delete mutual_aid_reviews where user is the reviewed party
    const { error: reviewErr } = await supabase.from('mutual_aid_reviews').delete().eq('reviewed_id', userId);
    if (reviewErr && !reviewErr.message.includes('0 rows')) {
      errors.push(`mutual_aid_reviews(reviewed_id): ${reviewErr.message}`);
    }

    if (errors.length > 0) {
      showToast(`部分数据删除失败: ${errors.join('; ')}`);
    } else {
      showToast('用户全部数据已删除');
    }
    setDetail(null);
    loadData();
  };

  // Level 3: User Detail
  if (detail) {
    const d = detail;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回列表
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-slate-600 flex items-center justify-center text-xl text-white font-bold">{(d.nickname || d.email || '?')[0].toUpperCase()}</div>
            <div>
              <h2 className="text-xl font-bold text-white">{d.nickname || '未设置昵称'}</h2>
              <div className="text-sm text-slate-400">{d.email || d.phone || 'N/A'}</div>
              <span className={`px-2 py-0.5 rounded text-xs mt-1 inline-block ${d.is_guest ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{d.is_guest ? '游客' : '注册用户'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3">基本信息</h3>
              <DetailRow label="ID" value={d.id} />
              <DetailRow label="昵称" value={d.nickname} />
              <DetailRow label="邮箱" value={d.email} />
              <DetailRow label="手机" value={d.phone} />
              <DetailRow label="性别" value={d.gender} />
              <DetailRow label="出生日期" value={d.birth_date} />
              <DetailRow label="城市" value={d.city} />
              <DetailRow label="国家" value={d.country} />
              <DetailRow label="语言" value={d.language} />
              <DetailRow label="邀请码" value={d.invite_code} />
              <DetailRow label="设备ID" value={d.device_id} />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">医疗/紧急信息</h3>
              <DetailRow label="血型" value={d.blood_type} />
              <DetailRow label="过敏源" value={d.allergies} />
              <DetailRow label="当前用药" value={d.current_medication} />
              <DetailRow label="病史" value={d.medical_history} />
              <DetailRow label="医疗备注" value={d.medical_notes} />
              <DetailRow label="紧急联系人" value={d.emergency_contact_name} />
              <DetailRow label="紧急电话" value={d.emergency_contact_phone} />
              <DetailRow label="紧急关系" value={d.emergency_contact_relation} />
              <h3 className="font-semibold text-white mb-3 mt-6">时间信息</h3>
              <DetailRow label="注册时间" value={fmt(d.created_at)} />
              <DetailRow label="更新时间" value={fmt(d.updated_at)} />
              <DetailRow label="试用到期" value={fmt(d.trial_ends_at)} />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700">
            <h3 className="font-semibold text-white mb-3">数据管理</h3>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteAllUserData(d.id)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm transition-colors flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                删除全部用户数据 (GDPR)
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">此操作将永久删除该用户在所有表中的数据，用于响应用户的数据删除请求（GDPR/Apple要求）。</p>
          </div>
        </div>
      </div>
    );
  }

  const filtered = (sub === 'invites' ? invites : sub === 'settings' ? alertSettings : users).filter(
    i => !search || JSON.stringify(i).toLowerCase().includes(search.toLowerCase())
  );

  if (sub === 'invites') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">邀请管理 ({invites.length})</h2>
          <Btn variant="secondary" onClick={loadData}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15A9 9 0 1 1 21 12"/></svg> 刷新</Btn>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索邀请记录..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">邀请码</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">邀请人ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">被邀请联系</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">状态</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">奖励</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">创建时间</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">注册时间</th>
          </tr></thead><tbody>
            {filtered.map((inv: any) => (
              <tr key={inv.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4 text-sm text-white font-mono">{inv.invite_code}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{inv.inviter_id?.slice(0,12)}</td>
                <td className="p-4 text-sm text-slate-300">{inv.invited_email || inv.invited_phone || '-'}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${stBadge(inv.status||'pending')}`}>{inv.status||'pending'}</span></td>
                <td className="p-4 text-sm">{inv.reward_given ? <span className="text-green-400">¥{inv.reward_amount}</span> : <span className="text-slate-400">未发放</span>}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(inv.created_at)}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(inv.registered_at)}</td>
              </tr>
            ))}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无邀请数据</div>}
        </div>
      </div>
    );
  }

  if (sub === 'settings') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">用户预警设置 ({alertSettings.length})</h2>
          <Btn variant="secondary" onClick={loadData}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15A9 9 0 1 1 21 12"/></svg> 刷新</Btn>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">用户ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">推送</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">声音</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">震动</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">闪光灯</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">监控半径</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">免打扰</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">预警类型</th>
          </tr></thead><tbody>
            {filtered.map((s: any) => (
              <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4 text-sm text-white font-mono">{s.user_id?.slice(0,12)}</td>
                <td className="p-4 text-sm">{s.push_enabled ? <span className="text-green-400">开</span> : <span className="text-slate-500">关</span>}</td>
                <td className="p-4 text-sm">{s.sound_enabled ? <span className="text-green-400">开</span> : <span className="text-slate-500">关</span>}</td>
                <td className="p-4 text-sm">{s.vibration_enabled ? <span className="text-green-400">开</span> : <span className="text-slate-500">关</span>}</td>
                <td className="p-4 text-sm">{s.flash_enabled ? <span className="text-green-400">开</span> : <span className="text-slate-500">关</span>}</td>
                <td className="p-4 text-sm text-slate-300">{s.monitor_radius_km ? `${s.monitor_radius_km}km` : '-'}</td>
                <td className="p-4 text-sm">{s.dnd_enabled ? <span className="text-yellow-400">{s.dnd_start_time}-{s.dnd_end_time}</span> : <span className="text-slate-500">关</span>}</td>
                <td className="p-4 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {s.alert_air_strike && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">空袭</span>}
                    {s.alert_artillery && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">炮击</span>}
                    {s.alert_conflict && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">冲突</span>}
                    {s.alert_curfew && <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">宵禁</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无设置数据</div>}
        </div>
      </div>
    );
  }

  // Default: user list / guest list
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{sub === 'guests' ? '游客管理' : '用户列表'} ({filtered.length})</h2>
        <Btn variant="secondary" onClick={loadData}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15A9 9 0 1 1 21 12"/></svg> 刷新</Btn>
      </div>
      <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索用户 (昵称/邮箱/手机/城市)..." /></div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">用户</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">联系方式</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">城市</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">类型</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">邀请码</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">注册时间</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
        </tr></thead><tbody>
          {filtered.map((u: any) => (
            <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm text-white">{(u.nickname || u.email || '?')[0].toUpperCase()}</div><div><div className="text-sm font-medium text-white">{u.nickname || '未设置'}</div><div className="text-xs text-slate-400">{u.id.slice(0,12)}...</div></div></div></td>
              <td className="p-4 text-sm text-slate-300">{u.phone || u.email || '-'}</td>
              <td className="p-4 text-sm text-slate-300">{u.city || '-'}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${u.is_guest ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{u.is_guest ? '游客' : '注册'}</span></td>
              <td className="p-4 text-sm text-slate-400 font-mono">{u.invite_code || '-'}</td>
              <td className="p-4 text-sm text-slate-400">{fmt(u.created_at)}</td>
              <td className="p-4"><div className="flex gap-2">
                <button onClick={() => setDetail(u)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300" title="详情"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <button onClick={() => handleDelete(u.id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded text-red-400" title="删除"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
        {filtered.length === 0 && <div className="text-center text-slate-500 py-12">没有找到匹配用户</div>}
      </div>
    </div>
  );
}
