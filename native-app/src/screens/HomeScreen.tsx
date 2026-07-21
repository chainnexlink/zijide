import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { AlertRow } from '../types';

type TabParams = { Home: undefined; Alerts: undefined; SOS: undefined; Shelters: undefined; Profile: undefined };
type Props = BottomTabScreenProps<TabParams, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [shelterCount, setShelterCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [alertsResult, sheltersResult] = await Promise.all([
      supabase.from('alerts').select('id,title,description,alert_type,severity,city,country,created_at,is_active').eq('is_active', true).order('created_at', { ascending: false }).limit(3),
      supabase.from('shelters').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    setAlerts((alertsResult.data || []) as AlertRow[]);
    setShelterCount(sheltersResult.count || 0);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const danger = alerts.some((alert) => alert.severity === 'red');

  return (
    <Screen title="WarRescue" subtitle="???????" refreshing={refreshing} onRefresh={refresh}>
      <View style={[styles.status, danger ? styles.statusDanger : styles.statusSafe]}>
        <View style={[styles.pulse, { backgroundColor: danger ? colors.danger : colors.safe }]} />
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>{danger ? '????????' : '????????'}</Text>
          <Text style={styles.statusSub}>{danger ? '??????????????' : '???????????????'}</Text>
        </View>
      </View>

      <View style={styles.quickGrid}>
        <Quick title="????" value={`${alerts.length} ?`} tone={colors.danger} onPress={() => navigation.navigate('Alerts')} />
        <Quick title="?????" value={`${shelterCount} ?`} tone={colors.safe} onPress={() => navigation.navigate('Shelters')} />
        <Quick title="?? SOS" value="????" tone={colors.warning} onPress={() => navigation.navigate('SOS')} />
        <Quick title="????" value="????" tone={colors.info} onPress={() => navigation.navigate('Profile')} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>????</Text>
        <Pressable onPress={() => navigation.navigate('Alerts')}><Text style={styles.link}>????</Text></Pressable>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>????????</Text><Text style={styles.emptySub}>???????????</Text></View>
      ) : alerts.map((alert) => <AlertPreview key={alert.id} alert={alert} />)}
    </Screen>
  );
}

function Quick({ title, value, tone, onPress }: { title: string; value: string; tone: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quick} onPress={onPress}>
      <View style={[styles.quickDot, { backgroundColor: tone }]} />
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickValue}>{value}</Text>
    </Pressable>
  );
}

function AlertPreview({ alert }: { alert: AlertRow }) {
  const tone = alert.severity === 'red' ? colors.danger : alert.severity === 'orange' ? colors.warning : colors.info;
  return (
    <View style={styles.alertCard}>
      <View style={[styles.alertBar, { backgroundColor: tone }]} />
      <View style={styles.alertBody}>
        <View style={styles.alertTop}><Text style={styles.alertTitle}>{alert.title}</Text><Text style={[styles.badge, { color: tone }]}>{alert.severity.toUpperCase()}</Text></View>
        <Text style={styles.alertMeta}>{[alert.city, alert.country].filter(Boolean).join(' ? ') || '?????'}</Text>
        {alert.description ? <Text style={styles.alertDescription} numberOfLines={2}>{alert.description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  statusSafe: { backgroundColor: '#052E1A', borderColor: '#166534' },
  statusDanger: { backgroundColor: '#3F0B12', borderColor: '#991B1B' },
  pulse: { width: 14, height: 14, borderRadius: 7 },
  statusText: { flex: 1, marginLeft: spacing.md },
  statusTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statusSub: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quick: { width: '48.5%', minHeight: 110, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  quickDot: { width: 9, height: 9, borderRadius: 5, marginBottom: spacing.md },
  quickTitle: { color: colors.muted, fontSize: 13 },
  quickValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  link: { color: colors.info, fontWeight: '700' },
  empty: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontWeight: '700' },
  emptySub: { color: colors.muted, marginTop: 5 },
  alertCard: { flexDirection: 'row', overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  alertBar: { width: 5 },
  alertBody: { flex: 1, padding: spacing.md },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  alertTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
  badge: { fontSize: 11, fontWeight: '900' },
  alertMeta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  alertDescription: { color: '#CBD5E1', fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
});
