import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [actingId, setActingId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const result = await supabase.from('sos_records').select('id,status,trigger_method,address,stage,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false });
    setRecords((result.data || []) as SOSRow[]);
  }, []);
  useEffect(() => {
    void load();
    const channel = supabase.channel('native-sos-history').on('postgres_changes', { event: '*', schema: 'public', table: 'sos_records' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);
  const stats = useMemo(() => ({ total: records.length, completed: records.filter((r) => ['completed', 'rescued'].includes(r.status)).length, active: records.filter((r) => r.status === 'active').length }), [records]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const act = (record: SOSRow, action: 'cancel' | 'resolve' | 'escalate') => {
    const labels = { cancel: '取消求救', resolve: '确认我已安全', escalate: '升级求救' };
    Alert.alert(labels[action], action === 'resolve' ? '确认后会通知救援人员本次求救已经解除。' : '确定执行此操作吗？', [
      { text: '返回', style: 'cancel' },
      { text: '确定', style: action === 'cancel' ? 'destructive' : 'default', onPress: () => void runAction(record, action) },
    ]);
  };
  const runAction = async (record: SOSRow, action: 'cancel' | 'resolve' | 'escalate') => {
    setActingId(record.id);
    const { data, error } = await supabase.functions.invoke('sos-service', { body: { action, sosId: record.id } });
    setActingId(null);
    if (error || !data?.success) Alert.alert('操作失败', data?.error || error?.message || '请稍后重试');
    else await load();
  };
  return (
    <Screen title="SOS 历史" subtitle="真实求救状态记录" refreshing={refreshing} onRefresh={refresh} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
      <View style={styles.stats}><Stat value={stats.total} label="全部" /><Stat value={stats.completed} label="已安全" tone={colors.safe} /><Stat value={stats.active} label="处理中" tone={colors.warning} /></View>
      {records.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>暂无 SOS 记录</Text><Text style={styles.emptyText}>发生真实危险时，请在 SOS 页长按求救按钮。</Text></View> : records.map((record) => <View key={record.id} style={styles.card}><View style={styles.row}><Text style={[styles.status, { color: statusColor(record.status) }]}>{statusLabel(record.status)}</Text><Text style={styles.time}>{record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : ''}</Text></View><Text style={styles.address}>{record.address || '位置未确认'}</Text><Text style={styles.meta}>{record.trigger_method === 'auto' ? '自动触发' : record.trigger_method === 'voice' ? '语音触发' : '手动触发'} · 救援阶段 {record.stage || 1}/3</Text>{record.status === 'active' ? <View style={styles.actions}>{actingId === record.id ? <ActivityIndicator color={colors.danger} /> : <><Action label="升级求救" tone={colors.warning} onPress={() => act(record, 'escalate')} /><Action label="确认安全" tone={colors.safe} onPress={() => act(record, 'resolve')} /><Action label="取消" tone={colors.danger} onPress={() => act(record, 'cancel')} /></>}</View> : null}</View>)}
    </Screen>
  );
}
function Stat({ value, label, tone = colors.text }: { value: number; label: string; tone?: string }) { return <View style={styles.stat}><Text style={[styles.statValue, { color: tone }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Action({ label, tone, onPress }: { label: string; tone: string; onPress: () => void }) { return <Pressable style={[styles.action, { borderColor: tone }]} onPress={onPress}><Text style={[styles.actionText, { color: tone }]}>{label}</Text></Pressable>; }
function statusLabel(status: string) { return ({ active: '处理中', completed: '已完成', rescued: '已获救', timeout: '已超时', cancelled: '已取消' } as Record<string, string>)[status] || status; }
function statusColor(status: string) { return status === 'active' ? colors.danger : ['completed', 'rescued'].includes(status) ? colors.safe : colors.muted; }
const styles = StyleSheet.create({ back: { color: colors.info, fontWeight: '800' }, stats: { flexDirection: 'row', gap: spacing.sm }, stat: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' }, statValue: { fontSize: 24, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 12, marginTop: 4 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, status: { fontWeight: '900' }, time: { color: colors.muted, fontSize: 11 }, address: { color: colors.text, fontWeight: '700', marginTop: spacing.md }, meta: { color: colors.muted, fontSize: 12, marginTop: 6 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' }, action: { minHeight: 38, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, actionText: { fontWeight: '800', fontSize: 12 }, empty: { paddingVertical: 70, alignItems: 'center' }, emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 17 }, emptyText: { color: colors.muted, marginTop: spacing.sm, textAlign: 'center' } });
