import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';
type Props = NativeStackScreenProps<RootStackParams, 'MapSettings'>;
type Form = { map_type: 'standard' | 'satellite' | 'hybrid' | 'terrain'; route_preference: 'fastest' | 'safest' | 'shortest'; avoid_highways: boolean; avoid_tolls: boolean; avoid_ferries: boolean; distance_unit: 'km' | 'mi'; show_danger_zones: boolean; show_shelters: boolean; show_routes: boolean };
const defaults: Form = { map_type: 'standard', route_preference: 'safest', avoid_highways: false, avoid_tolls: false, avoid_ferries: false, distance_unit: 'km', show_danger_zones: true, show_shelters: true, show_routes: true };
export function MapSettingsScreen({ navigation }: Props) {
  const [form, setForm] = useState(defaults); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  useEffect(() => { void (async () => {
    try {
      const cached = await AsyncStorage.getItem('map-preferences');
      if (cached) {
        try { setForm({ ...defaults, ...JSON.parse(cached) }); }
        catch { await AsyncStorage.removeItem('map-preferences'); }
      }
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', auth.user.id).maybeSingle();
        if (error) Alert.alert('云端设置加载失败', '当前使用本机地图设置，联网后可重新进入同步。');
        else if (data) {
          const next = { ...defaults, ...data };
          setForm(next);
          await AsyncStorage.setItem('map-preferences', JSON.stringify(next));
        }
      }
    } finally {
      setLoading(false);
    }
  })(); }, []);
  const toggle = (key: keyof Form) => setForm((c) => ({ ...c, [key]: !c[key] }));
  const save = async () => { setSaving(true); try { await AsyncStorage.setItem('map-preferences', JSON.stringify(form)); const { data: auth } = await supabase.auth.getUser(); const { error } = auth.user ? await supabase.from('user_preferences').upsert({ user_id: auth.user.id, ...form, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }) : { error: new Error('登录已失效') }; Alert.alert(error ? '本机已保存，云端同步失败' : '地图设置已同步', error?.message); } catch { Alert.alert('保存失败', '本机存储暂时不可用，请稍后重试。'); } finally { setSaving(false); } };
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.info} size="large" /></View>;
  return <Screen title="地图设置" subtitle="Google Maps显示与路线偏好" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={styles.card}><Text style={styles.title}>地图类型</Text><View style={styles.options}>{([['standard', '标准'], ['satellite', '卫星'], ['hybrid', '混合'], ['terrain', '地形']] as const).map(([value, label]) => <Choice key={value} label={label} active={form.map_type === value} onPress={() => setForm((c) => ({ ...c, map_type: value }))} />)}</View></View>
    <View style={styles.card}><Text style={styles.title}>默认路线</Text><View style={styles.options}>{([['fastest', '最快'], ['safest', '最安全'], ['shortest', '最短']] as const).map(([value, label]) => <Choice key={value} label={label} active={form.route_preference === value} onPress={() => setForm((c) => ({ ...c, route_preference: value }))} />)}</View><Toggle label="避开高速" value={form.avoid_highways} onChange={() => toggle('avoid_highways')} /><Toggle label="避开收费" value={form.avoid_tolls} onChange={() => toggle('avoid_tolls')} /><Toggle label="避开轮渡" value={form.avoid_ferries} onChange={() => toggle('avoid_ferries')} /></View>
    <View style={styles.card}><Text style={styles.title}>图层</Text><Toggle label="危险区域" value={form.show_danger_zones} onChange={() => toggle('show_danger_zones')} /><Toggle label="避难所" value={form.show_shelters} onChange={() => toggle('show_shelters')} /><Toggle label="逃生路线" value={form.show_routes} onChange={() => toggle('show_routes')} /></View>
    <View style={styles.card}><Text style={styles.title}>距离单位</Text><View style={styles.options}><Choice label="公里" active={form.distance_unit === 'km'} onPress={() => setForm((c) => ({ ...c, distance_unit: 'km' }))} /><Choice label="英里" active={form.distance_unit === 'mi'} onPress={() => setForm((c) => ({ ...c, distance_unit: 'mi' }))} /></View></View>
    <Pressable style={styles.offline} onPress={() => navigation.navigate('OfflineMaps')}><Text style={styles.offlineText}>离线地图与城市安全包 ›</Text></Pressable><Pressable style={styles.save} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>保存地图设置</Text>}</Pressable>
  </Screen>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) { return <View style={styles.toggle}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: '#0C4A6E' }} thumbColor={value ? colors.info : colors.muted} /></View>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable style={[styles.choice, active && styles.choiceActive]} onPress={onPress}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, back: { color: colors.info, fontWeight: '800' }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm }, title: { color: colors.text, fontSize: 18, fontWeight: '900' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { minHeight: 41, minWidth: 68, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }, choiceActive: { backgroundColor: colors.info }, choiceText: { color: colors.muted, fontWeight: '800' }, choiceTextActive: { color: colors.background }, toggle: { minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, toggleLabel: { color: '#E2E8F0', fontWeight: '700' }, offline: { height: 50, borderRadius: radius.md, borderColor: colors.info, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, offlineText: { color: colors.info, fontWeight: '900' }, save: { height: 52, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }, saveText: { color: colors.white, fontWeight: '900' } });
