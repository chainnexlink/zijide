import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { readOfflineCollection } from '../lib/offlinePacks';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { AlertRow } from '../types';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'AlertHistory'>;
type Severity = 'all' | 'red' | 'orange' | 'yellow';
const PAGE_SIZE = 30;

export function AlertHistoryScreen({ navigation }: Props) {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [severity, setSeverity] = useState<Severity>('all');
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async (nextPage = 0) => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let query = supabase.from('alerts').select('id,title,description,alert_type,severity,city,country,created_at,start_time,end_time,is_verified').eq('is_verified', true).gte('created_at', since).order('created_at', { ascending: false }).range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);
    if (severity !== 'all') query = query.eq('severity', severity);
    const { data, error } = await query;
    if (error) {
      const cached = (await readOfflineCollection<AlertRow>('alerts')).filter((item) => (severity === 'all' || item.severity === severity) && (!item.created_at || item.created_at >= since));
      setRows(cached);
      setHasMore(false);
      setOffline(true);
    } else {
      const batch = (data || []) as AlertRow[];
      setRows((current) => nextPage === 0 ? batch : [...current, ...batch]);
      setHasMore(batch.length === PAGE_SIZE);
      setOffline(false);
    }
    setPage(nextPage);
    setLoading(false);
  }, [days, severity]);

  useEffect(() => { void load(0); }, [load]);

  return <Screen title="预警历史" subtitle={`${offline ? '离线数据 · ' : ''}已加载 ${rows.length} 条`} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={styles.filters}><Text style={styles.label}>危险级别</Text><View style={styles.options}>{(['all', 'red', 'orange', 'yellow'] as const).map((value) => <Filter key={value} label={{ all: '全部', red: '红色', orange: '橙色', yellow: '黄色' }[value]} active={severity === value} onPress={() => setSeverity(value)} />)}</View><Text style={styles.label}>日期范围</Text><View style={styles.options}>{[1, 7, 30, 90].map((value) => <Filter key={value} label={value === 1 ? '24小时' : `${value}天`} active={days === value} onPress={() => setDays(value)} />)}</View></View>
    {rows.map((alert) => <Pressable key={alert.id} style={styles.card} onPress={() => navigation.navigate('AlertDetail', { alertId: alert.id })}><View style={styles.top}><Text style={[styles.level, { color: alert.severity === 'red' ? colors.danger : alert.severity === 'orange' ? colors.warning : '#EAB308' }]}>{alert.severity.toUpperCase()}</Text><Text style={styles.time}>{alert.created_at ? new Date(alert.created_at).toLocaleString('zh-CN') : ''}</Text></View><Text style={styles.title}>{alert.title}</Text><Text style={styles.meta}>{alert.alert_type} · {[alert.city, alert.country].filter(Boolean).join(' ') || '位置未知'}</Text></Pressable>)}
    {!rows.length && !loading ? <Text style={styles.empty}>该筛选条件下没有记录</Text> : null}
    {loading ? <ActivityIndicator color={colors.info} /> : hasMore ? <Pressable style={styles.more} onPress={() => void load(page + 1)}><Text style={styles.moreText}>加载更多</Text></Pressable> : rows.length ? <Text style={styles.end}>已加载全部记录</Text> : null}
  </Screen>;
}

function Filter({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable style={[styles.filter, active && styles.filterActive]} onPress={onPress}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ back: { color: colors.info, fontWeight: '800' }, filters: { backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1, padding: spacing.md, gap: spacing.sm }, label: { color: colors.muted, fontSize: 12, fontWeight: '700' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, filter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.round, backgroundColor: colors.surfaceRaised }, filterActive: { backgroundColor: colors.danger }, filterText: { color: colors.muted, fontWeight: '700' }, filterTextActive: { color: colors.white }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md }, top: { flexDirection: 'row', justifyContent: 'space-between' }, level: { fontSize: 11, fontWeight: '900' }, time: { color: colors.muted, fontSize: 11 }, title: { color: colors.text, fontWeight: '900', fontSize: 17, marginTop: spacing.sm }, meta: { color: colors.info, marginTop: 5, fontSize: 12 }, empty: { color: colors.muted, textAlign: 'center', paddingVertical: 60 }, more: { height: 48, borderRadius: radius.md, borderColor: colors.info, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, moreText: { color: colors.info, fontWeight: '900' }, end: { color: colors.muted, textAlign: 'center' } });
