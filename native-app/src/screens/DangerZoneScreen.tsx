import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NativeGoogleMap } from '../components/NativeGoogleMap';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { AlertRow, ShelterRow } from '../types';
import type { RootStackParams } from '../navigation/RootNavigator';
import { readOfflineCollection } from '../lib/offlinePacks';

type Props = NativeStackScreenProps<RootStackParams, 'DangerZone'>;

export function DangerZoneScreen({ route, navigation }: Props) {
  const [zone, setZone] = useState<AlertRow | null>(null);
  const [shelters, setShelters] = useState<ShelterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [loadError, setLoadError] = useState('');
  useEffect(() => { void (async () => {
    const { data, error } = await supabase.from('alerts').select('*').eq('id', route.params.alertId).maybeSingle();
    let current = data as AlertRow | null;
    if (error) {
      current = (await readOfflineCollection<AlertRow>('alerts')).find((item) => item.id === route.params.alertId) || null;
      setOffline(Boolean(current));
      if (!current) setLoadError(error.message);
    } else if (!current) {
      setLoadError('该危险区域已删除或不可用');
    }
    setZone(current);
    if (current?.city) {
      const result = await supabase.from('shelters').select('*').eq('city', current.city).neq('status', 'closed').limit(5);
      if (result.error) {
        const cached = await readOfflineCollection<ShelterRow>('shelters');
        setShelters(cached.filter((item) => item.city === current?.city && item.status !== 'closed').slice(0, 5));
      } else {
        setShelters((result.data || []) as ShelterRow[]);
      }
    }
    setLoading(false);
  })(); }, [route.params.alertId]);
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.danger} size="large" /></View>;
  if (!zone) return <Screen title="危险区域" subtitle="无法加载" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}><View style={styles.card}><Text style={styles.section}>区域不可用</Text><Text style={styles.body}>{loadError || '请检查网络后重试'}</Text></View></Screen>;
  const tone = zone.severity === 'red' ? colors.danger : zone.severity === 'orange' ? colors.warning : '#EAB308';
  const active = !zone.end_time && zone.is_active !== false;
  return <Screen title="危险区域" subtitle={offline ? '离线缓存 · 状态可能已变化' : active ? '当前仍处于危险状态' : '该区域警报已解除'} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={[styles.status, { borderColor: tone }]}><Text style={[styles.level, { color: tone }]}>{zone.severity.toUpperCase()} · {active ? '危险中' : '已解除'}</Text><Text style={styles.title}>{zone.title}</Text><Text style={styles.meta}>{zone.alert_type} · {[zone.city, zone.country].filter(Boolean).join(' ')}</Text></View>
    {zone.latitude != null && zone.longitude != null ? <NativeGoogleMap center={{ latitude: Number(zone.latitude), longitude: Number(zone.longitude) }} markers={[{ id: zone.id, latitude: Number(zone.latitude), longitude: Number(zone.longitude), title: zone.title, color: tone }]} radiusMeters={(zone.affected_radius_km || 2) * 1000} radiusColor={tone} zoom={Math.max(0.04, (zone.affected_radius_km || 2) / 35)} /> : null}
    <View style={styles.card}><Text style={styles.section}>区域信息</Text><Row label="危险类型" value={zone.alert_type} /><Row label="危险等级" value={zone.severity.toUpperCase()} /><Row label="影响半径" value={`${zone.affected_radius_km || 2} km`} /><Row label="持续时间" value={duration(zone.start_time || zone.created_at, zone.end_time)} /><Row label="最后更新" value={zone.created_at ? new Date(zone.created_at).toLocaleString('zh-CN') : '待确认'} />{zone.description ? <Text style={styles.body}>{zone.description}</Text> : null}</View>
    <View style={styles.card}><Text style={styles.section}>影响与规避</Text><Text style={styles.body}>避免进入地图标记半径；不要靠近窗户、桥梁、军事或能源设施。路线规划会自动检测当前活跃危险区并优先推荐安全评分较高的方案。</Text></View>
    <View style={styles.card}><Text style={styles.section}>推荐撤离地点</Text>{shelters.length ? shelters.map((shelter) => <Pressable key={shelter.id} style={styles.shelter} onPress={() => navigation.navigate('RoutePlan', { latitude: shelter.latitude, longitude: shelter.longitude, name: shelter.name })}><View style={styles.shelterBody}><Text style={styles.shelterName}>{shelter.name}</Text><Text style={styles.shelterMeta}>{shelter.address || shelter.city} · {shelter.status || '状态待确认'}</Text></View><Text style={styles.route}>安全路线 ›</Text></Pressable>) : <Text style={styles.body}>该城市暂无可用避难所记录，请遵循当地民防部门指引。</Text>}</View>
  </Screen>;
}

function duration(start?: string | null, end?: string | null) { if (!start) return '待确认'; const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime(); const minutes = Math.max(0, Math.floor(ms / 60000)); return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`; }
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, back: { color: colors.info, fontWeight: '800' }, status: { backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm }, level: { fontWeight: '900' }, title: { color: colors.text, fontSize: 24, fontWeight: '900' }, meta: { color: colors.info }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, section: { color: colors.text, fontSize: 18, fontWeight: '900' }, body: { color: '#CBD5E1', lineHeight: 22 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, rowLabel: { color: colors.muted }, rowValue: { color: colors.text, fontWeight: '800', flex: 1, textAlign: 'right' }, shelter: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, shelterBody: { flex: 1 }, shelterName: { color: colors.text, fontWeight: '900' }, shelterMeta: { color: colors.muted, fontSize: 12, marginTop: 4 }, route: { color: colors.safe, fontWeight: '900' } });
