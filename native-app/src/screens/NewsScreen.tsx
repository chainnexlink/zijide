import { useCallback, useEffect, useState } from 'react'; import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'; import type { NativeStackScreenProps } from '@react-navigation/native-stack'; import { Screen } from '../components/Screen'; import { supabase } from '../lib/supabase'; import { colors, radius, spacing } from '../theme'; import type { RootStackParams } from '../navigation/RootNavigator';
type Props = NativeStackScreenProps<RootStackParams, 'News'>; export type NewsRow = { id: string; title: string; summary: string | null; content: string; category: string; author: string | null; tags: string[]; published_at: string; view_count: number };
export function NewsScreen({ navigation }: Props) {
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('safety_news').select('*').eq('is_published', true).order('published_at', { ascending: false });
    if (error) setErrorMessage('安全资讯加载失败，请检查网络后重试。');
    else {
      setRows((data || []) as NewsRow[]);
      setErrorMessage('');
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading && !rows.length) return <View style={styles.loading}><ActivityIndicator color={colors.info} /></View>;
  return <Screen title="安全资讯" subtitle="指南、功能和风险说明" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>} refreshing={loading} onRefresh={() => void load()}>
    {errorMessage ? <View style={styles.error}><Text style={styles.errorText}>{errorMessage}</Text><Pressable onPress={() => void load()}><Text style={styles.retry}>重新加载</Text></Pressable></View> : null}
    {rows.map((row) => <Pressable key={row.id} style={styles.card} onPress={() => navigation.navigate('NewsDetail', { article: row })}><Text style={styles.category}>{row.category.toUpperCase()}</Text><Text style={styles.title}>{row.title}</Text><Text style={styles.summary}>{row.summary}</Text><Text style={styles.meta}>{row.author || 'WarRescue'} · {new Date(row.published_at).toLocaleDateString('zh-CN')} · {row.view_count}次阅读</Text></Pressable>)}
    {!rows.length && !errorMessage ? <Text style={styles.empty}>暂无安全资讯</Text> : null}
  </Screen>;
}
const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, back: { color: colors.info, fontWeight: '800' }, error: { backgroundColor: '#7F1D1D44', borderColor: colors.danger, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }, errorText: { color: '#FECACA' }, retry: { color: colors.info, fontWeight: '900' }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm }, category: { color: colors.info, fontSize: 11, fontWeight: '900' }, title: { color: colors.text, fontSize: 19, fontWeight: '900' }, summary: { color: '#CBD5E1', lineHeight: 21 }, meta: { color: colors.muted, fontSize: 11 }, empty: { color: colors.muted, textAlign: 'center', padding: 60 } });
