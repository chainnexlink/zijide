import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bell,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Gift,
  Info,
  Megaphone,
  Clock,
  Filter
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'reward' | 'promotion' | 'info';
  priority: number;
  start_at: string;
  end_at: string;
  created_at: string;
}

type FilterType = 'all' | 'reward' | 'promotion' | 'info';

export default function Announcements() {
  const { t } = useI18n();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_at', now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order('created_at', { ascending: false });

      if (data) {
        setAnnouncements(data.map(d => ({
          id: d.id,
          title: d.title,
          content: d.content,
          type: (d.type || 'info') as Announcement['type'],
          priority: (d as any).priority ?? 0,
          start_at: d.start_at || '',
          end_at: d.end_at || '',
          created_at: d.created_at || '',
        })));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'all'
    ? announcements
    : announcements.filter(a => a.type === filter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reward': return <Gift className="w-5 h-5" />;
      case 'promotion': return <Megaphone className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'reward':
        return { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: 'text-yellow-400 bg-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-400', label: t('rewardType') || 'Reward' };
      case 'promotion':
        return { bg: 'bg-amber-500/10 border-amber-500/30', icon: 'text-amber-400 bg-amber-500/20', badge: 'bg-amber-500/20 text-amber-400', label: t('promotionType') || 'Promotion' };
      default:
        return { bg: 'bg-blue-500/10 border-blue-500/30', icon: 'text-blue-400 bg-blue-500/20', badge: 'bg-blue-500/20 text-blue-400', label: t('infoType') || 'Info' };
    }
  };

  const filterButtons: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: t('all') || 'All', color: 'bg-slate-500/20 text-slate-300' },
    { key: 'reward', label: t('rewardType') || 'Rewards', color: 'bg-yellow-500/20 text-yellow-400' },
    { key: 'promotion', label: t('promotionType') || 'Promotions', color: 'bg-amber-500/20 text-amber-400' },
    { key: 'info', label: t('infoType') || 'Info', color: 'bg-blue-500/20 text-blue-400' }
  ];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="text-white max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold">{t('announcements')}</h1>
        </div>
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} {t('itemsCount') || 'items'}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
        {filterButtons.map(fb => (
          <button
            key={fb.key}
            onClick={() => setFilter(fb.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
              filter === fb.key
                ? `${fb.color} ring-1 ring-current`
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {fb.label}
          </button>
        ))}
      </div>

      {/* Announcement List */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Bell className="w-16 h-16 mx-auto mb-4 text-slate-700" />
          <p className="text-slate-400 text-lg">{t('noAnnouncements') || 'No announcements'}</p>
          <p className="text-slate-500 text-sm mt-1">{t('checkBackLater') || 'Check back later'}</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((item, i) => {
              const style = getTypeStyle(item.type);
              const isExpanded = expandedId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border rounded-2xl overflow-hidden ${style.bg}`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full text-left p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.icon}`}>
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge}`}>
                            {style.label}
                          </span>
                          {item.priority > 5 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                              {t('pinned') || 'Pinned'}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base">{item.title}</h3>
                        {!isExpanded && item.content && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.content}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0">
                          <div className="border-t border-white/10 pt-4">
                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                              {item.content}
                            </p>
                            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                              <span>{t('fromDate') || 'From'}: {formatDate(item.start_at)}</span>
                              <span>{t('untilDate') || 'Until'}: {formatDate(item.end_at)}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
