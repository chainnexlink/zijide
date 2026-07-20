import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'SOSHistory'>;
type SOSRow = { id: string; status: string; trigger_method: string | null; address: string | null; stage: number | null; created_at: string | null };

export function SOSHistoryScreen({ navigation }: Props) {
  const [records, setRecords] = useState<SOSRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const result = await supabase.from('sos_records').select('id,status,trigger_method,address,stage,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false });
    setRecords((result.data || []) as SOSRow[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const stats = useMemo(() => ({ total: records.length, completed: records.filter((r) => ['completed', 'rescued'].includes(r.status)).length, active: records.filter((r) => r.status === 'active').length }), [records]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  return (
    <Screen title="SOS 历史" subtitle="真实求救状态记录" refreshing={refreshing} onRefresh={refresh} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
      <View style={styles.stats}><Stat value={stats.total} label="全部" /><Stat value={stats.completed} label="已安全" tone={colors.safe} /><Stat value={stats.active} label="处理中" tone={colors.warning} /></View>
      {records.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>暂无 SOS 记录</Text><Text style={styles.emptyText}>发生真实危险时，请在 SOS 页长按求救按钮。</Text></View> : records.map((record) => <View key={record.id} style={styles.card}><View style={styles.row}><Text style={[styles.status, { color: statusColor(record.status) }]}>{statusLabel(record.status)}</Text><Text style={styles.time}>{record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : ''}</Text></View><Text style={styles.address}>{record.address || '位置未确认'}</Text><Text style={styles.meta}>{record.trigger_method === 'auto' ? '自动触发' : record.trigger_method === 'voice' ? '语音触发' : '手动触发'} · 救援阶段 {record.stage || 1}/5</Text></View>)}
    </Screen>
  );
}
function Stat({ value, label, tone = colors.text }: { value: number; label: string; tone?: string }) { return <View style={styles.stat}><Text style={[styles.statValue, { color: tone }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function statusLabel(status: string) { return ({ active: '处理中', completed: '已完成', rescued: '已获救', timeout: '已超时', cancelled: '已取消' } as Record<string, string>)[status] || status; }
function statusColor(status: string) { return status === 'active' ? colors.danger : ['completed', 'rescued'].includes(status) ? colors.safe : colors.muted; }
const styles = StyleSheet.create({ back: { color: colors.info, fontWeight: '800' }, stats: { flexDirection: 'row', gap: spacing.sm }, stat: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' }, statValue: { fontSize: 24, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, status: { fontWeight: '900' }, time: { color: colors.muted, fontSize: 11 }, address: { color: colors.text, fontWeight: '700', marginTop: spacing.md }, meta: { color: colors.muted, fontSize: 12, marginTop: 6 }, empty: { paddingVertical: 70, alignItems: 'center' }, emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 17 }, emptyText: { color: colors.muted, marginTop: spacing.sm, textAlign: 'center' } });
