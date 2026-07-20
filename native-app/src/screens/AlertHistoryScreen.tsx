import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { AlertRow } from '../types';
import type { RootStackParams } from '../navigation/RootNavigator';
type Props = NativeStackScreenProps<RootStackParams, 'AlertHistory'>;
type Severity = 'all' | 'red' | 'orange' | 'yellow';
export function AlertHistoryScreen({ navigation }: Props) {
  const [rows, setRows] = useState<AlertRow[]>([]); const [severity, setSeverity] = useState<Severity>('all'); const [days, setDays] = useState(30);
  useEffect(() => { void supabase.from('alerts').select('id,title,description,alert_type,severity,city,country,created_at,is_active').order('created_at', { ascending: false }).limit(200).then(({ data }) => setRows((data || []) as AlertRow[])); }, []);
  const filtered = useMemo(() => rows.filter((row) => (severity === 'all' || row.severity === severity) && (!row.created_at || new Date(row.created_at).getTime() >= Date.now() - days * 86400000)), [rows, severity, days]);
  return <Screen title="预警历史" subtitle={`共 ${filtered.length} 条`} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={styles.filters}><Text style={styles.label}>危险级别</Text><View style={styles.options}>{(['all', 'red', 'orange', 'yellow'] as const).map((v) => <Filter key={v} label={{ all: '全部', red: '红色', orange: '橙色', yellow: '黄色' }[v]} active={severity === v} onPress={() => setSeverity(v)} />)}</View><Text style={styles.label}>日期范围</Text><View style={styles.options}>{[1, 7, 30, 90].map((value) => <Filter key={value} label={value === 1 ? '24小时' : `${value}天`} active={days === value} onPress={() => setDays(value)} />)}</View></View>
    {filtered.map((alert) => <Pressable key={alert.id} style={styles.card} onPress={() => navigation.navigate('AlertDetail', { alertId: alert.id })}><View style={styles.top}><Text style={[styles.level, { color: alert.severity === 'red' ? colors.danger : alert.severity === 'orange' ? colors.warning : '#EAB308' }]}>{alert.severity.toUpperCase()}</Text><Text style={styles.time}>{alert.created_at ? new Date(alert.created_at).toLocaleString('zh-CN') : ''}</Text></View><Text style={styles.title}>{alert.title}</Text><Text style={styles.meta}>{alert.alert_type} · {[alert.city, alert.country].filter(Boolean).join(' ') || '位置未知'}</Text></Pressable>)}
    {!filtered.length ? <Text style={styles.empty}>该筛选条件下没有记录</Text> : null}
  </Screen>;
}
function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable style={[styles.filter, active && styles.filterActive]} onPress={onPress}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ back: { color: colors.info, fontWeight: '800' }, filters: { backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1, padding: spacing.md, gap: spacing.sm }, label: { color: colors.muted, fontSize: 12, fontWeight: '700' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, filter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.round, backgroundColor: colors.surfaceRaised }, filterActive: { backgroundColor: colors.danger }, filterText: { color: colors.muted, fontWeight: '700' }, filterTextActive: { color: colors.white }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md }, top: { flexDirection: 'row', justifyContent: 'space-between' }, level: { fontSize: 11, fontWeight: '900' }, time: { color: colors.muted, fontSize: 11 }, title: { color: colors.text, fontWeight: '900', fontSize: 17, marginTop: spacing.sm }, meta: { color: colors.info, marginTop: 5, fontSize: 12 }, empty: { color: colors.muted, textAlign: 'center', paddingVertical: 60 } });
