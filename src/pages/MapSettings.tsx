import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Map,
  Map as MapIcon,
  Satellite,
  Layers,
  Mountain,
  Moon,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';

const mapTypes = [
  { id: 'standard', label: '标准地图', icon: MapIcon },
  { id: 'satellite', label: '卫星地图', icon: Satellite },
  { id: 'hybrid', label: '混合地图', icon: Layers },
  { id: 'terrain', label: '地形图', icon: Mountain },
  { id: 'dark', label: '夜间模式', icon: Moon }
];

const offlineRegions = [
  { id: 1, name: '基辅市区', size: '156 MB', status: 'downloaded' },
  { id: 2, name: '哈尔科夫', size: '203 MB', status: 'downloading' },
  { id: 3, name: '敖德萨', size: '178 MB', status: 'pending' }
];

export default function MapSettings() {
  const navigate = useNavigate();
  const [selectedMap, setSelectedMap] = useState('standard');
  const [showDangerZone, setShowDangerZone] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
    navigate('/settings');
  };

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
              <span className="text-xl font-bold">地图设置</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-cyan-500 rounded-lg font-medium text-sm hover:bg-cyan-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '保存'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-cyan-400" />
            地图类型
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mapTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedMap(type.id)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedMap === type.id
                    ? 'bg-cyan-500/20 border-cyan-500'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                }`}
              >
                <type.icon className={`w-6 h-6 mb-2 ${
                  selectedMap === type.id ? 'text-cyan-400' : 'text-slate-400'
                }`} />
                <span className={`text-sm font-medium ${
                  selectedMap === type.id ? 'text-cyan-400' : 'text-slate-300'
                }`}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4">图层显示</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <MapIcon className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-medium">危险区域</p>
                  <p className="text-sm text-slate-400">显示战区危险区域</p>
                </div>
              </div>
              <button
                onClick={() => setShowDangerZone(!showDangerZone)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showDangerZone ? 'bg-cyan-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: showDangerZone ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <MapIcon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium">避难所</p>
                  <p className="text-sm text-slate-400">显示附近避难所</p>
                </div>
              </div>
              <button
                onClick={() => setShowShelters(!showShelters)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showShelters ? 'bg-cyan-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: showShelters ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <MapIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">逃生路线</p>
                  <p className="text-sm text-slate-400">显示推荐逃生路线</p>
                </div>
              </div>
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showRoutes ? 'bg-cyan-500' : 'bg-slate-600'
                }`}
              >
                <motion.div
                  animate={{ x: showRoutes ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="w-5 h-5 text-cyan-400" />
              离线地图
            </h3>
            <span className="text-sm text-slate-400">已下载 156 MB</span>
          </div>

          <div className="space-y-3">
            {offlineRegions.map((region) => (
              <div
                key={region.id}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl"
              >
                <div>
                  <p className="font-medium">{region.name}</p>
                  <p className="text-sm text-slate-400">{region.size}</p>
                </div>
                <div className="flex items-center gap-2">
                  {region.status === 'downloaded' && (
                    <button className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  {region.status === 'downloading' && (
                    <div className="w-20 h-2 bg-slate-600 rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-cyan-500 rounded-full" />
                    </div>
                  )}
                  {region.status === 'pending' && (
                    <button className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm">
                      下载
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 h-12 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 font-medium hover:bg-cyan-500/30 transition-colors">
            下载更多区域
          </button>
        </motion.div>
      </main>
    </div>
  );
}
