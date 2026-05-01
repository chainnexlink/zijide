import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, SearchBar, Btn, Modal, DetailRow } from '../App';
import { STATIC_SHELTERS } from '../../../src/data/shelters';

export default function ShelterMgmtPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [shelters, setShelters] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  useEffect(() => { load(); }, []);

  const load = async () => { const { data } = await supabase.from('shelters').select('*').order('created_at', { ascending: false }); setShelters((data && data.length > 0) ? data : STATIC_SHELTERS as any[]); };

  const del = async (id: string) => { if (!confirm('确定删除?')) return; await supabase.from('shelters').delete().eq('id', id); showToast('已删除'); load(); };

  if (detail) {
    const d = detail;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回列表
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">{d.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <DetailRow label="ID" value={d.id} />
              <DetailRow label="名称" value={d.name} />
              <DetailRow label="地址" value={d.address} />
              <DetailRow label="城市" value={d.city} />
              <DetailRow label="国家" value={d.country} />
              <DetailRow label="坐标" value={`${d.latitude}, ${d.longitude}`} />
              <DetailRow label="电话" value={d.phone} />
              <DetailRow label="开放时间" value={d.opening_hours} />
            </div>
            <div>
              <DetailRow label="状态" value={d.status} />
              <DetailRow label="容量" value={d.capacity} />
              <DetailRow label="当前人数" value={d.current_occupancy} />
              <DetailRow label="占用率" value={d.capacity ? `${Math.round((d.current_occupancy||0)/d.capacity*100)}%` : '-'} />
              <h3 className="font-semibold text-white mt-4 mb-2">设施</h3>
              <div className="flex flex-wrap gap-2">
                {d.has_water && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">水源</span>}
                {d.has_electricity && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">电力</span>}
                {d.has_medical && <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">医疗</span>}
                {d.has_toilet && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">卫生间</span>}
                {d.has_rest_area && <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">休息区</span>}
              </div>
              <DetailRow label="创建时间" value={fmt(d.created_at)} />
              <DetailRow label="更新时间" value={fmt(d.updated_at)} />
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
            <Btn onClick={() => { setEditData(d); setShowForm(true); setDetail(null); }}>编辑</Btn>
            <Btn variant="danger" onClick={() => { del(d.id); setDetail(null); }}>删除</Btn>
          </div>
        </div>
      </div>
    );
  }

  if (sub === 'facilities') {
    const totalCap = shelters.reduce((s,sh) => s + (sh.capacity||0), 0);
    const totalOcc = shelters.reduce((s,sh) => s + (sh.current_occupancy||0), 0);
    const fac = { water: shelters.filter(s=>s.has_water).length, elec: shelters.filter(s=>s.has_electricity).length, med: shelters.filter(s=>s.has_medical).length, toilet: shelters.filter(s=>s.has_toilet).length, rest: shelters.filter(s=>s.has_rest_area).length };
    const statusCounts = { open: shelters.filter(s=>s.status==='open').length, full: shelters.filter(s=>s.status==='full').length, closed: shelters.filter(s=>s.status==='closed').length };

    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">设施统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5"><div className="text-xs text-slate-400 mb-1">总避难所</div><div className="text-2xl font-bold text-white">{shelters.length}</div></div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5"><div className="text-xs text-slate-400 mb-1">总容量</div><div className="text-2xl font-bold text-white">{totalCap.toLocaleString()}</div></div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5"><div className="text-xs text-slate-400 mb-1">当前使用</div><div className="text-2xl font-bold text-white">{totalOcc.toLocaleString()}</div></div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5"><div className="text-xs text-slate-400 mb-1">总占用率</div><div className="text-2xl font-bold text-white">{totalCap ? Math.round(totalOcc/totalCap*100) : 0}%</div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">状态分布</h3>
            {Object.entries(statusCounts).map(([k,v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{k === 'open' ? '开放' : k === 'full' ? '已满' : '关闭'}</span>
                <div className="flex items-center gap-3"><div className="w-32 bg-slate-700 rounded-full h-2"><div className={`h-2 rounded-full ${k==='open'?'bg-green-500':k==='full'?'bg-red-500':'bg-gray-500'}`} style={{width:`${shelters.length?v/shelters.length*100:0}%`}}/></div><span className="text-sm text-white w-8 text-right">{v}</span></div>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">设施覆盖</h3>
            {[{k:'water',l:'水源',v:fac.water},{k:'elec',l:'电力',v:fac.elec},{k:'med',l:'医疗',v:fac.med},{k:'toilet',l:'卫生间',v:fac.toilet},{k:'rest',l:'休息区',v:fac.rest}].map(i=>(
              <div key={i.k} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{i.l}</span>
                <div className="flex items-center gap-3"><div className="w-32 bg-slate-700 rounded-full h-2"><div className="h-2 rounded-full bg-blue-500" style={{width:`${shelters.length?i.v/shelters.length*100:0}%`}}/></div><span className="text-sm text-white w-12 text-right">{i.v}/{shelters.length}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filtered = shelters.filter(s => !search || JSON.stringify(s).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">避难所列表 ({shelters.length})</h2>
        <div className="flex gap-3"><Btn onClick={() => { setEditData(null); setShowForm(true); }}>+ 新建避难所</Btn><Btn variant="secondary" onClick={load}>刷新</Btn></div>
      </div>
      <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索避难所..." /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white truncate">{s.name}</h3>
              <span className={`px-2 py-1 rounded text-xs ${s.status==='open'?'bg-green-500/20 text-green-400':s.status==='full'?'bg-red-500/20 text-red-400':'bg-gray-500/20 text-gray-400'}`}>{s.status==='open'?'开放':s.status==='full'?'已满':s.status}</span>
            </div>
            <div className="space-y-1 text-sm text-slate-400">
              <div>城市: {s.city||'-'} | 地址: {s.address||'-'}</div>
              <div>容量: <span className="text-white">{s.current_occupancy||0}</span> / {s.capacity||'-'}</div>
              {s.capacity && <div className="w-full bg-slate-700 rounded-full h-2"><div className={`h-2 rounded-full ${(s.current_occupancy||0)/s.capacity>0.8?'bg-red-500':'bg-green-500'}`} style={{width:`${Math.min(100,(s.current_occupancy||0)/s.capacity*100)}%`}}/></div>}
              <div className="flex flex-wrap gap-1 mt-2">
                {s.has_water && <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">水</span>}
                {s.has_electricity && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">电</span>}
                {s.has_medical && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">医</span>}
                {s.has_toilet && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">厕</span>}
                {s.has_rest_area && <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">休</span>}
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">
              <button onClick={() => setDetail(s)} className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300">详情</button>
              <button onClick={() => { setEditData(s); setShowForm(true); }} className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300">编辑</button>
              <button onClick={() => del(s.id)} className="py-1.5 px-3 bg-red-600/20 hover:bg-red-600/40 rounded text-sm text-red-400">删除</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-slate-500 py-12">暂无避难所</div>}
      </div>

      {showForm && <ShelterForm data={editData} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function ShelterForm({ data, onClose, onSave }: { data: any; onClose: () => void; onSave: () => void }) {
  const { supabase, showToast } = useAdmin();
  const [f, setF] = useState({ name: data?.name||'', address: data?.address||'', city: data?.city||'', country: data?.country||'', capacity: data?.capacity?.toString()||'', status: data?.status||'open', latitude: data?.latitude?.toString()||'', longitude: data?.longitude?.toString()||'', has_water: data?.has_water||false, has_electricity: data?.has_electricity||false, has_medical: data?.has_medical||false, has_toilet: data?.has_toilet||false, has_rest_area: data?.has_rest_area||false, phone: data?.phone||'', opening_hours: data?.opening_hours||'' });

  const submit = async () => {
    const payload = { name: f.name, address: f.address||null, city: f.city||null, country: f.country||null, capacity: f.capacity?parseInt(f.capacity):null, status: f.status, latitude: parseFloat(f.latitude)||0, longitude: parseFloat(f.longitude)||0, has_water: f.has_water, has_electricity: f.has_electricity, has_medical: f.has_medical, has_toilet: f.has_toilet, has_rest_area: f.has_rest_area, phone: f.phone||null, opening_hours: f.opening_hours||null };
    if (data?.id) { const { error } = await supabase.from('shelters').update(payload).eq('id', data.id); if (!error) { showToast('已更新'); onSave(); } else showToast('失败: '+error.message); }
    else { const { error } = await supabase.from('shelters').insert(payload); if (!error) { showToast('已创建'); onSave(); } else showToast('失败: '+error.message); }
  };

  return (
    <Modal title={data ? '编辑避难所' : '新建避难所'} onClose={onClose}>
      <div className="space-y-4">
        <div><label className="block text-sm text-slate-400 mb-1">名称 *</label><input value={f.name} onChange={e=>setF({...f,name:e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        <div><label className="block text-sm text-slate-400 mb-1">地址</label><input value={f.address} onChange={e=>setF({...f,address:e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">城市</label><input value={f.city} onChange={e=>setF({...f,city:e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">国家</label><input value={f.country} onChange={e=>setF({...f,country:e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">容量</label><input type="number" value={f.capacity} onChange={e=>setF({...f,capacity:e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">纬度 *</label><input type="number" step="any" value={f.latitude} onChange={e=>setF({...f,latitude:e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">经度 *</label><input type="number" step="any" value={f.longitude} onChange={e=>setF({...f,longitude:e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">状态</label><select value={f.status} onChange={e=>setF({...f,status:e.target.value})} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"><option value="open">开放</option><option value="full">已满</option><option value="closed">关闭</option></select></div>
        </div>
        <div><label className="block text-sm text-slate-400 mb-2">设施</label><div className="flex flex-wrap gap-3">
          {[{k:'has_water',l:'水源'},{k:'has_electricity',l:'电力'},{k:'has_medical',l:'医疗'},{k:'has_toilet',l:'卫生间'},{k:'has_rest_area',l:'休息区'}].map(i=>(
            <label key={i.k} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={(f as any)[i.k]} onChange={e=>setF({...f,[i.k]:e.target.checked})} className="w-4 h-4 rounded" /><span className="text-sm text-slate-300">{i.l}</span></label>
          ))}
        </div></div>
        <Btn onClick={submit} disabled={!f.name} className="w-full justify-center">{data ? '保存' : '创建'}</Btn>
      </div>
    </Modal>
  );
}
