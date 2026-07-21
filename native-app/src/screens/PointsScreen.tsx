import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'Points'>;
type Wallet = { balance: number; total_earned: number; total_spent: number };
type Transaction = { id: string; amount: number; type: string; reason: string | null; created_at: string };

export function PointsScreen({ navigation }: Props) {
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, total_earned: 0, total_spent: 0 });
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const [balance, ledger] = await Promise.all([
      supabase.from('user_points').select('balance,total_earned,total_spent').eq('user_id', auth.user.id).maybeSingle(),
      supabase.from('point_transactions').select('id,amount,type,reason,created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(100),
    ]);
    if (balance.data) setWallet(balance.data as Wallet);
    setRows((ledger.data || []) as Transaction[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const redeem = (packageId: 'd7' | 'd30', planId: 'personal' | 'family', points: number, days: number) => Alert.alert('????', `?? ${points} ???? ${planId === 'family' ? '???' : '???'} ${days} ??`, [{ text: '??', style: 'cancel' }, { text: '??', onPress: async () => { setBusy(true); const { data, error } = await supabase.functions.invoke('redeem-points', { body: { packageId, planId } }); setBusy(false); if (error || !data?.success) Alert.alert('????', data?.error === 'INSUFFICIENT_POINTS' ? `??????? ${data.required} ?` : data?.error || error?.message); else { Alert.alert('????', `????? ${data.daysAdded} ?????? ${new Date(data.expiresAt).toLocaleString('zh-CN')}`); await load(); } } }]);
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.warning} size="large" /></View>;
  return <Screen title="????" subtitle="?????????" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>??</Text></Pressable>} refreshing={busy} onRefresh={() => void load()}>
    <View style={styles.wallet}><Text style={styles.balance}>{wallet.balance}</Text><Text style={styles.balanceLabel}>????</Text><View style={styles.stats}><Stat value={wallet.total_earned} label="????" /><Stat value={wallet.total_spent} label="????" /></View></View>
    <View style={styles.card}><Text style={styles.title}>????????</Text><Text style={styles.note}>?????? App Store ???????????????????? Apple ?????</Text><Package title="7???" points={500} disabled={wallet.balance < 500 || busy} onPersonal={() => redeem('d7', 'personal', 500, 7)} onFamily={() => redeem('d7', 'family', 500, 7)} /><Package title="30???" points={2000} disabled={wallet.balance < 2000 || busy} onPersonal={() => redeem('d30', 'personal', 2000, 30)} onFamily={() => redeem('d30', 'family', 2000, 30)} /></View>
    <View style={styles.card}><Text style={styles.title}>????</Text>{rows.length ? rows.map((row) => <View key={row.id} style={styles.transaction}><View style={styles.transactionBody}><Text style={styles.reason}>{row.reason || labelType(row.type)}</Text><Text style={styles.date}>{new Date(row.created_at).toLocaleString('zh-CN')}</Text></View><Text style={[styles.amount, { color: row.amount >= 0 ? colors.safe : colors.danger }]}>{row.amount >= 0 ? '+' : ''}{row.amount}</Text></View>) : <Text style={styles.empty}>???????????????????</Text>}</View>
  </Screen>;
}

function Package({ title, points, disabled, onPersonal, onFamily }: { title: string; points: number; disabled: boolean; onPersonal: () => void; onFamily: () => void }) { return <View style={styles.package}><View><Text style={styles.packageTitle}>{title}</Text><Text style={styles.packageMeta}>{points} ??</Text></View><View style={styles.packageActions}><Pressable disabled={disabled} style={[styles.redeem, disabled && styles.disabled]} onPress={onPersonal}><Text style={styles.redeemText}>???</Text></Pressable><Pressable disabled={disabled} style={[styles.redeem, disabled && styles.disabled]} onPress={onFamily}><Text style={styles.redeemText}>???</Text></Pressable></View></View>; }
function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function labelType(type: string) { return type.startsWith('earn') ? '????' : type.startsWith('spend') ? '????' : '????'; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, back: { color: colors.info, fontWeight: '800' }, wallet: { backgroundColor: '#422006', borderColor: '#F59E0B66', borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' }, balance: { color: colors.warning, fontSize: 44, fontWeight: '900' }, balanceLabel: { color: '#FDE68A' }, stats: { flexDirection: 'row', width: '100%', marginTop: spacing.lg }, stat: { flex: 1, alignItems: 'center' }, statValue: { color: colors.text, fontSize: 20, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 11 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, title: { color: colors.text, fontSize: 18, fontWeight: '900' }, note: { color: colors.muted, lineHeight: 20 }, package: { paddingVertical: spacing.md, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm }, packageTitle: { color: colors.text, fontWeight: '900' }, packageMeta: { color: colors.warning, marginTop: 4 }, packageActions: { flexDirection: 'row', gap: spacing.sm }, redeem: { flex: 1, height: 40, borderRadius: radius.sm, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.35 }, redeemText: { color: colors.background, fontWeight: '900' }, transaction: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, transactionBody: { flex: 1 }, reason: { color: colors.text, fontWeight: '800' }, date: { color: colors.muted, fontSize: 11, marginTop: 4 }, amount: { fontSize: 18, fontWeight: '900' }, empty: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg } });
