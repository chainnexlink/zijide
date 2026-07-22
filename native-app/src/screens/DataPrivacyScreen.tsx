import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import type { RootStackParams } from '../navigation/RootNavigator';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParams, 'DataPrivacy'>;
type Feedback = { id: string; category: string; content: string; status: string; created_at: string };

export function DataPrivacyScreen({ navigation }: Props) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const { data } = await supabase.from('user_feedback').select('id,category,content,status,created_at').order('created_at', { ascending: false }).limit(20); setFeedback((data || []) as Feedback[]); }, []);
  useEffect(() => { void load(); }, [load]);

  const exportData = async () => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('登录已失效');
      const id = auth.user.id;
      const [profile, alerts, preferences, locations, sos, points, transactions, referrals, feedbackRows] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('user_alert_settings').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('user_preferences').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('monitored_locations').select('*').eq('user_id', id),
        supabase.from('sos_records').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('user_points').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('point_transactions').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('referrals').select('*').or(`referrer_id.eq.${id},referred_user_id.eq.${id}`),
        supabase.from('user_feedback').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      ]);
      const failed = [profile, alerts, preferences, locations, sos, points, transactions, referrals, feedbackRows].find((result) => result.error);
      if (failed?.error) throw failed.error;
      const payload = {
        exported_at: new Date().toISOString(),
        account: { id, email: auth.user.email, phone: auth.user.phone, created_at: auth.user.created_at },
        profile: profile.data,
        alert_settings: alerts.data,
        app_preferences: preferences.data,
        monitored_locations: locations.data,
        sos_history: sos.data,
        points: points.data,
        point_transactions: transactions.data,
        referrals: referrals.data,
        feedback: feedbackRows.data,
      };
      const path = `${FileSystem.cacheDirectory}WarRescue-data-${new Date().toISOString().slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
      if (!(await Sharing.isAvailableAsync())) throw new Error('当前设备不支持文件分享');
      await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: '导出 WarRescue 个人数据' });
    } catch (error) {
      Alert.alert('导出失败', error instanceof Error ? error.message : '请检查网络后重试');
    } finally { setBusy(false); }
  };

  return <Screen title="数据与隐私" subtitle="查看、导出和管理个人数据" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={styles.card}><Text style={styles.title}>导出个人数据</Text><Text style={styles.body}>生成 JSON 文件，包括账号资料、预警设置、关注地点、SOS 历史、积分、邀请和反馈记录。文件只通过系统分享面板交给你。</Text><Pressable style={styles.primary} onPress={() => void exportData()} disabled={busy}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>生成并分享数据副本</Text>}</Pressable></View>
    <View style={styles.card}><Text style={styles.title}>我的反馈记录</Text>{feedback.map((row) => <View key={row.id} style={styles.feedback}><View style={styles.feedbackHeader}><Text style={styles.category}>{row.category}</Text><Text style={styles.status}>{statusLabel(row.status)}</Text></View><Text style={styles.content} numberOfLines={3}>{row.content}</Text><Text style={styles.date}>{new Date(row.created_at).toLocaleString('zh-CN')}</Text></View>)}{!feedback.length ? <Text style={styles.body}>暂无反馈记录。</Text> : null}<Pressable style={styles.outline} onPress={() => navigation.navigate('HelpSupport')}><Text style={styles.outlineText}>提交新反馈</Text></Pressable></View>
    <View style={styles.card}><Text style={styles.title}>隐私与账号</Text><Action label="查看隐私政策" onPress={() => navigation.navigate('LegalDocument', { kind: 'privacy' })} /><Action label="账号安全与永久注销" onPress={() => navigation.navigate('AccountSecurity')} /></View>
  </Screen>;
}

function statusLabel(status: string) { return ({ new: '已提交', reviewing: '处理中', resolved: '已解决', closed: '已关闭' } as Record<string, string>)[status] || status; }
function Action({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable style={styles.action} onPress={onPress}><Text style={styles.actionText}>{label}</Text><Text style={styles.chevron}>›</Text></Pressable>; }
const styles = StyleSheet.create({
  back: { color: colors.info, fontWeight: '800' }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, title: { color: colors.text, fontSize: 18, fontWeight: '900' }, body: { color: colors.muted, lineHeight: 21 }, primary: { height: 50, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.white, fontWeight: '900' }, feedback: { paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between' }, category: { color: colors.info, fontWeight: '900' }, status: { color: colors.safe, fontSize: 12, fontWeight: '800' }, content: { color: colors.text, lineHeight: 20, marginTop: spacing.xs }, date: { color: colors.muted, fontSize: 11, marginTop: spacing.xs }, outline: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.info, alignItems: 'center', justifyContent: 'center' }, outlineText: { color: colors.info, fontWeight: '900' }, action: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, actionText: { color: colors.text, flex: 1, fontWeight: '800' }, chevron: { color: colors.muted, fontSize: 25 },
});
