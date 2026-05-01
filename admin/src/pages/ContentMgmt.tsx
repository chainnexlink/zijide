import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, SearchBar, Btn, Modal, DetailRow } from '../App';

export default function ContentMgmtPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { load(); }, [sub]);

  const load = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements(data || []);
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from('announcements').update({ is_active: active }).eq('id', id);
    showToast(active ? '已启用' : '已禁用'); load();
  };

  const del = async (id: string) => {
    if (!confirm('确定删除?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    showToast('已删除'); load();
  };

  // Level 3: Detail
  if (detail) {
    const d = detail;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-white">{d.title}</h2>
            <span className={`px-2 py-0.5 rounded text-xs ${d.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{d.is_active ? '启用' : '禁用'}</span>
            {d.type && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{d.type}</span>}
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6"><p className="text-sm text-slate-300 whitespace-pre-wrap">{d.content}</p></div>
          <DetailRow label="ID" value={d.id} />
          <DetailRow label="类型" value={d.type} />
          <DetailRow label="创建者" value={d.created_by} />
          <DetailRow label="开始时间" value={fmt(d.start_at)} />
          <DetailRow label="结束时间" value={fmt(d.end_at)} />
          <DetailRow label="创建时间" value={fmt(d.created_at)} />
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
            <Btn onClick={() => toggle(d.id, !d.is_active)} variant={d.is_active ? 'secondary' : 'success'}>{d.is_active ? '禁用' : '启用'}</Btn>
            <Btn onClick={() => { del(d.id); setDetail(null); }} variant="danger">删除</Btn>
          </div>
        </div>
      </div>
    );
  }

  if (sub === 'cities') {
    const cities = [
      { country: '乌克兰政府控制区（基辅、利沃夫、敖德萨等）', cities: ['基辅', '哈尔科夫', '敖德萨', '利沃夫', '第聂伯', '扎波罗热', '赫尔松', '马里乌波尔'] },
      { country: '以色列', cities: ['特拉维夫', '耶路撒冷', '海法', '贝尔谢巴', '阿什凯隆', '斯德罗特'] },
      { country: '阿联酋', cities: ['阿布扎比', '迪拜', '沙迦'] },
      { country: '科威特', cities: ['科威特城'] },
      { country: '巴林', cities: ['麦纳麦'] },
      { country: '约旦', cities: ['安曼', '亚喀巴'] },
      { country: '海地', cities: ['太子港'] },
      { country: '尼日利亚', cities: ['拉各斯', '阿布贾', '卡诺'] },
    ];

    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">城市管理</h2>
        <p className="text-sm text-slate-400 mb-6">系统覆盖 {cities.length} 个国家, {cities.reduce((s, c) => s + c.cities.length, 0)} 个城市的实时预警监控</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cities.map(c => (
            <div key={c.country} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h3 className="font-semibold text-white mb-3">{c.country}</h3>
              <div className="flex flex-wrap gap-2">
                {c.cities.map(city => (
                  <span key={city} className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm text-slate-300">{city}</span>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-3">{c.cities.length} 个城市</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: announcements
  const filtered = announcements.filter(a => !search || JSON.stringify(a).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">公告管理 ({announcements.length})</h2>
        <div className="flex gap-3">
          <Btn onClick={() => setShowCreate(true)}>+ 新建公告</Btn>
          <Btn variant="secondary" onClick={load}>刷新</Btn>
        </div>
      </div>
      <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索公告..." /></div>

      <div className="space-y-4">
        {filtered.map(a => (
          <div key={a.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-white">{a.title}</h3>
                <span className={`px-2 py-0.5 rounded text-xs ${a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{a.is_active ? '启用' : '禁用'}</span>
                {a.type && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{a.type}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDetail(a)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button onClick={() => toggle(a.id, !a.is_active)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300">
                  {a.is_active ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
                <button onClick={() => del(a.id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded text-red-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-2 line-clamp-2">{a.content}</p>
            <div className="text-xs text-slate-500">创建: {fmt(a.created_at)} | 有效期: {fmt(a.start_at)} ~ {fmt(a.end_at)}</div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无公告</div>}
      </div>

      {showCreate && <CreateAnnouncementModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateAnnouncementModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { supabase, showToast } = useAdmin();
  const [form, setForm] = useState({ title: '', content: '', type: 'info' });

  const submit = async () => {
    const now = new Date();
    const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from('announcements').insert({ title: form.title, content: form.content, type: form.type, is_active: true, start_at: now.toISOString(), end_at: endAt.toISOString() });
    if (!error) { showToast('公告已创建'); onSave(); } else showToast('失败: ' + error.message);
  };

  return (
    <Modal title="新建公告" onClose={onClose}>
      <div className="space-y-4">
        <div><label className="block text-sm text-slate-400 mb-1">标题 *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        <div><label className="block text-sm text-slate-400 mb-1">内容 *</label><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 h-24" /></div>
        <div><label className="block text-sm text-slate-400 mb-1">类型</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"><option value="info">通知</option><option value="warning">警告</option><option value="emergency">紧急</option><option value="update">更新</option></select></div>
        <Btn onClick={submit} disabled={!form.title || !form.content} className="w-full justify-center">发布公告</Btn>
      </div>
    </Modal>
  );
}
