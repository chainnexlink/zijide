import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin, fmt, SearchBar, Btn, DetailRow } from '../App';

export default function MutualAidPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [sos, setSos] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    const [s, r, e, p] = await Promise.all([
      supabase.from('mutual_aid_subscriptions').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('mutual_aid_responses').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('sos_records').select('id,user_id,status,stage,address,created_at,confirmed_at').order('created_at', { ascending: false }).limit(300),
      supabase.from('point_transactions').select('*').eq('type', 'earn_mutual_aid').order('created_at', { ascending: false }).limit(300),
    ]);
    setSubscriptions(s.data || []); setResponses(r.data || []); setSos(e.data || []); setPoints(p.data || []);
  };
  useEffect(() => { void load(); }, [sub]);

  const rows = useMemo(() => {
    const source = sub === 'subscriptions' ? subscriptions : sub === 'responses' ? responses : sub === 'rewards' ? points : sos;
    return source.filter((item: any) => !search || JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));
  }, [sub, subscriptions, responses, points, sos, search]);

  if (detail) return <div><button className="text-blue-400 mb-4" onClick={() => setDetail(null)}>← 返回</button><div className="bg-slate-800 rounded-xl border border-slate-700 p-6"><h2 className="text-xl font-bold text-white mb-5">互助记录详情</h2>{Object.entries(detail).filter(([k]) => !k.startsWith('_')).map(([k,v]) => <DetailRow key={k} label={k} value={typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-')} />)}</div></div>;

  if (sub === 'analytics') {
    const completed = responses.filter(x => x.status === 'completed').length;
    const arrived = responses.filter(x => x.status === 'arrived').length;
    const cancelled = responses.filter(x => x.status === 'cancelled').length;
    const awarded = points.reduce((n, x) => n + Number(x.amount || 0), 0);
    return <div><h2 className="text-xl font-bold text-white mb-6">互助数据分析</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[['活跃互助者',subscriptions.filter(x=>x.is_active).length],['已到场待确认',arrived],['完成救援',completed],['取消响应',cancelled],['已结算积分',awarded],['SOS总数',sos.length],['活跃SOS',sos.filter(x=>x.status==='active').length],['完成率',responses.length ? `${Math.round(completed/responses.length*100)}%` : '0%']].map(([label,value])=><div key={String(label)} className="bg-slate-800 border border-slate-700 rounded-xl p-5"><div className="text-slate-400 text-sm">{label}</div><div className="text-2xl text-white font-bold mt-2">{value}</div></div>)}</div></div>;
  }

  const title = sub === 'subscriptions' ? '互助订阅' : sub === 'responses' ? '响应记录' : sub === 'rewards' ? '奖励流水' : '关联SOS事件';
  return <div><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-white">{title} ({rows.length})</h2><Btn variant="secondary" onClick={load}>刷新</Btn></div><div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索记录..." /></div><div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-700">{['ID','用户/响应者','状态/类型','积分/阶段','时间','操作'].map(h=><th key={h} className="text-left p-4 text-xs text-slate-400">{h}</th>)}</tr></thead><tbody>{rows.map((r:any)=><tr key={r.id} className="border-b border-slate-700/50"><td className="p-4 text-xs text-white font-mono">{String(r.id).slice(0,12)}</td><td className="p-4 text-xs text-slate-300 font-mono">{String(r.user_id || r.responder_id || '-').slice(0,12)}</td><td className="p-4 text-sm text-slate-300">{r.status ?? r.type ?? (r.is_active ? 'active' : 'inactive')}</td><td className="p-4 text-sm text-white">{r.amount ?? r.total_rewards ?? r.stage ?? '-'}</td><td className="p-4 text-sm text-slate-400">{fmt(r.created_at || r.responded_at)}</td><td className="p-4"><button className="text-blue-400 text-sm" onClick={()=>setDetail(r)}>查看</button></td></tr>)}</tbody></table>{rows.length===0&&<div className="text-center text-slate-500 py-12">暂无数据</div>}</div></div>;
}
