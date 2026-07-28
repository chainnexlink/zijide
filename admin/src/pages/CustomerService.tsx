import React, { useEffect, useMemo, useState } from 'react';
import { useAdmin, fmt, SearchBar, Btn } from '../App';

export default function CustomerServicePage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const load = async () => { const { data } = await supabase.from('user_feedback').select('*').order('created_at', { ascending: false }).limit(500); setItems(data || []); };
  useEffect(() => { void load(); }, [sub]);
  const rows = useMemo(() => items.filter(x => !search || JSON.stringify(x).toLowerCase().includes(search.toLowerCase())), [items, search]);
  const saveReply = async () => {
    if (!selected || reply.trim().length < 2) return;
    const { error } = await supabase.rpc('admin_reply_feedback', { p_feedback_id: selected.id, p_reply: reply.trim() });
    if (error) return showToast('回复失败: ' + error.message);
    showToast('已回复并通知用户'); setSelected(null); setReply(''); await load();
  };
  return <div><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-white">用户反馈与客服 ({rows.length})</h2><Btn variant="secondary" onClick={load}>刷新</Btn></div><div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索反馈..." /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">{rows.map(x=><button key={x.id} onClick={()=>{setSelected(x);setReply(x.admin_reply||'');}} className={`w-full text-left p-4 border-b border-slate-700/50 hover:bg-slate-700/40 ${selected?.id===x.id?'bg-blue-600/10':''}`}><div className="flex justify-between"><span className="text-white font-medium">{x.category}</span><span className={x.status==='resolved'?'text-green-400 text-xs':'text-amber-400 text-xs'}>{x.status}</span></div><div className="text-slate-300 text-sm mt-2 line-clamp-2">{x.content}</div><div className="text-slate-500 text-xs mt-2">{String(x.user_id).slice(0,12)} · {fmt(x.created_at)}</div></button>)}{!rows.length&&<div className="text-slate-500 text-center py-12">暂无反馈</div>}</div><div className="bg-slate-800 border border-slate-700 rounded-xl p-5">{selected?<><h3 className="text-white font-bold mb-3">反馈详情</h3><div className="text-slate-300 whitespace-pre-wrap mb-4">{selected.content}</div><div className="text-xs text-slate-500 mb-4">版本 {selected.app_version||'-'} · {selected.platform||'-'} · {fmt(selected.created_at)}</div><textarea value={reply} onChange={e=>setReply(e.target.value)} className="w-full h-36 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" placeholder="输入处理结果或回复..."/><div className="flex gap-3 mt-3"><Btn onClick={saveReply}>回复并完成</Btn><Btn variant="secondary" onClick={()=>{setSelected(null);setReply('');}}>取消</Btn></div></>:<div className="text-slate-500 text-center py-20">选择一条反馈进行处理</div>}</div></div></div>;
}
