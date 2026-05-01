import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, stBadge, SearchBar, FilterBtn, Btn, DetailRow } from '../App';

export default function SOSRescuePage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [records, setRecords] = useState<any[]>([]);
  const [rescue, setRescue] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => { loadData(); }, [sub]);

  const loadData = async () => {
    if (sub === 'records') { const { data } = await supabase.from('sos_records').select('*').order('created_at', { ascending: false }).limit(200); setRecords(data || []); }
    else if (sub === 'rescue') { const { data } = await supabase.from('rescue_pending').select('*').order('created_at', { ascending: false }).limit(200); setRescue(data || []); }
    else if (sub === 'responses') { const { data } = await supabase.from('mutual_aid_responses').select('*').order('created_at', { ascending: false }).limit(200); setResponses(data || []); }
  };

  const resolveSOS = async (id: string) => {
    await supabase.from('sos_records').update({ status: 'rescued', confirmed_at: new Date().toISOString() }).eq('id', id);
    showToast('已标记解救'); loadData();
  };

  const approveRescue = async (id: string) => {
    await supabase.from('rescue_pending').update({ status: 'approved', admin_processed_at: new Date().toISOString() }).eq('id', id);
    showToast('已批准'); loadData();
  };

  const dismissRescue = async (id: string) => {
    const notes = prompt('驳回原因 (可选):');
    await supabase.from('rescue_pending').update({ status: 'dismissed', admin_processed_at: new Date().toISOString(), admin_notes: notes || undefined }).eq('id', id);
    showToast('已驳回'); loadData();
  };

  // Level 3: Detail
  if (detail) {
    const d = detail;
    const isRescue = sub === 'rescue';
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回列表
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">{isRescue ? '救援详情' : sub === 'responses' ? '互助响应详情' : 'SOS详情'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <DetailRow label="ID" value={d.id} />
              {isRescue ? <>
                <DetailRow label="SOS ID" value={d.sos_id} />
                <DetailRow label="用户ID" value={d.user_id} />
                <DetailRow label="用户手机" value={d.user_phone} />
                <DetailRow label="用户邮箱" value={d.user_email} />
                <DetailRow label="状态" value={d.status} />
                <DetailRow label="优先级" value={`P${d.priority || 0}`} />
                <DetailRow label="地址" value={d.address} />
              </> : sub === 'responses' ? <>
                <DetailRow label="SOS ID" value={d.sos_id} />
                <DetailRow label="响应者ID" value={d.responder_id} />
                <DetailRow label="状态" value={d.status} />
                <DetailRow label="奖励" value={d.reward_amount ? `¥${d.reward_amount}` : '-'} />
                <DetailRow label="备注" value={d.notes} />
              </> : <>
                <DetailRow label="用户ID" value={d.user_id} />
                <DetailRow label="状态" value={d.status} />
                <DetailRow label="触发方式" value={d.trigger_method} />
                <DetailRow label="阶段" value={d.stage} />
                <DetailRow label="警报类型" value={d.alert_type} />
                <DetailRow label="地址" value={d.address} />
              </>}
            </div>
            <div>
              {isRescue ? <>
                <DetailRow label="坐标" value={d.latitude && d.longitude ? `${d.latitude}, ${d.longitude}` : '-'} />
                <DetailRow label="最近避难所" value={d.nearest_shelter_name} />
                <DetailRow label="距离" value={d.nearest_shelter_distance ? `${d.nearest_shelter_distance}km` : '-'} />
                <DetailRow label="救援组织" value={d.rescue_org_name} />
                <DetailRow label="救援电话" value={d.rescue_org_phone} />
                <DetailRow label="管理员备注" value={d.admin_notes} />
                <DetailRow label="通知时间" value={fmt(d.admin_notified_at)} />
                <DetailRow label="处理时间" value={fmt(d.admin_processed_at)} />
              </> : sub === 'responses' ? <>
                <DetailRow label="响应时间" value={fmt(d.responded_at)} />
                <DetailRow label="到达时间" value={fmt(d.arrived_at)} />
                <DetailRow label="验证时间" value={fmt(d.verified_at)} />
              </> : <>
                <DetailRow label="城市" value={d.city} />
                <DetailRow label="坐标" value={d.latitude && d.longitude ? `${d.latitude}, ${d.longitude}` : '-'} />
                <DetailRow label="备注" value={d.notes} />
                <DetailRow label="救援触发" value={fmt(d.rescue_triggered_at)} />
                <DetailRow label="确认时间" value={fmt(d.confirmed_at)} />
              </>}
              <DetailRow label="创建时间" value={fmt(d.created_at)} />
              <DetailRow label="更新时间" value={fmt(d.updated_at)} />
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
            {!isRescue && d.status === 'active' && <Btn variant="success" onClick={() => { resolveSOS(d.id); setDetail(null); }}>标记解救</Btn>}
            {isRescue && d.status === 'pending' && <>
              <Btn variant="success" onClick={() => { approveRescue(d.id); setDetail(null); }}>批准救援</Btn>
              <Btn variant="danger" onClick={() => { dismissRescue(d.id); setDetail(null); }}>驳回</Btn>
            </>}
          </div>
        </div>
      </div>
    );
  }

  const items = sub === 'rescue' ? rescue : sub === 'responses' ? responses : records;
  const filtered = items.filter(i => {
    if (search && !JSON.stringify(i).toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all') return i.status === filter;
    return true;
  });

  const filterOpts = sub === 'rescue' ? ['all','pending','approved','dismissed'] : sub === 'responses' ? ['all','accepted','arrived','completed'] : ['all','active','rescued','cancelled'];
  const filterLabels: Record<string, string> = { all:'全部', pending:'待审批', approved:'已批准', dismissed:'已驳回', active:'活跃', rescued:'已解救', cancelled:'已取消', accepted:'已接受', arrived:'已到达', completed:'已完成' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{sub === 'rescue' ? '救援审批' : sub === 'responses' ? '互助响应' : 'SOS记录'} ({filtered.length})</h2>
        <Btn variant="secondary" onClick={loadData}>刷新</Btn>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="搜索..." />
        {filterOpts.map(f => <FilterBtn key={f} active={filter===f} onClick={() => setFilter(f)}>{filterLabels[f]}</FilterBtn>)}
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ID</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">{sub === 'responses' ? '响应者' : '用户'}</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">{sub === 'rescue' ? '地址' : sub === 'responses' ? 'SOS ID' : '触发方式'}</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">{sub === 'rescue' ? '优先级' : sub === 'responses' ? '奖励' : '阶段'}</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">状态</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">时间</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
        </tr></thead><tbody>
          {filtered.map(item => (
            <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4 text-sm text-white font-mono">{item.id.slice(0,8)}</td>
              <td className="p-4 text-sm text-slate-300 font-mono">{(sub === 'responses' ? item.responder_id : item.user_id || item.user_phone)?.slice(0,12)}</td>
              <td className="p-4 text-sm text-slate-300 max-w-[150px] truncate">{sub === 'rescue' ? (item.address || '-') : sub === 'responses' ? item.sos_id?.slice(0,8) : item.trigger_method}</td>
              <td className="p-4 text-sm">{sub === 'rescue' ? <span className={`px-2 py-1 rounded text-xs ${(item.priority||0)>=8?'bg-red-500/20 text-red-400':(item.priority||0)>=5?'bg-orange-500/20 text-orange-400':'bg-blue-500/20 text-blue-400'}`}>P{item.priority||0}</span> : sub === 'responses' ? (item.reward_amount ? `¥${item.reward_amount}` : '-') : (item.stage||1)}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${stBadge(item.status)}`}>{item.status}</span></td>
              <td className="p-4 text-sm text-slate-400">{fmt(item.created_at)}</td>
              <td className="p-4"><div className="flex gap-2">
                <button onClick={() => setDetail(item)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                {sub === 'records' && item.status === 'active' && <button onClick={() => resolveSOS(item.id)} className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs text-white">解救</button>}
                {sub === 'rescue' && item.status === 'pending' && <>
                  <button onClick={() => approveRescue(item.id)} className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs text-white">批准</button>
                  <button onClick={() => dismissRescue(item.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white">驳回</button>
                </>}
              </div></td>
            </tr>
          ))}
        </tbody></table>
        {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
      </div>
    </div>
  );
}
