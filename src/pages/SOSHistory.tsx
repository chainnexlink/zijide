import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Siren,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Activity,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';
import type { Tables } from '../supabase/types';

type SOSRecord = Tables<'sos_records'>;

const statusIcons: Record<string, { color: string; icon: React.ElementType }> = {
  active: { color: 'text-red-400', icon: Activity },
  completed: { color: 'text-green-400', icon: CheckCircle },
  timeout: { color: 'text-amber-400', icon: Clock },
  rescued: { color: 'text-blue-400', icon: CheckCircle },
  cancelled: { color: 'text-slate-400', icon: AlertCircle }
};

export default function SOSHistory() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    active: { label: t('sosInProgress') || 'In Progress', ...statusIcons.active },
    completed: { label: t('sosConfirmedSafe') || 'Confirmed Safe', ...statusIcons.completed },
    timeout: { label: t('sosTimeout') || 'Timeout', ...statusIcons.timeout },
    rescued: { label: t('sosRescued') || 'Rescued', ...statusIcons.rescued },
    cancelled: { label: t('sosCancelled') || 'Cancelled', ...statusIcons.cancelled }
  };

  const triggerMethodLabels: Record<string, string> = {
    manual: t('triggerManual') || 'Manual',
    auto: t('triggerAuto') || 'Auto',
    voice: t('triggerVoice') || 'Voice'
  };
  const [sosRecords, setSOSRecords] = useState<SOSRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSOSHistory();
  }, []);

  const fetchSOSHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('sos_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setSOSRecords(data);
      setStats({
        total: data.length,
        completed: data.filter(r => r.status === 'completed' || r.status === 'rescued').length,
        pending: data.filter(r => r.status === 'active').length
      });
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xl font-bold">{t('sosHistory') || 'SOS History'}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-slate-400">{t('totalSOS') || 'Total'}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-sm text-slate-400">{t('confirmedSafe') || 'Confirmed Safe'}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
            <p className="text-sm text-slate-400">{t('toBeConfirmed') || 'Pending'}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {sosRecords.length === 0 ? (
            <div className="text-center py-20">
              <Siren className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">{t('noSOSRecords') || 'No SOS records'}</p>
            </div>
          ) : (
            sosRecords.map((record, index) => {
              const config = statusConfig[record.status] || statusConfig.cancelled;
              const Icon = config.icon;
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      record.status === 'active' ? 'bg-red-500/20' : 'bg-slate-700'
                    }`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full bg-slate-700 ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {triggerMethodLabels[record.trigger_method]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-1">
                        {record.address || (t('unknownLocation') || 'Unknown location')}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{new Date(record.created_at || '').toLocaleString()}</span>
                        {record.stage && (
                          <span>{t('stageLabel') || 'Stage'} {record.stage}/5</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </main>
    </div>
  );
}
