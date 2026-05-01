import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Filter,
  Rocket,
  Bomb,
  Swords,
  Moon,
  AlertTriangle,
  ChevronRight,
  Calendar,
  MapPin,
  Clock,
  Zap,
  Shield,
  Siren,
  Info,
  X,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Navigation
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import type { Tables } from '../supabase/types';

type Alert = Tables<'alerts'>;

interface AlertExtended extends Alert {
  distance?: number;
  reliability_score?: number;
}

const severityFilterDefs = [
  { value: 'all', colorKey: 'bg-slate-500', textColor: 'text-slate-400' },
  { value: 'red', colorKey: 'bg-red-500', textColor: 'text-red-400' },
  { value: 'orange', colorKey: 'bg-orange-500', textColor: 'text-orange-400' },
  { value: 'yellow', colorKey: 'bg-yellow-500', textColor: 'text-yellow-400' }
];

const alertTypeIcons: Record<string, React.ElementType> = {
  air_strike: Siren,
  artillery: Bomb,
  conflict: Swords,
  curfew: Moon,
  chemical: AlertTriangle,
  other: Info
};

const alertTypeKeys: Record<string, string> = {
  air_strike: 'airStrike',
  artillery: 'artillery',
  conflict: 'conflict',
  curfew: 'curfew',
  chemical: 'chemical',
  other: 'other'
};

export default function AlertHistory() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const severityFilters = severityFilterDefs.map(f => ({
    ...f,
    label: f.value === 'all' ? (t('all') || 'All') : (t(f.value) || f.value),
    color: f.colorKey,
  }));

  const alertTypeLabels: Record<string, string> = Object.fromEntries(
    Object.entries(alertTypeKeys).map(([k, v]) => [k, t(v) || k])
  );

  const [alerts, setAlerts] = useState<AlertExtended[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<AlertExtended[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateRange, setDateRange] = useState('7');
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AlertExtended | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, selectedSeverity, selectedType, dateRange, searchQuery]);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setAlerts(data);
    }
    setLoading(false);
  };

  const filterAlerts = () => {
    let filtered = [...alerts];

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(a => a.severity === selectedSeverity);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.alert_type === selectedType);
    }

    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(a => new Date(a.created_at || '') >= cutoff);
    }

    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAlerts(filtered);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-slate-500';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'red': return 'bg-red-500/10 border-red-500/30';
      case 'orange': return 'bg-orange-500/10 border-orange-500/30';
      case 'yellow': return 'bg-yellow-500/10 border-yellow-500/30';
      default: return 'bg-slate-500/10 border-slate-500/30';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'red': return 'text-red-400';
      case 'orange': return 'text-orange-400';
      case 'yellow': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const alertDate = new Date(date);
    const diff = now.getTime() - alertDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} ${t('minutesAgo') || 'min ago'}`;
    if (hours < 24) return `${hours} ${t('hoursAgo') || 'hr ago'}`;
    return `${days} ${t('daysAgo') || 'days ago'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('alerts') || '预警'}</h1>
        <button
          onClick={() => setShowFilterModal(true)}
          className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
        >
          <SlidersHorizontal className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchAlerts') || '搜索预警...'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-4 overflow-x-auto pb-2"
        >
          {severityFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedSeverity(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedSeverity === filter.value
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${filter.color}`} />
              {filter.label}
            </button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-20">
              <Bell className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <p className="text-slate-400">{t('noData')}</p>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => {
              const Icon = alertTypeIcons[alert.alert_type] || Bell;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedAlert(alert)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all ${getSeverityBg(alert.severity!)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${getSeverityColor(alert.severity)}/20 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${getSeverityText(alert.severity)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{alert.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(alert.severity)}/20 ${getSeverityText(alert.severity)}`}>
                          {alertTypeLabels[alert.alert_type]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 line-clamp-2">{alert.description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {alert.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(alert.created_at!)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {alert.reliability_score || 85}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">{t('filter') || '筛选'}</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm text-slate-400 mb-3 block">{t('severity') || '级别'}</label>
                  <div className="flex gap-2">
                    {severityFilters.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setSelectedSeverity(filter.value)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedSeverity === filter.value
                            ? 'bg-slate-800 text-white border border-slate-700'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${filter.color}`} />
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-3 block">{t('alertType') || '类型'}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(alertTypeLabels).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
                        className={`py-2 rounded-lg text-sm transition-colors ${
                          selectedType === type
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-3 block">{t('timeRange') || '时间范围'}</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-3 text-sm focus:border-red-500 focus:outline-none"
                  >
                    <option value="1">{t('today') || '今天'}</option>
                    <option value="7">{t('last7Days') || '最近7天'}</option>
                    <option value="30">{t('last30Days') || '最近30天'}</option>
                    <option value="90">{t('last3Months') || '最近3个月'}</option>
                    <option value="all">{t('all') || '全部'}</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSelectedSeverity('all');
                    setSelectedType('all');
                    setDateRange('7');
                    setSearchQuery('');
                  }}
                  className="w-full py-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  {t('resetFilters') || '重置筛选'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setSelectedAlert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 ${getSeverityColor(selectedAlert.severity)}/20 rounded-xl flex items-center justify-center`}>
                  {(() => {
                    const Icon = alertTypeIcons[selectedAlert.alert_type] || Bell;
                    return <Icon className={`w-6 h-6 ${getSeverityText(selectedAlert.severity)}`} />;
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{selectedAlert.title}</h3>
                  <span className={`text-sm ${getSeverityText(selectedAlert.severity)}`}>
                    {selectedAlert.severity?.toUpperCase()} · {alertTypeLabels[selectedAlert.alert_type]}
                  </span>
                </div>
              </div>

              <p className="text-slate-300 mb-4">{selectedAlert.description}</p>

              <div className="space-y-3 text-sm text-slate-400 mb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedAlert.city}, {selectedAlert.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(selectedAlert.created_at!).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>{t('reliability') || '可信度'}: {selectedAlert.reliability_score || 85}%</span>
                </div>
                {selectedAlert.distance && (
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    <span>{t('distance') || '距离'}: {selectedAlert.distance}km</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Link
                  to={`/alert/${selectedAlert.id}`}
                  className="flex-1 h-12 bg-red-500/20 text-red-400 rounded-xl font-medium flex items-center justify-center hover:bg-red-500/30 transition-colors"
                >
                  {t('viewDetails') || '查看详情'}
                </Link>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="flex-1 h-12 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
