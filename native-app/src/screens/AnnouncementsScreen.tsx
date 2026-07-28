import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen'; import { supabase } from '../lib/supabase'; import { colors, radius, spacing } from '../theme'; import type { RootStackParams } from '../navigation/RootNavigator';
type Props = NativeStackScreenProps<RootStackParams, 'Announcements'>; type Row = { id: string; title: string; content: string; type: string; created_at: string };
export function AnnouncementsScreen({ navigation }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('announcements').select('id,title,content,type,created_at').eq('is_active', true).order('created_at', { ascending: false });
    if (error) setErrorMessage('公告加载失败，请检查网络后重试。');
    else {
      setRows((data || []) as Row[]);
      setErrorMessage('');
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading && !rows.length) return <View style={styles.loading}><ActivityIndicator color={colors.info} /></View>;
  return <Screen title="公告与安全资讯" subtitle="平台通知和重要说明" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>} refreshing={loading} onRefresh={() => void load()}>
    {errorMessage ? <View style={styles.error}><Text style={styles.errorText}>{errorMessage}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>重新加载</Text></Pressable></View> : null}
    {rows.map((row) => <Pressable key={row.id} style={styles.card} onPress={() => navigation.navigate('AnnouncementDetail', { announcement: row })}><Text style={[styles.type, { color: row.type === 'critical' ? colors.danger : row.type === 'warning' ? colors.warning : colors.info }]}>{row.type.toUpperCase()}</Text><Text style={styles.title}>{row.title}</Text><Text style={styles.preview} numberOfLines={3}>{row.content}</Text><Text style={styles.date}>{new Date(row.created_at).toLocaleString('zh-CN')}</Text></Pressable>)}
    {!rows.length && !errorMessage ? <Text style={styles.empty}>暂无公告</Text> : null}
  </Screen>;
}
const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, back: { color: colors.info, fontWeight: '800' }, error: { backgroundColor: '#7F1D1D44', borderColor: colors.danger, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }, errorText: { color: '#FECACA' }, retry: { color: colors.info, fontWeight: '900' }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm }, type: { fontSize: 11, fontWeight: '900' }, title: { color: colors.text, fontSize: 19, fontWeight: '900' }, preview: { color: '#CBD5E1', lineHeight: 21 }, date: { color: colors.muted, fontSize: 11 }, empty: { color: colors.muted, textAlign: 'center', paddingVertical: 60 } });
