import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

let channelCounter = 0;

type TableName = 'alerts' | 'sos_records' | 'family_members' | 'announcements' | 'rescue_pending';
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  table: TableName;
  event?: EventType;
  filter?: string;         // e.g. "user_id=eq.xxx"
  onData: (payload: RealtimePostgresChangesPayload<any>) => void;
}

/**
 * useRealtime - Subscribe to Supabase Realtime postgres changes.
 */
export function useRealtime(subscriptions: SubscriptionConfig[]) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    channelsRef.current.forEach(ch => {
      try { supabase.removeChannel(ch); } catch {}
    });
    channelsRef.current = [];

    for (const sub of subscriptions) {
      try {
        const channelName = `rt-${sub.table}-${sub.event || '*'}-${++channelCounter}`;
        const channelConfig: any = {
          event: sub.event || '*',
          schema: 'public',
          table: sub.table,
        };
        if (sub.filter) channelConfig.filter = sub.filter;

        const channel = supabase
          .channel(channelName)
          .on('postgres_changes', channelConfig, (payload: any) => {
            sub.onData(payload);
          })
          .subscribe();

        channelsRef.current.push(channel);
      } catch {}
    }

    return () => {
      channelsRef.current.forEach(ch => {
        try { supabase.removeChannel(ch); } catch {}
      });
      channelsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(subscriptions.map(s => ({ t: s.table, e: s.event, f: s.filter })))]);
}

/**
 * useRealtimeAlerts - Convenience hook for alert subscriptions.
 * Calls onNewAlert whenever a new alert is inserted.
 */
export function useRealtimeAlerts(onNewAlert: (alert: any) => void) {
  const onDataRef = useRef(onNewAlert);
  onDataRef.current = onNewAlert;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch {}

      try {
        const channel = supabase
          .channel(`rt-alerts-insert-${++channelCounter}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'alerts',
          }, (payload: any) => {
            if (!cancelled) onDataRef.current(payload.new);
          });
        channelRef.current = channel;
        channel.subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' && !cancelled) {
            setTimeout(() => setup(), 5000);
          }
        });
      } catch {}
    };

    setup();

    const handleOnline = () => setup();
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch {}
    };
  }, []);
}

/**
 * useRealtimeSOS - Subscribe to SOS record changes for a specific user.
 */
export function useRealtimeSOS(userId: string | undefined, onSOSChange: (record: any, eventType: string) => void) {
  const cbRef = useRef(onSOSChange);
  cbRef.current = onSOSChange;

  useEffect(() => {
    if (!userId) return;

    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase
        .channel(`rt-sos-${userId}-${++channelCounter}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'sos_records',
          filter: `user_id=eq.${userId}`,
        }, (payload: any) => {
          cbRef.current(payload.new || payload.old, payload.eventType);
        })
        .subscribe();
    } catch {}

    return () => {
      try { if (channel) supabase.removeChannel(channel); } catch {}
    };
  }, [userId]);
}

/**
 * useRealtimeFamily - Subscribe to family member status changes.
 */
export function useRealtimeFamily(familyId: string | undefined, onMemberChange: (member: any) => void) {
  const cbRef = useRef(onMemberChange);
  cbRef.current = onMemberChange;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch {}

      try {
        const channel = supabase
          .channel(`rt-family-${familyId}-${++channelCounter}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'family_members',
            filter: `family_id=eq.${familyId}`,
          }, (payload: any) => {
            if (!cancelled) cbRef.current(payload.new || payload.old);
          });
        channelRef.current = channel;
        channel.subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' && !cancelled) {
            setTimeout(() => setup(), 5000);
          }
        });
      } catch {}
    };

    setup();

    const handleOnline = () => setup();
    window.addEventListener('online', handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      try {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch {}
    };
  }, [familyId]);
}
