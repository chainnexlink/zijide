import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, sevColor, SearchBar, FilterBtn, Btn, Modal, DetailRow } from '../App';

export default function AlertCenterPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [simTrials, setSimTrials] = useState<any[]>([]);
  const [simAlerts, setSimAlerts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadData(); }, [sub]);

  const loadData = async () => {
    if (sub === 'list' || sub === 'ai') {
      const q = supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(200);
      if (sub === 'ai') q.eq('source', 'ai');
      const { data } = await q;
      setAlerts(data || []);
    } else if (sub === 'simulation') {
      const { data: trials } = await supabase.from('simulation_trials').select('*').order('created_at', { ascending: false }).limit(100);
      setSimTrials(trials || []);
      const { data: sa } = await supabase.from('simulation_alerts').select('*').order('created_at', { ascending: false }).limit(100);
      setSimAlerts(sa || []);
    }
  };

  const toggleVerify = async (id: string, v: boolean) => {
    await supabase.from('alerts').update({ is_verified: v, verified_at: v ? new Date().toISOString() : null }).eq('id', id);
    showToast(v ? '已验证' : '已取消验证');
    loadData();
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('确定删除此预警?')) return;
    await supabase.from('alerts').delete().eq('id', id);
    showToast('已删除');
    loadData();
  };

  // Level 3: Alert Detail
  if (detail) {
    const d = detail;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回列表
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-4 mb-6">
            <span className={`px-3 py-1 rounded-lg text-sm border ${sevColor(d.severity)}`}>{d.severity}</span>
            <h2 className="text-xl font-bold text-white flex-1">{d.title}</h2>
            <span className={`px-2 py-1 rounded text-xs ${d.is_verified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{d.is_verified ? '已验证' : '未验证'}</span>
          </div>
          {d.description && <p className="text-sm text-slate-300 mb-6 bg-slate-700/50 p-4 rounded-lg">{d.description}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3">预警信息</h3>
              <DetailRow label="ID" value={d.id} />
              <DetailRow label="类型" value={d.alert_type} />
              <DetailRow label="严重程度" value={d.severity} />
              <DetailRow label="来源" value={d.source} />
              <DetailRow label="城市" value={d.city} />
              <DetailRow label="国家" value={d.country} />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">位置与时间</h3>
              <DetailRow label="坐标" value={d.latitude && d.longitude ? `${d.latitude}, ${d.longitude}` : '-'} />
              <DetailRow label="影响半径" value={d.affected_radius_km ? `${d.affected_radius_km} km` : '-'} />
              <DetailRow label="开始时间" value={fmt(d.start_time)} />
              <DetailRow label="结束时间" value={fmt(d.end_time)} />
              <DetailRow label="验证时间" value={fmt(d.verified_at)} />
              <DetailRow label="创建时间" value={fmt(d.created_at)} />
              <DetailRow label="更新时间" value={fmt(d.updated_at)} />
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
            <Btn onClick={() => toggleVerify(d.id, !d.is_verified)} variant={d.is_verified ? 'secondary' : 'success'}>{d.is_verified ? '取消验证' : '验证此预警'}</Btn>
            <Btn onClick={() => { deleteAlert(d.id); setDetail(null); }} variant="danger">删除</Btn>
          </div>
        </div>
      </div>
    );
  }

  if (sub === 'cityAlert') {
    return <CityAlertSubPage />;
  }

  if (sub === 'simulation') {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-4">模拟预警管理</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">模拟试用 ({simTrials.length})</h3>
            {simTrials.map(t => (
              <div key={t.id} className="p-3 bg-slate-700/50 rounded-lg mb-2 flex justify-between items-center">
                <div>
                  <div className="text-sm text-white">用户: {t.user_id.slice(0,12)}</div>
                  <div className="text-xs text-slate-400">预警数: {t.alert_count||0} | {t.is_active ? '进行中' : '已结束'} | 到期: {fmt(t.expires_at)}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${t.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{t.is_active ? '活跃' : '过期'}</span>
              </div>
            ))}
            {simTrials.length === 0 && <div className="text-slate-500 text-center py-6">暂无数据</div>}
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">模拟预警记录 ({simAlerts.length})</h3>
            {simAlerts.map(a => (
              <div key={a.id} className="p-3 bg-slate-700/50 rounded-lg mb-2 flex justify-between items-center">
                <div>
                  <div className="text-sm text-white">{a.title}</div>
                  <div className="text-xs text-slate-400">{a.alert_type} | {a.severity} | {a.city || '-'} | {fmt(a.created_at)}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs border ${sevColor(a.severity)}`}>{a.severity}</span>
              </div>
            ))}
            {simAlerts.length === 0 && <div className="text-slate-500 text-center py-6">暂无数据</div>}
          </div>
        </div>
      </div>
    );
  }

  if (sub === 'alertSettings') {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-4">预警全局设置</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-3">预警类型</h3>
            {[{t:'air_strike',l:'空袭'},{t:'artillery',l:'炮击'},{t:'conflict',l:'武装冲突'},{t:'curfew',l:'宵禁'},{t:'chemical',l:'化学威胁'},{t:'earthquake',l:'地震'},{t:'flood',l:'洪水'}].map(i=>(
              <div key={i.t} className="flex items-center justify-between py-2.5 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{i.l} ({i.t})</span>
                <span className="text-xs text-green-400">启用</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-3">严重等级</h3>
            {[{s:'red',l:'红色 - 最高危',c:'text-red-400'},{s:'orange',l:'橙色 - 高危',c:'text-orange-400'},{s:'yellow',l:'黄色 - 中危',c:'text-yellow-400'},{s:'blue',l:'蓝色 - 低危',c:'text-blue-400'}].map(i=>(
              <div key={i.s} className="flex items-center justify-between py-2.5 border-b border-slate-700/50">
                <span className={`text-sm ${i.c}`}>{i.l}</span>
                <span className="text-xs text-green-400">启用</span>
              </div>
            ))}
            <h3 className="font-semibold text-white mb-3 mt-6">数据源</h3>
            {['RSS/新闻源','API/政府公告','Webhook/卫星数据','AI/社交媒体分析','人工上报'].map(s=>(
              <div key={s} className="flex items-center justify-between py-2.5 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{s}</span>
                <span className="text-xs text-green-400">已接入</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default: alert list / AI alerts
  const filtered = alerts.filter(a => {
    if (search && !JSON.stringify(a).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'verified') return a.is_verified;
    if (filter === 'unverified') return !a.is_verified;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{sub === 'ai' ? 'AI预警管理' : '预警列表'} ({filtered.length})</h2>
        <div className="flex gap-3">
          <Btn onClick={() => setShowCreate(true)}>+ 新建预警</Btn>
          <Btn variant="secondary" onClick={loadData}>刷新</Btn>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="搜索预警..." />
        <FilterBtn active={filter==='all'} onClick={() => setFilter('all')}>全部</FilterBtn>
        <FilterBtn active={filter==='verified'} onClick={() => setFilter('verified')}>已验证</FilterBtn>
        <FilterBtn active={filter==='unverified'} onClick={() => setFilter('unverified')}>未验证</FilterBtn>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">标题</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">类型</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">严重</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">城市</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">来源</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">状态</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">时间</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
        </tr></thead><tbody>
          {filtered.map(a => (
            <tr key={a.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4 text-sm font-medium text-white max-w-[180px] truncate">{a.title}</td>
              <td className="p-4 text-sm text-slate-300">{a.alert_type}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs border ${sevColor(a.severity)}`}>{a.severity}</span></td>
              <td className="p-4 text-sm text-slate-300">{a.city || '-'}</td>
              <td className="p-4 text-sm text-slate-400">{a.source || '-'}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${a.is_verified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{a.is_verified ? '已验证' : '未验证'}</span></td>
              <td className="p-4 text-sm text-slate-400">{fmt(a.created_at)}</td>
              <td className="p-4"><div className="flex gap-2">
                <button onClick={() => setDetail(a)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <button onClick={() => toggleVerify(a.id, !a.is_verified)} className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 rounded text-blue-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></button>
                <button onClick={() => deleteAlert(a.id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded text-red-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
        {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无预警数据</div>}
      </div>

      {showCreate && <CreateAlertModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); loadData(); }} />}
    </div>
  );
}

// ==================== 同城预警管理子页面 ====================
function CityAlertSubPage() {
  const { supabase, showToast } = useAdmin();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('summaries' as string);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [detailTriggers, setDetailTriggers] = useState<any[]>([]);
  const [showRewardModal, setShowRewardModal] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const { data: s } = await supabase.from('city_alert_summaries').select('*').order('created_at', { ascending: false }).limit(200);
    setSummaries(s || []);
    const { data: t } = await supabase.from('city_alert_triggers').select('*').order('trigger_time', { ascending: true }).limit(500);
    setTriggers(t || []);
    const { data: r } = await supabase.from('city_alert_reward_rules').select('*').order('rank_from', { ascending: true });
    setRules(r || []);
  };

  const loadDetail = async (summary: any) => {
    setSelectedSummary(summary);
    const { data } = await supabase.from('city_alert_triggers').select('*').eq('alert_id', summary.alert_id).order('trigger_rank', { ascending: true });
    setDetailTriggers(data || []);
    setView('detail');
  };

  const grantRewards = async (alertId: string) => {
    const { data: trigs } = await supabase.from('city_alert_triggers').select('*').eq('alert_id', alertId).lte('trigger_rank', 10).eq('reward_granted', false).order('trigger_rank', { ascending: true });
    if (!trigs || trigs.length === 0) { showToast('无需发放奖励或已全部发放'); return; }
    let granted = 0;
    for (const trig of trigs) {
      const rule = rules.find(r => trig.trigger_rank >= r.rank_from && trig.trigger_rank <= r.rank_to && r.is_active);
      const pts = rule ? rule.reward_points : 50;
      await supabase.from('city_alert_triggers').update({ reward_points: pts, reward_granted: true, reward_granted_at: new Date().toISOString() }).eq('id', trig.id);
      const { data: existing } = await supabase.from('user_points').select('*').eq('user_id', trig.user_id).single();
      if (existing) {
        await supabase.from('user_points').update({ balance: (existing.balance || 0) + pts, total_earned: (existing.total_earned || 0) + pts }).eq('user_id', trig.user_id);
      } else {
        await supabase.from('user_points').insert({ user_id: trig.user_id, balance: pts, total_earned: pts, total_spent: 0 });
      }
      await supabase.from('point_transactions').insert({ user_id: trig.user_id, amount: pts, type: 'earn_alert', reason: `同城预警第${trig.trigger_rank}名触发奖励` });
      granted++;
    }
    await supabase.from('city_alert_summaries').update({ rewarded_count: granted, total_reward_points: trigs.reduce((s: number, t: any) => { const r = rules.find((ru: any) => t.trigger_rank >= ru.rank_from && t.trigger_rank <= ru.rank_to && ru.is_active); return s + (r ? r.reward_points : 50); }, 0), updated_at: new Date().toISOString() }).eq('alert_id', alertId);
    showToast(`已为 ${granted} 名用户发放积分奖励`);
    loadAll();
    if (selectedSummary) loadDetail(selectedSummary);
  };

  const toggleRule = async (id: string, active: boolean) => {
    await supabase.from('city_alert_reward_rules').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
    showToast(active ? '规则已启用' : '规则已禁用');
    loadAll();
  };

  // 同城预警详情页
  if (view === 'detail' && selectedSummary) {
    const s = selectedSummary;
    const top10 = detailTriggers.filter(t => t.trigger_rank <= 10);
    return (
      <div>
        <button onClick={() => { setView('summaries'); setSelectedSummary(null); }} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回同城预警列表
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{s.city} - 同城预警详情</h2>
              <p className="text-sm text-slate-400">预警ID: {s.alert_id?.slice(0, 12)}... | {s.country || '-'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg text-sm ${s.is_real_alert ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                {s.is_real_alert ? '真实预警' : '模拟预警'}
              </span>
              {s.is_real_alert && <Btn variant="success" onClick={() => grantRewards(s.alert_id)}>发放积分奖励</Btn>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4"><div className="text-xs text-slate-400 mb-1">总触发次数</div><div className="text-2xl font-bold text-white">{s.total_triggers || detailTriggers.length}</div></div>
            <div className="bg-slate-700/50 rounded-lg p-4"><div className="text-xs text-slate-400 mb-1">已奖励人数</div><div className="text-2xl font-bold text-green-400">{s.rewarded_count || 0}</div></div>
            <div className="bg-slate-700/50 rounded-lg p-4"><div className="text-xs text-slate-400 mb-1">总发放积分</div><div className="text-2xl font-bold text-amber-400">{s.total_reward_points || 0}</div></div>
            <div className="bg-slate-700/50 rounded-lg p-4"><div className="text-xs text-slate-400 mb-1">首次触发</div><div className="text-sm font-medium text-white mt-1">{fmt(s.first_trigger_at)}</div></div>
          </div>
        </div>

        {/* 前10名奖励排行 */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            前10名触发排行 (积分奖励)
          </h3>
          <div className="overflow-hidden rounded-lg border border-slate-700">
            <table className="w-full"><thead><tr className="border-b border-slate-700 bg-slate-700/30">
              <th className="text-left p-3 text-xs font-medium text-slate-400">排名</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">用户ID</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">触发时间</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">位置</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">奖励积分</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">状态</th>
            </tr></thead><tbody>
              {top10.map(t => {
                const medalColors: Record<number, string> = { 1: 'text-amber-400', 2: 'text-slate-300', 3: 'text-orange-500' };
                return (
                  <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-3">
                      <span className={`text-lg font-bold ${medalColors[t.trigger_rank] || 'text-slate-400'}`}>
                        {t.trigger_rank <= 3 ? ['', '#1', '#2', '#3'][t.trigger_rank] : `#${t.trigger_rank}`}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-white font-mono">{t.user_id?.slice(0, 12)}...</td>
                    <td className="p-3 text-sm text-slate-300">{fmt(t.trigger_time)}</td>
                    <td className="p-3 text-sm text-slate-400">{t.latitude && t.longitude ? `${Number(t.latitude).toFixed(4)}, ${Number(t.longitude).toFixed(4)}` : '-'}</td>
                    <td className="p-3"><span className="text-amber-400 font-semibold">{t.reward_points || '-'}</span></td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${t.reward_granted ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {t.reward_granted ? '已发放' : '待发放'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody></table>
            {top10.length === 0 && <div className="text-center text-slate-500 py-8">暂无触发记录</div>}
          </div>
        </div>

        {/* 全部触发记录 */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="font-semibold text-white mb-4">全部触发记录 ({detailTriggers.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {detailTriggers.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${t.trigger_rank <= 10 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600 text-slate-400'}`}>
                    {t.trigger_rank}
                  </span>
                  <div>
                    <div className="text-sm text-white font-mono">{t.user_id?.slice(0, 16)}...</div>
                    <div className="text-xs text-slate-400">{fmt(t.trigger_time)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {t.trigger_rank <= 10 && <span className="text-amber-400 text-sm font-medium">+{t.reward_points || '?'} 积分</span>}
                  <span className={`px-2 py-1 rounded text-xs ${t.reward_granted ? 'bg-green-500/20 text-green-400' : t.trigger_rank <= 10 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-600 text-slate-500'}`}>
                    {t.reward_granted ? '已奖励' : t.trigger_rank <= 10 ? '待奖励' : '无奖励'}
                  </span>
                </div>
              </div>
            ))}
            {detailTriggers.length === 0 && <div className="text-center text-slate-500 py-8">暂无触发记录</div>}
          </div>
        </div>
      </div>
    );
  }

  // 奖励规则管理视图
  if (view === 'rules') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">同城预警积分奖励规则</h2>
          <div className="flex gap-3">
            <FilterBtn active={false} onClick={() => setView('summaries')}>预警列表</FilterBtn>
            <FilterBtn active={false} onClick={() => setView('triggers')}>触发记录</FilterBtn>
            <FilterBtn active={true} onClick={() => setView('rules')}>奖励规则</FilterBtn>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">规则说明</h4>
            <p className="text-xs text-slate-400">在真实预警情况下，同城前10个触发同城预警的平台（用户）将依据以下规则获得积分奖励。排名越靠前，奖励积分越高。</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-700">
            <table className="w-full"><thead><tr className="border-b border-slate-700 bg-slate-700/30">
              <th className="text-left p-4 text-xs font-medium text-slate-400">排名范围</th>
              <th className="text-left p-4 text-xs font-medium text-slate-400">奖励积分</th>
              <th className="text-left p-4 text-xs font-medium text-slate-400">说明</th>
              <th className="text-left p-4 text-xs font-medium text-slate-400">状态</th>
              <th className="text-left p-4 text-xs font-medium text-slate-400">操作</th>
            </tr></thead><tbody>
              {rules.map(r => (
                <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-4 text-sm text-white font-semibold">第 {r.rank_from} - {r.rank_to} 名</td>
                  <td className="p-4"><span className="text-amber-400 font-bold text-lg">{r.reward_points}</span><span className="text-slate-400 text-xs ml-1">积分</span></td>
                  <td className="p-4 text-sm text-slate-300">{r.description || '-'}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${r.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{r.is_active ? '启用' : '禁用'}</span></td>
                  <td className="p-4">
                    <button onClick={() => toggleRule(r.id, !r.is_active)} className={`px-3 py-1.5 rounded text-xs ${r.is_active ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-green-600/20 hover:bg-green-600/40 text-green-400'}`}>
                      {r.is_active ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody></table>
            {rules.length === 0 && <div className="text-center text-slate-500 py-8">暂无奖励规则</div>}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="font-semibold text-white mb-4">积分奖励概览</h3>
          <div className="grid grid-cols-3 gap-4">
            {rules.filter(r => r.is_active).map(r => (
              <div key={r.id} className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-400 mb-1">第 {r.rank_from}{r.rank_from === r.rank_to ? '' : ` - ${r.rank_to}`} 名</div>
                <div className="text-3xl font-bold text-amber-400">{r.reward_points}</div>
                <div className="text-xs text-slate-500 mt-1">积分</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 触发记录视图
  if (view === 'triggers') {
    const filteredTriggers = triggers.filter(t => !search || JSON.stringify(t).toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">同城预警触发记录 ({filteredTriggers.length})</h2>
          <div className="flex gap-3">
            <FilterBtn active={false} onClick={() => setView('summaries')}>预警列表</FilterBtn>
            <FilterBtn active={true} onClick={() => setView('triggers')}>触发记录</FilterBtn>
            <FilterBtn active={false} onClick={() => setView('rules')}>奖励规则</FilterBtn>
          </div>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索触发记录..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400">排名</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400">用户</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400">城市</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400">触发时间</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400">积分</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400">奖励状态</th>
          </tr></thead><tbody>
            {filteredTriggers.map(t => (
              <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4"><span className={`font-bold ${t.trigger_rank <= 3 ? 'text-amber-400' : t.trigger_rank <= 10 ? 'text-blue-400' : 'text-slate-500'}`}>#{t.trigger_rank}</span></td>
                <td className="p-4 text-sm text-white font-mono">{t.user_id?.slice(0, 12)}</td>
                <td className="p-4 text-sm text-slate-300">{t.city}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(t.trigger_time)}</td>
                <td className="p-4 text-sm text-amber-400 font-medium">{t.reward_points || '-'}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${t.reward_granted ? 'bg-green-500/20 text-green-400' : t.trigger_rank <= 10 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-600 text-slate-500'}`}>{t.reward_granted ? '已发放' : t.trigger_rank <= 10 ? '待发放' : '-'}</span></td>
              </tr>
            ))}
          </tbody></table>
          {filteredTriggers.length === 0 && <div className="text-center text-slate-500 py-12">暂无触发记录</div>}
        </div>
      </div>
    );
  }

  // 默认：同城预警汇总列表
  const filteredSummaries = summaries.filter(s => !search || JSON.stringify(s).toLowerCase().includes(search.toLowerCase()));
  const totalTriggers = summaries.reduce((sum, s) => sum + (s.total_triggers || 0), 0);
  const totalRewarded = summaries.reduce((sum, s) => sum + (s.rewarded_count || 0), 0);
  const totalPoints = summaries.reduce((sum, s) => sum + (s.total_reward_points || 0), 0);
  const realAlerts = summaries.filter(s => s.is_real_alert).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">同城预警数据管理</h2>
        <div className="flex gap-3">
          <FilterBtn active={true} onClick={() => setView('summaries')}>预警列表</FilterBtn>
          <FilterBtn active={false} onClick={() => setView('triggers')}>触发记录</FilterBtn>
          <FilterBtn active={false} onClick={() => setView('rules')}>奖励规则</FilterBtn>
          <Btn variant="secondary" onClick={loadAll}>刷新</Btn>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-500/20">
          <span className="text-blue-300/70 text-xs">同城预警总数</span>
          <div className="text-2xl font-bold text-white mt-1">{summaries.length}</div>
        </div>
        <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-4 border border-red-500/20">
          <span className="text-red-300/70 text-xs">真实预警</span>
          <div className="text-2xl font-bold text-white mt-1">{realAlerts}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 rounded-xl p-4 border border-amber-500/20">
          <span className="text-amber-300/70 text-xs">累计发放积分</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{totalPoints.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/20">
          <span className="text-green-300/70 text-xs">累计奖励人次</span>
          <div className="text-2xl font-bold text-green-400 mt-1">{totalRewarded}</div>
        </div>
      </div>

      <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索城市/预警..." /></div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">城市</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">国家</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">类型</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">触发数</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">已奖励</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">总积分</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">时间</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
        </tr></thead><tbody>
          {filteredSummaries.map(s => (
            <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4 text-sm font-medium text-white">{s.city}</td>
              <td className="p-4 text-sm text-slate-300">{s.country || '-'}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${s.is_real_alert ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{s.is_real_alert ? '真实' : '模拟'}</span></td>
              <td className="p-4 text-sm text-white font-medium">{s.total_triggers || 0}</td>
              <td className="p-4 text-sm text-green-400">{s.rewarded_count || 0} 人</td>
              <td className="p-4 text-sm text-amber-400 font-medium">{s.total_reward_points || 0}</td>
              <td className="p-4 text-sm text-slate-400">{fmt(s.created_at)}</td>
              <td className="p-4"><div className="flex gap-2">
                <button onClick={() => loadDetail(s)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300" title="查看详情">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                {s.is_real_alert && <button onClick={() => grantRewards(s.alert_id)} className="p-1.5 bg-amber-600/20 hover:bg-amber-600/40 rounded text-amber-400" title="发放奖励">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>}
              </div></td>
            </tr>
          ))}
        </tbody></table>
        {filteredSummaries.length === 0 && <div className="text-center text-slate-500 py-12">暂无同城预警数据</div>}
      </div>
    </div>
  );
}

function CreateAlertModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { supabase, showToast } = useAdmin();
  const [form, setForm] = useState({ title: '', description: '', alert_type: 'air_strike', severity: 'red', city: '', country: '', source: 'admin', latitude: '', longitude: '', affected_radius_km: '' });

  const submit = async () => {
    const { error } = await supabase.from('alerts').insert({
      ...form, latitude: form.latitude ? parseFloat(form.latitude) : null, longitude: form.longitude ? parseFloat(form.longitude) : null,
      affected_radius_km: form.affected_radius_km ? parseFloat(form.affected_radius_km) : null, is_verified: true, start_time: new Date().toISOString(),
    });
    if (!error) { showToast('预警已创建'); onSave(); } else showToast('失败: ' + error.message);
  };

  return (
    <Modal title="新建预警" onClose={onClose}>
      <div className="space-y-4">
        <div><label className="block text-sm text-slate-400 mb-1">标题 *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        <div><label className="block text-sm text-slate-400 mb-1">描述</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 h-20" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">类型</label><select value={form.alert_type} onChange={e => setForm({...form, alert_type: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"><option value="air_strike">空袭</option><option value="artillery">炮击</option><option value="conflict">冲突</option><option value="curfew">宵禁</option><option value="chemical">化学</option><option value="earthquake">地震</option><option value="flood">洪水</option></select></div>
          <div><label className="block text-sm text-slate-400 mb-1">严重程度</label><select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"><option value="red">红色</option><option value="orange">橙色</option><option value="yellow">黄色</option><option value="blue">蓝色</option></select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">城市</label><input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">国家</label><input value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">纬度</label><input type="number" step="any" value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">经度</label><input type="number" step="any" value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">半径(km)</label><input type="number" step="any" value={form.affected_radius_km} onChange={e => setForm({...form, affected_radius_km: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        </div>
        <Btn onClick={submit} disabled={!form.title} className="w-full justify-center">创建预警</Btn>
      </div>
    </Modal>
  );
}
