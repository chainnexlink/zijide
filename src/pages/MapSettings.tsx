import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Map, Map as MapIcon, Satellite, Layers, Mountain, Moon,
  Download, Trash2, Loader2, Eye, X, Check,
} from 'lucide-react';
import {
  OFFLINE_REGIONS, getOfflineMeta, downloadRegion, deleteRegion, totalOfflineBytes,
  type OfflineRegion, type RegionMeta,
} from '../utils/offlineMaps';
import { STATIC_SHELTERS } from '../data/shelters';
import OfflineMap from '../components/OfflineMap';

const mapTypes = [
  { id: 'standard', label: '标准地图', icon: MapIcon },
  { id: 'satellite', label: '卫星地图', icon: Satellite },
  { id: 'hybrid', label: '混合地图', icon: Layers },
  { id: 'terrain', label: '地形图', icon: Mountain },
  { id: 'dark', label: '夜间模式', icon: Moon },
];

const SETTINGS_KEY = 'wa_map_settings';
const fmtMB = (bytes: number) => (Math.max(0, bytes) / (1024 * 1024)).toFixed(1);

function loadSettings(): { mapType?: string; showDangerZone?: boolean; showShelters?: boolean; showRoutes?: boolean } {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

export default function MapSettings() {
  const navigate = useNavigate();
  const saved = loadSettings();
  const [selectedMap, setSelectedMap] = useState(saved.mapType || 'standard');
  const [showDangerZone, setShowDangerZone] = useState(saved.showDangerZone ?? true);
  const [showShelters, setShowShelters] = useState(saved.showShelters ?? true);
  const [showRoutes, setShowRoutes] = useState(saved.showRoutes ?? true);
  const [saving, setSaving] = useState(false);

  const [meta, setMeta] = useState<Record<string, RegionMeta>>({});
  const [downloading, setDownloading] = useState<Record<string, { done: number; total: number }>>({});
  const [viewer, setViewer] = useState<OfflineRegion | null>(null);

  useEffect(() => { setMeta(getOfflineMeta()); }, []);

  const handleSave = () => {
    setSaving(true);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      mapType: selectedMap, showDangerZone, showShelters, showRoutes,
    }));
    setTimeout(() => { setSaving(false); navigate('/settings'); }, 300);
  };

  const handleDownload = async (region: OfflineRegion) => {
    setDownloading((d) => ({ ...d, [region.id]: { done: 0, total: 1 } }));
    try {
      await downloadRegion(region, (done, total) =>
        setDownloading((d) => ({ ...d, [region.id]: { done, total } })));
      setMeta(getOfflineMeta());
    } catch (e: any) {
      alert('下载失败：' + (e?.message || '请检查网络'));
    } finally {
      setDownloading((d) => { const n = { ...d }; delete n[region.id]; return n; });
    }
  };

  const handleDelete = async (region: OfflineRegion) => {
    if (!confirm(`删除「${region.name}」的离线地图？`)) return;
    await deleteRegion(region);
    setMeta(getOfflineMeta());
  };

  const sheltersIn = (r: OfflineRegion) => STATIC_SHELTERS.filter(s =>
    s.longitude >= r.bbox[0] && s.longitude <= r.bbox[2] && s.latitude >= r.bbox[1] && s.latitude <= r.bbox[3]
  ).map(s => ({ latitude: s.latitude, longitude: s.longitude, name: s.name }));

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/settings')} className="p-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">地图设置</span>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-cyan-500 rounded-lg font-medium text-sm hover:bg-cyan-600 transition-colors disabled:opacity-50 flex items-center gap-1">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-4 h-4" />保存</>}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 地图类型 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Map className="w-5 h-5 text-cyan-400" />地图类型</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mapTypes.map((type) => (
              <button key={type.id} onClick={() => setSelectedMap(type.id)}
                className={`p-4 rounded-xl border transition-all ${selectedMap === type.id ? 'bg-cyan-500/20 border-cyan-500' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}>
                <type.icon className={`w-6 h-6 mb-2 ${selectedMap === type.id ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${selectedMap === type.id ? 'text-cyan-400' : 'text-slate-300'}`}>{type.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* 图层显示 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4">图层显示</h3>
          <div className="space-y-4">
            <Toggle label="危险区域" desc="显示战区危险区域" color="red" on={showDangerZone} set={setShowDangerZone} />
            <Toggle label="避难所" desc="显示附近避难所" color="green" on={showShelters} set={setShowShelters} />
            <Toggle label="逃生路线" desc="显示推荐逃生路线" color="blue" on={showRoutes} set={setShowRoutes} />
          </div>
        </motion.div>

        {/* 离线地图（真实下载/管理） */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold flex items-center gap-2"><Download className="w-5 h-5 text-cyan-400" />离线地图</h3>
            <span className="text-sm text-slate-400">已下载 {fmtMB(totalOfflineBytes())} MB</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">下载后断网也可查看该区域地图与避难所位置（战时断网刚需）。</p>

          <div className="space-y-3">
            {OFFLINE_REGIONS.map((region) => {
              const m = meta[region.id];
              const prog = downloading[region.id];
              const pct = prog ? Math.round((prog.done / Math.max(1, prog.total)) * 100) : 0;
              return (
                <div key={region.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{region.name}</p>
                    <p className="text-sm text-slate-400">
                      {prog ? `下载中 ${pct}%` : m ? `${fmtMB(m.bytes)} MB · ${m.tiles} 瓦片` : `${region.country} · 未下载`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {prog ? (
                      <div className="w-24 h-2 bg-slate-600 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    ) : m ? (
                      <>
                        <button onClick={() => setViewer(region)} title="查看"
                          className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"><Eye className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(region)} title="删除"
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </>
                    ) : (
                      <button onClick={() => handleDownload(region)}
                        className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors flex items-center gap-1">
                        <Download className="w-4 h-4" />下载
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* 离线地图查看器 */}
      {viewer && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col" onClick={() => setViewer(null)}>
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="font-semibold">{viewer.name} · 离线地图</span>
            <button onClick={() => setViewer(null)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 mx-3 mb-3 rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <OfflineMap center={viewer.center} zoom={12} shelters={showShelters ? sheltersIn(viewer) : []} />
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, desc, color, on, set }: {
  label: string; desc: string; color: string; on: boolean; set: (v: boolean) => void;
}) {
  const bg: Record<string, string> = { red: 'bg-red-500/20 text-red-400', green: 'bg-green-500/20 text-green-400', blue: 'bg-blue-500/20 text-blue-400' };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${bg[color] || bg.blue} rounded-lg flex items-center justify-center`}>
          <MapIcon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-slate-400">{desc}</p>
        </div>
      </div>
      <button onClick={() => set(!on)} className={`relative w-12 h-6 rounded-full transition-colors ${on ? 'bg-cyan-500' : 'bg-slate-600'}`}>
        <motion.div animate={{ x: on ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full" />
      </button>
    </div>
  );
}
