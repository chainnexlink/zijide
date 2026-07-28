import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'InviteFriends'>;
type Referral = { id: string; created_at: string };
export function InviteFriendsScreen({ navigation }: Props) {
  const [code, setCode] = useState(''); const [count, setCount] = useState(0); const [coupons, setCoupons] = useState(0); const [history, setHistory] = useState<Referral[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error('登录已失效，请重新登录。');
      const [result, rows] = await Promise.all([
        supabase.functions.invoke('apple-iap', { body: { action: 'get-referral' } }),
        supabase.from('referrals').select('id,created_at').eq('referrer_id', auth.user.id).order('created_at', { ascending: false }),
      ]);
      if (result.error || result.data?.error) throw new Error(result.data?.error || result.error?.message || '推荐信息加载失败');
      if (rows.error) throw rows.error;
      setCode(result.data.code || '');
      setCount(result.data.referredCount || 0);
      setCoupons(result.data.availableCoupons || 0);
      setHistory((rows.data || []) as Referral[]);
    } catch (error) {
      Alert.alert('邀请信息加载失败', error instanceof Error ? error.message : '请检查网络后重试。');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const link = `https://waralarms.com/invite?code=${code}`; const message = `加入 WarRescue，让紧急预警和救援更及时。我的邀请码：${code}\n${link}`;
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.info} size="large" /></View>;
  return <Screen title="邀请好友" subtitle="分享安全，也获得订阅奖励" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>} refreshing={loading} onRefresh={() => void load()}>
    <View style={styles.info}><Text style={styles.infoTitle}>邀请奖励规则</Text><Text style={styles.infoText}>每成功邀请 1 位好友注册，你会获得 1 张当月订阅 5 折券；被邀请人不获得价格优惠。优惠券不可叠加。</Text></View>
    <View style={styles.codeCard}><Text style={styles.label}>我的邀请码</Text><Text style={styles.code}>{code || '生成中'}</Text><Pressable onPress={() => void Clipboard.setStringAsync(code)}><Text style={styles.copy}>复制邀请码</Text></Pressable><Text style={styles.link}>{link}</Text><View style={styles.actions}><Pressable style={styles.secondary} onPress={() => void Clipboard.setStringAsync(link)}><Text style={styles.secondaryText}>复制链接</Text></Pressable><Pressable style={styles.primary} onPress={() => void Share.share({ message })}><Text style={styles.primaryText}>分享邀请</Text></Pressable></View></View>
    <View style={styles.stats}><Stat value={count} label="成功注册" /><Stat value={coupons} label="可用5折券" /></View>
    <View style={styles.card}><Text style={styles.title}>邀请记录</Text>{history.length ? history.map((item, index) => <View key={item.id} style={styles.record}><Text style={styles.recordTitle}>好友 {index + 1} 已成功注册</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString('zh-CN')}</Text></View>) : <Text style={styles.empty}>还没有成功邀请记录</Text>}</View>
  </Screen>;
}
function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, back: { color: colors.info, fontWeight: '800' }, info: { backgroundColor: '#172554', borderColor: '#3B82F666', borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm }, infoTitle: { color: '#BFDBFE', fontSize: 18, fontWeight: '900' }, infoText: { color: '#DBEAFE', lineHeight: 22 }, codeCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.md }, label: { color: colors.muted }, code: { color: colors.warning, fontSize: 35, fontWeight: '900', letterSpacing: 5 }, copy: { color: colors.info, fontWeight: '900' }, link: { color: colors.muted, fontSize: 12, textAlign: 'center' }, actions: { flexDirection: 'row', gap: spacing.sm, width: '100%' }, primary: { flex: 1, height: 46, backgroundColor: colors.info, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.background, fontWeight: '900' }, secondary: { flex: 1, height: 46, borderColor: colors.info, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: colors.info, fontWeight: '900' }, stats: { flexDirection: 'row', gap: spacing.sm }, stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' }, statValue: { color: colors.safe, fontSize: 26, fontWeight: '900' }, statLabel: { color: colors.muted, marginTop: 4 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, title: { color: colors.text, fontSize: 18, fontWeight: '900' }, record: { paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, recordTitle: { color: colors.text, fontWeight: '800' }, date: { color: colors.muted, fontSize: 11, marginTop: 4 }, empty: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg } });
