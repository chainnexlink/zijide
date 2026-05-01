import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
 * 
 * Usage:
 *   useRealtime([
 *     { table: 'alerts', event: 'INSERT', onData: (p) => handleNewAlert(p.new) },
 *     { table: 'sos_records', filter: `user_id=eq.${userId}`, onData: handleSOS },
 *   ]);
 */
export function useRealtime(subscriptions: SubscriptionConfig[]) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    // Clean up previous channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    for (const sub of subscriptions) {
      const channelName = `rt-${sub.table}-${sub.event || '*'}-${sub.filter || 'all'}-${Date.now()}`;
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
    }

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
    // We stringify subscriptions config to detect actual changes
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
    const subscribe = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = supabase
        .channel('rt-alerts-insert-' + Date.now())
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        }, (payload: any) => {
          onDataRef.current(payload.new);
        })
        .subscribe();
    };

    subscribe();

    // Re-subscribe when network comes back online
    const handleOnline = () => subscribe();
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
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

    const channel = supabase
      .channel(`rt-sos-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sos_records',
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        cbRef.current(payload.new || payload.old, payload.eventType);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

    const subscribe = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = supabase
        .channel(`rt-family-${familyId}-${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'family_members',
          filter: `family_id=eq.${familyId}`,
        }, (payload: any) => {
          cbRef.current(payload.new || payload.old);
        })
        .subscribe();
    };

    subscribe();

    const handleOnline = () => subscribe();
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [familyId]);
}
