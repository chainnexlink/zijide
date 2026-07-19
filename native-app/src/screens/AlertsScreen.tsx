import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { AlertRow } from '../types';

export function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('alerts').select('id,title,description,alert_type,severity,city,country,created_at,is_active').order('created_at', { ascending: false }).limit(50);
    setAlerts((data || []) as AlertRow[]);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel('native-alerts').on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <Screen title="预警中心" subtitle="按时间与危险级别实时更新" refreshing={refreshing} onRefresh={refresh}>
      {alerts.length === 0 ? <Text style={styles.empty}>暂时没有预警记录</Text> : alerts.map((alert) => {
        const tone = alert.severity === 'red' ? colors.danger : alert.severity === 'orange' ? colors.warning : colors.info;
        return (
          <View key={alert.id} style={styles.card}>
            <View style={styles.top}>
              <View style={[styles.level, { backgroundColor: `${tone}22`, borderColor: tone }]}><Text style={[styles.levelText, { color: tone }]}>{alert.severity.toUpperCase()}</Text></View>
              <Text style={styles.time}>{formatTime(alert.created_at)}</Text>
            </View>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.location}>{[alert.city, alert.country].filter(Boolean).join(' · ') || '位置未知'} · {alert.alert_type}</Text>
            {alert.description ? <Text style={styles.description}>{alert.description}</Text> : null}
          </View>
        );
      })}
    </Screen>
  );
}

function formatTime(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { borderWidth: 1, borderRadius: radius.round, paddingHorizontal: 9, paddingVertical: 4 },
  levelText: { fontSize: 10, fontWeight: '900' },
  time: { color: colors.muted, fontSize: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  location: { color: colors.info, fontSize: 13, marginTop: 5 },
  description: { color: '#CBD5E1', lineHeight: 20, marginTop: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center', paddingTop: 60 },
});
