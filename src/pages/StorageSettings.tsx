import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import {
  ArrowLeft,
  Database,
  HardDrive,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  Loader2,
  Check
} from 'lucide-react';

const APP_CACHE_KEYS = ['wa_cache_alerts', 'wa_cache_shelters'];

function localStorageBytes(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      const v = localStorage.getItem(k) || '';
      total += (k.length + v.length) * 2; // UTF-16
    }
  } catch { /* ignore */ }
  return total;
}

async function cacheApiBytes(): Promise<number> {
  if (!('caches' in window)) return 0;
  let total = 0;
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        const res = await cache.match(req);
        if (res) {
          try { total += (await res.clone().arrayBuffer()).byteLength; } catch { /* ignore */ }
        }
      }
    }
  } catch { /* ignore */ }
  return total;
}

const mb = (bytes: number) => Math.max(0, bytes) / (1024 * 1024);
const fmtMB = (bytes: number) => mb(bytes).toFixed(1);

export default function StorageSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(0);   // bytes, 整个 App 占用
  const [quota, setQuota] = useState(0);    // bytes, 配额
  const [cacheBytes, setCacheBytes] = useState(0);   // Cache API（离线地图瓦片等）
  const [localBytes, setLocalBytes] = useState(0);   // localStorage 缓存数据
  const [clearing, setClearing] = useState<string | null>(null);
  const [cleared, setCleared] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        setUsage(est.usage || 0);
        setQuota(est.quota || 0);
      }
      setCacheBytes(await cacheApiBytes());
      setLocalBytes(localStorageBytes());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const flash = (key: string) => { setCleared(key); setTimeout(() => setCleared(null), 1800); };

  // 真实清除 Cache API（离线地图瓦片 / 资源缓存）
  const clearCaches = async () => {
    setClearing('cache');
    try {
      if ('caches' in window) {
        for (const name of await caches.keys()) await caches.delete(name);
      }
    } catch { /* ignore */ }
    await refresh();
    setClearing(null);
    flash('cache');
  };

  // 真实清除本地缓存数据（预警/避难所离线快照），不动登录态与用户设置
  const clearLocalCache = async () => {
    setClearing('local');
    try { for (const k of APP_CACHE_KEYS) localStorage.removeItem(k); } catch { /* ignore */ }
    await refresh();
    setClearing(null);
    flash('local');
  };

  // 真实重置：清空所有本地数据 + 退出登录
  const handleReset = async () => {
    if (!confirm('确定重置所有本地数据？将清除登录状态、设置、缓存与离线地图，且不可撤销。')) return;
    setClearing('all');
    try {
      if ('caches' in window) { for (const name of await caches.keys()) await caches.delete(name); }
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      localStorage.clear();
    } catch { /* ignore */ }
    setClearing(null);
    flash('all');
    setTimeout(() => navigate('/'), 800);
  };

  const usedPercent = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/settings')} className="p-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">存储设置</span>
            </div>
            <button onClick={refresh} disabled={loading} className="text-sm text-slate-400 hover:text-white disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '刷新'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 概览（真实 navigator.storage.estimate） */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center">
              <HardDrive className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">存储概览</h3>
              <p className="text-slate-400">
                {loading ? '计算中…' : `${fmtMB(usage)} MB${quota ? ` / ${fmtMB(quota)} MB` : ''} 已使用`}
              </p>
            </div>
          </div>
          {quota > 0 && (
            <>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${usedPercent}%` }}
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
              </div>
              <div className="flex justify-between text-sm text-slate-400 mt-2">
                <span>已用 {usedPercent.toFixed(1)}%</span>
                <span>可用 {fmtMB(quota - usage)} MB</span>
              </div>
            </>
          )}
        </motion.div>

        {/* 清理选项（真实） */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-orange-400" />清理选项
          </h3>
          <div className="space-y-3">
            <ClearRow
              icon={<ImageIcon className="w-5 h-5 text-blue-400" />} iconBg="bg-blue-500/20"
              title="离线地图与资源缓存" sub={`${fmtMB(cacheBytes)} MB`}
              busy={clearing === 'cache'} done={cleared === 'cache'} onClick={clearCaches} />
            <ClearRow
              icon={<Database className="w-5 h-5 text-green-400" />} iconBg="bg-green-500/20"
              title="本地缓存数据（预警/避难所离线快照）" sub={`${fmtMB(localBytes)} MB`}
              busy={clearing === 'local'} done={cleared === 'local'} onClick={clearLocalCache} />
          </div>
        </motion.div>

        {/* 危险操作（真实重置） */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400 mb-1">危险操作</h3>
              <p className="text-sm text-slate-400">重置将清除所有本地数据（登录状态、设置、缓存、离线地图），并退出登录。此操作不可撤销。</p>
            </div>
          </div>
          <button onClick={handleReset} disabled={clearing === 'all'}
            className="w-full h-12 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {clearing === 'all' ? (<><Loader2 className="w-5 h-5 animate-spin" />重置中...</>)
              : cleared === 'all' ? (<><Check className="w-5 h-5" />已重置</>)
              : '重置所有本地数据'}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

function ClearRow({ icon, iconBg, title, sub, busy, done, onClick }: {
  icon: React.ReactNode; iconBg: string; title: string; sub: string; busy: boolean; done: boolean; onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>{icon}</div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-slate-400">{sub}</p>
        </div>
      </div>
      <button onClick={onClick} disabled={busy} className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : done ? <Check className="w-5 h-5 text-green-400" /> : <Trash2 className="w-5 h-5" />}
      </button>
    </div>
  );
}
