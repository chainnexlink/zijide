import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NativeGoogleMap } from '../components/NativeGoogleMap';
import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { AlertRow, ShelterRow } from '../types';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'DangerZone'>;

export function DangerZoneScreen({ route, navigation }: Props) {
  const [zone, setZone] = useState<AlertRow | null>(null);
  const [shelters, setShelters] = useState<ShelterRow[]>([]);
  useEffect(() => { void (async () => {
    const { data } = await supabase.from('alerts').select('*').eq('id', route.params.alertId).maybeSingle();
    setZone(data as AlertRow | null);
    if (data?.city) {
      const result = await supabase.from('shelters').select('*').eq('city', data.city).neq('status', 'closed').limit(5);
      setShelters((result.data || []) as ShelterRow[]);
    }
  })(); }, [route.params.alertId]);
  if (!zone) return <View style={styles.loading}><ActivityIndicator color={colors.danger} size="large" /></View>;
  const tone = zone.severity === 'red' ? colors.danger : zone.severity === 'orange' ? colors.warning : '#EAB308';
  const active = !zone.end_time && zone.is_active !== false;
  return <Screen title="????" subtitle={active ? '?????????' : '????????'} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>??</Text></Pressable>}>
    <View style={[styles.status, { borderColor: tone }]}><Text style={[styles.level, { color: tone }]}>{zone.severity.toUpperCase()} ? {active ? '???' : '???'}</Text><Text style={styles.title}>{zone.title}</Text><Text style={styles.meta}>{zone.alert_type} ? {[zone.city, zone.country].filter(Boolean).join(' ')}</Text></View>
    {zone.latitude != null && zone.longitude != null ? <NativeGoogleMap center={{ latitude: Number(zone.latitude), longitude: Number(zone.longitude) }} markers={[{ id: zone.id, latitude: Number(zone.latitude), longitude: Number(zone.longitude), title: zone.title, color: tone }]} radiusMeters={(zone.affected_radius_km || 2) * 1000} radiusColor={tone} zoom={Math.max(0.04, (zone.affected_radius_km || 2) / 35)} /> : null}
    <View style={styles.card}><Text style={styles.section}>????</Text><Row label="????" value={zone.alert_type} /><Row label="????" value={zone.severity.toUpperCase()} /><Row label="????" value={`${zone.affected_radius_km || 2} km`} /><Row label="????" value={duration(zone.start_time || zone.created_at, zone.end_time)} /><Row label="????" value={zone.created_at ? new Date(zone.created_at).toLocaleString('zh-CN') : '???'} />{zone.description ? <Text style={styles.body}>{zone.description}</Text> : null}</View>
    <View style={styles.card}><Text style={styles.section}>?????</Text><Text style={styles.body}>????????????????????????????????????????????????????????????</Text></View>
    <View style={styles.card}><Text style={styles.section}>??????</Text>{shelters.length ? shelters.map((shelter) => <Pressable key={shelter.id} style={styles.shelter} onPress={() => navigation.navigate('RoutePlan', { latitude: shelter.latitude, longitude: shelter.longitude, name: shelter.name })}><View style={styles.shelterBody}><Text style={styles.shelterName}>{shelter.name}</Text><Text style={styles.shelterMeta}>{shelter.address || shelter.city} ? {shelter.status || '?????'}</Text></View><Text style={styles.route}>???? ?</Text></Pressable>) : <Text style={styles.body}>?????????????????????????</Text>}</View>
  </Screen>;
}

function duration(start?: string | null, end?: string | null) { if (!start) return '???'; const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime(); const minutes = Math.max(0, Math.floor(ms / 60000)); return minutes < 60 ? `${minutes} ??` : `${Math.floor(minutes / 60)} ?? ${minutes % 60} ??`; }
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, back: { color: colors.info, fontWeight: '800' }, status: { backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm }, level: { fontWeight: '900' }, title: { color: colors.text, fontSize: 24, fontWeight: '900' }, meta: { color: colors.info }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, section: { color: colors.text, fontSize: 18, fontWeight: '900' }, body: { color: '#CBD5E1', lineHeight: 22 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, rowLabel: { color: colors.muted }, rowValue: { color: colors.text, fontWeight: '800', flex: 1, textAlign: 'right' }, shelter: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, shelterBody: { flex: 1 }, shelterName: { color: colors.text, fontWeight: '900' }, shelterMeta: { color: colors.muted, fontSize: 12, marginTop: 4 }, route: { color: colors.safe, fontWeight: '900' } });
