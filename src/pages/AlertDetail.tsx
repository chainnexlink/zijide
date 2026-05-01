import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  ChevronRight,
  Navigation,
  Rocket,
  Bomb,
  Swords,
  Moon
} from 'lucide-react';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

type Alert = Tables<'alerts'>;
type Shelter = Tables<'shelters'>;

const alertTypeIcons: Record<string, React.ElementType> = {
  air_strike: Rocket,
  artillery: Bomb,
  conflict: Swords,
  curfew: Moon,
  chemical: AlertTriangle,
  other: Bell
};

const alertTypeLabels: Record<string, string> = {
  air_strike: '空袭预警',
  artillery: '炮击预警',
  conflict: '冲突预警',
  curfew: '宵禁提醒',
  chemical: '化学预警',
  other: '其他预警'
};

const severityLabels: Record<string, string> = {
  red: '红色预警',
  orange: '橙色预警',
  yellow: '黄色预警'
};

export default function AlertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [nearbyShelters, setNearbyShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAlert();
    }
  }, [id]);

  const fetchAlert = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', id!)
      .single();

    if (data) {
      setAlert(data);
      fetchNearbyShelters(data.latitude, data.longitude);
    }
    setLoading(false);
  };

  const fetchNearbyShelters = async (lat: number | null, lng: number | null) => {
    if (!lat || !lng) return;

    // Query shelters within ~50km bounding box, then sort by distance client-side
    const delta = 0.45; // ~50km in degrees
    const { data } = await supabase
      .from('shelters')
      .select('*')
      .eq('status', 'open')
      .gte('latitude', lat - delta)
      .lte('latitude', lat + delta)
      .gte('longitude', lng - delta)
      .lte('longitude', lng + delta)
      .limit(20);

    if (data && data.length > 0) {
      const sorted = data
        .map(s => ({
          ...s,
          _dist: Math.sqrt(Math.pow((s.latitude || 0) - lat, 2) + Math.pow((s.longitude || 0) - lng, 2)),
        }))
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 3);
      setNearbyShelters(sorted);
    } else {
      // Fallback: get any 3 open shelters
      const { data: fallback } = await supabase
        .from('shelters')
        .select('*')
        .eq('status', 'open')
        .limit(3);
      if (fallback) setNearbyShelters(fallback);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-slate-500';
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'red': return 'text-red-400';
      case 'orange': return 'text-orange-400';
      case 'yellow': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">预警信息不存在</p>
        </div>
      </div>
    );
  }

  const Icon = alertTypeIcons[alert.alert_type] || Bell;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/alert-history')}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">预警详情</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${getSeverityColor(alert.severity)}/10 border ${getSeverityColor(alert.severity)}/30 rounded-2xl p-6 mb-6`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 ${getSeverityColor(alert.severity)}/20 rounded-2xl flex items-center justify-center`}>
              <Icon className={`w-8 h-8 ${getSeverityTextColor(alert.severity)}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)} text-white`}>
                  {severityLabels[alert.severity]}
                </span>
                <span className="text-sm text-slate-400">{alertTypeLabels[alert.alert_type]}</span>
              </div>
              <h1 className="text-xl font-bold mb-2">{alert.title}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {alert.city} · {alert.country}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(alert.created_at || '').toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-3">预警描述</h3>
          <p className="text-slate-300">{alert.description || '暂无描述'}</p>

          {alert.affected_radius_km && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4" />
              <span>影响范围: {alert.affected_radius_km} 公里</span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            应对建议
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2">立即行动</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5" />
                  立即前往最近的避难所
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5" />
                  通知家人确认安全
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5" />
                  携带紧急物资包
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-amber-400 mb-2">短期措施</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5" />
                  关注官方最新通报
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5" />
                  避免前往危险区域
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-2">长期建议</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5" />
                  制定家庭应急计划
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5" />
                  准备应急物资储备
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            附近避难所
          </h3>

          <div className="space-y-3">
            {nearbyShelters.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无附近避难所信息</p>
              </div>
            ) : (
              nearbyShelters.map((shelter) => (
                <div
                  key={shelter.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl"
                >
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{shelter.name}</h4>
                    <p className="text-xs text-slate-400">{shelter.address}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/shelter/${shelter.id}`)}
                    className="p-2 text-slate-400 hover:text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
