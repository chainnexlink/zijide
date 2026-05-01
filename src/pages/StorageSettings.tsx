import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  HardDrive,
  FileText,
  Trash2,
  AlertTriangle,
  Loader2,
  Check
} from 'lucide-react';

export default function StorageSettings() {
  const navigate = useNavigate();
  const [storage, setStorage] = useState({
    used: 256,
    total: 1024,
    cache: 45,
    database: 128,
    logs: 83
  });
  const [clearing, setClearing] = useState<string | null>(null);
  const [cleared, setCleared] = useState<string | null>(null);

  const handleClear = async (type: string) => {
    setClearing(type);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setClearing(null);
    setCleared(type);
    setTimeout(() => setCleared(null), 2000);
  };

  const handleReset = async () => {
    setClearing('all');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setClearing(null);
    setCleared('all');
    setTimeout(() => {
      setCleared(null);
      navigate('/settings');
    }, 1500);
  };

  const usedPercent = (storage.used / storage.total) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">存储设置</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center">
              <HardDrive className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">存储概览</h3>
              <p className="text-slate-400">{storage.used} MB / {storage.total} MB 已使用</p>
            </div>
          </div>

          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usedPercent}%` }}
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
            />
          </div>

          <div className="flex justify-between text-sm text-slate-400 mt-2">
            <span>已用 {usedPercent.toFixed(1)}%</span>
            <span>可用 {storage.total - storage.used} MB</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-orange-400" />
            清理选项
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">应用缓存</p>
                  <p className="text-sm text-slate-400">{storage.cache} MB</p>
                </div>
              </div>
              <button
                onClick={() => handleClear('cache')}
                disabled={clearing === 'cache'}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {clearing === 'cache' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : cleared === 'cache' ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium">本地数据库</p>
                  <p className="text-sm text-slate-400">{storage.database} MB</p>
                </div>
              </div>
              <button
                onClick={() => handleClear('database')}
                disabled={clearing === 'database'}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {clearing === 'database' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : cleared === 'database' ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">日志文件</p>
                  <p className="text-sm text-slate-400">{storage.logs} MB</p>
                </div>
              </div>
              <button
                onClick={() => handleClear('logs')}
                disabled={clearing === 'logs'}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {clearing === 'logs' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : cleared === 'logs' ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400 mb-1">危险操作</h3>
              <p className="text-sm text-slate-400">
                重置所有存储数据将清除所有本地数据，包括登录状态、设置和缓存。此操作不可撤销。
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={clearing === 'all'}
            className="w-full h-12 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {clearing === 'all' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                重置中...
              </>
            ) : cleared === 'all' ? (
              <>
                <Check className="w-5 h-5" />
                已重置
              </>
            ) : (
              '重置所有存储数据'
            )}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
