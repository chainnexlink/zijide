import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { AlertRow, ShelterRow } from '../types';
import type { RootStackParams } from '../navigation/RootNavigator';
import { NativeGoogleMap } from '../components/NativeGoogleMap';

type Props = NativeStackScreenProps<RootStackParams, 'AlertDetail'>;
const advice: Record<string, string[]> = {
  air_strike: ['立即进入坚固建筑地下层或防空设施', '远离窗户、外墙和可能产生碎片的物体', '保持手机静音并关注官方解除通知'],
  artillery: ['立即卧倒并寻找低洼或坚固掩体', '不要靠近车辆、弹药设施或军事目标', '炮击停止后等待片刻再转移'],
  chemical: ['关闭门窗和通风系统并遮住口鼻', '向上风方向或高处撤离污染区', '不要接触不明液体、粉尘或残骸'],
  conflict: ['避开人群、检查站和交火方向', '留在坚固建筑内部并准备撤离包', '只采用可信官方来源的路线信息'],
};

export function AlertDetailScreen({ route, navigation }: Props) {
  const [alert, setAlert] = useState<AlertRow | null>(null);
  const [shelters, setShelters] = useState<ShelterRow[]>([]);
  useEffect(() => { void (async () => {
    const { data } = await supabase.from('alerts').select('*').eq('id', route.params.alertId).maybeSingle();
    setAlert(data as AlertRow | null);
    if (data?.city) {
      const nearby = await supabase.from('shelters').select('id,name,address,city,country,latitude,longitude,status,capacity,current_occupancy,has_water,has_medical').eq('city', data.city).neq('status', 'closed').limit(3);
      setShelters((nearby.data || []) as ShelterRow[]);
    }
  })(); }, [route.params.alertId]);
  if (!alert) return <View style={styles.loading}><ActivityIndicator color={colors.danger} size="large" /></View>;
  const tone = alert.severity === 'red' ? colors.danger : alert.severity === 'orange' ? colors.warning : '#EAB308';
  const steps = advice[alert.alert_type] || ['立即远离危险区域', '关注当地官方通知', '准备前往最近的开放避难所'];
  return <Screen title="预警详情" subtitle={alert.is_verified ? '已核验信息' : '待进一步核验'} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={[styles.banner, { borderColor: tone }]}><Text style={[styles.level, { color: tone }]}>{alert.severity.toUpperCase()} · {alert.alert_type}</Text><Text style={styles.alertTitle}>{alert.title}</Text><Text style={styles.location}>{[alert.city, alert.country].filter(Boolean).join(' · ') || '位置待确认'}</Text></View>
    <View style={styles.card}><Text style={styles.section}>事件信息</Text><Row label="开始时间" value={format(alert.start_time || alert.created_at)} /><Row label="结束时间" value={alert.end_time ? format(alert.end_time) : '尚未解除'} /><Row label="影响半径" value={alert.affected_radius_km ? `${alert.affected_radius_km} km` : '待确认'} /><Row label="来源" value={alert.source || '公开安全信息源'} />{alert.description ? <Text style={styles.description}>{alert.description}</Text> : null}{alert.source_url ? <Pressable onPress={() => void Linking.openURL(alert.source_url!)}><Text style={styles.link}>查看原始信息源</Text></Pressable> : null}</View>
    {alert.latitude != null && alert.longitude != null ? <><NativeGoogleMap center={{ latitude: Number(alert.latitude), longitude: Number(alert.longitude) }} markers={[{ id: alert.id, latitude: Number(alert.latitude), longitude: Number(alert.longitude), title: alert.title, color: tone }]} radiusMeters={(alert.affected_radius_km || 2) * 1000} radiusColor={tone} zoom={Math.max(0.04, (alert.affected_radius_km || 2) / 35)} /><Pressable onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`)}><Text style={styles.link}>在 Google Maps 中查看影响区域</Text></Pressable></> : <View style={styles.map}><Text style={styles.mapText}>预警区域坐标待确认</Text></View>}
    <View style={styles.card}><Text style={styles.section}>立即行动建议</Text>{steps.map((step, index) => <View key={step} style={styles.step}><Text style={[styles.stepNo, { backgroundColor: tone }]}>{index + 1}</Text><Text style={styles.stepText}>{step}</Text></View>)}</View>
    <View style={styles.card}><Text style={styles.section}>附近开放避难所</Text>{shelters.length ? shelters.map((shelter) => <Pressable key={shelter.id} style={styles.shelter} onPress={() => navigation.navigate('ShelterDetail', { shelterId: shelter.id })}><View><Text style={styles.shelterName}>{shelter.name}</Text><Text style={styles.shelterAddress}>{shelter.address || shelter.city}</Text></View><Text style={styles.chevron}>›</Text></Pressable>) : <Text style={styles.description}>该城市暂未找到已登记的开放避难所。</Text>}</View>
  </Screen>;
}
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
function format(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN') : '待确认'; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, back: { color: colors.info, fontWeight: '800' }, banner: { backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm }, level: { fontWeight: '900', fontSize: 12 }, alertTitle: { color: colors.text, fontSize: 24, fontWeight: '900' }, location: { color: colors.info }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, section: { color: colors.text, fontSize: 18, fontWeight: '900' }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, label: { color: colors.muted }, value: { color: colors.text, fontWeight: '700', flex: 1, textAlign: 'right' }, description: { color: '#CBD5E1', lineHeight: 22 }, link: { color: colors.info, fontWeight: '800' }, map: { height: 220, borderRadius: radius.md, backgroundColor: '#101D2B', borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, overflow: 'hidden' }, mapText: { color: colors.muted, fontSize: 12 }, step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, stepNo: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, color: colors.white, fontWeight: '900' }, stepText: { color: '#E2E8F0', flex: 1, lineHeight: 20 }, shelter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, shelterName: { color: colors.text, fontWeight: '800' }, shelterAddress: { color: colors.muted, fontSize: 12, marginTop: 4 }, chevron: { color: colors.muted, fontSize: 26 } });
