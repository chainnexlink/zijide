import { useState, useEffect, useCallback, useRef } from 'react';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'alert' | 'sos' | 'family' | 'system';
  severity?: 'red' | 'orange' | 'yellow';
  data?: any;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  permission: NotificationPermission | 'unsupported';
  notifications: AppNotification[];
  unreadCount: number;
}

const STORAGE_KEY = 'wa_notifications';
const MAX_STORED = 100;

function loadStored(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveStored(list: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
}

// Sound for alerts
let audioCtx: AudioContext | null = null;
function playAlertSound(severity: string) {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    // Red = high-low siren, orange = beep-beep, yellow = single beep
    if (severity === 'red') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } else if (severity === 'orange') {
      osc.type = 'square';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch { /* audio not available */ }
}

export function useNotification() {
  const [state, setState] = useState<NotificationState>({
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
    notifications: loadStored(),
    unreadCount: loadStored().filter(n => !n.read).length,
  });
  const listRef = useRef(state.notifications);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported' as const;
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    setState(prev => ({ ...prev, permission: result }));
    return result;
  }, []);

  // Push a new notification (internal + browser native)
  const pushNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      timestamp: Date.now(),
      read: false,
    };

    const updated = [newNotif, ...listRef.current].slice(0, MAX_STORED);
    listRef.current = updated;
    saveStored(updated);
    setState(prev => ({
      ...prev,
      notifications: updated,
      unreadCount: updated.filter(n => !n.read).length,
    }));

    // Browser native notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const icon = notif.type === 'alert' ? '/alert-icon.png' : '/sos-icon.png';
        const tag = `wa-${notif.type}-${newNotif.id}`;
        new Notification(notif.title, {
          body: notif.body,
          icon,
          tag,
          requireInteraction: notif.severity === 'red',
          silent: false,
        });
      } catch { /* fallback: no native notification */ }
    }

    // Play sound for alerts
    if (notif.type === 'alert' || notif.type === 'sos') {
      playAlertSound(notif.severity || 'yellow');
    }

    return newNotif;
  }, []);

  // Mark single as read
  const markRead = useCallback((id: string) => {
    const updated = listRef.current.map(n => n.id === id ? { ...n, read: true } : n);
    listRef.current = updated;
    saveStored(updated);
    setState(prev => ({
      ...prev,
      notifications: updated,
      unreadCount: updated.filter(n => !n.read).length,
    }));
  }, []);

  // Mark all as read
  const markAllRead = useCallback(() => {
    const updated = listRef.current.map(n => ({ ...n, read: true }));
    listRef.current = updated;
    saveStored(updated);
    setState(prev => ({ ...prev, notifications: updated, unreadCount: 0 }));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    listRef.current = [];
    saveStored([]);
    setState(prev => ({ ...prev, notifications: [], unreadCount: 0 }));
  }, []);

  return {
    ...state,
    requestPermission,
    pushNotification,
    markRead,
    markAllRead,
    clearAll,
  };
}
