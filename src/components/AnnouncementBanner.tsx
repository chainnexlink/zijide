import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullhorn, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'critical';
  created_at: string | null;
}

export default function AnnouncementBanner() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('dismissedAnnouncements');
    if (saved) {
      setDismissed(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (announcements.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [announcements.length]);

  async function fetchAnnouncements() {
    try {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .lte('start_at', now)
        .or(`end_at.is.null,end_at.gte.${now}`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        const filtered = data
          .filter((a) => !dismissed.includes(a.id))
          .map((a) => ({ ...a, type: (a.type || 'info') as Announcement['type'] }));
        setAnnouncements(filtered);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss(id: string) {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    if (currentIndex >= announcements.length - 1) {
      setCurrentIndex(0);
    }
  }

  const current = announcements[currentIndex];
  if (loading || announcements.length === 0 || !current) return null;

  const typeStyles = {
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-100',
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-100',
    critical: 'bg-red-500/20 border-red-500/30 text-red-100'
  };

  const iconColors = {
    info: 'text-blue-400',
    warning: 'text-amber-400',
    critical: 'text-red-400'
  };

  return (
    <div className={`w-full border-b ${typeStyles[current.type]} backdrop-blur-sm`}>
      <div className="max-w-7xl mx-auto px-4 py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between gap-3"
          >
            <div
              onClick={() => navigate('/announcements')}
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            >
              <FontAwesomeIcon
                icon={faBullhorn}
                className={`text-sm ${iconColors[current.type]} flex-shrink-0`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {current.title}
                </p>
                {current.content && (
                  <p className="text-xs opacity-80 truncate hidden sm:block">
                    {current.content}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {announcements.length > 1 && (
                <span className="text-xs opacity-60">
                  {currentIndex + 1}/{announcements.length}
                </span>
              )}
              <button
                onClick={() => handleDismiss(current.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
