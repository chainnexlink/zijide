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
  air_strike: ['????????????????', '?????????????????', '???????????????'],
  artillery: ['??????????????', '????????????????', '????????????'],
  chemical: ['??????????????', '?????????????', '??????????????'],
  conflict: ['?????????????', '??????????????', '??????????????'],
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
  const steps = advice[alert.alert_type] || ['????????', '????????', '????????????'];
  return <Screen title="????" subtitle={alert.is_verified ? '?????' : '??????'} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>??</Text></Pressable>}>
    <View style={[styles.banner, { borderColor: tone }]}><Text style={[styles.level, { color: tone }]}>{alert.severity.toUpperCase()} ? {alert.alert_type}</Text><Text style={styles.alertTitle}>{alert.title}</Text><Text style={styles.location}>{[alert.city, alert.country].filter(Boolean).join(' ? ') || '?????'}</Text></View>
    <View style={styles.card}><Text style={styles.section}>????</Text><Row label="????" value={format(alert.start_time || alert.created_at)} /><Row label="????" value={alert.end_time ? format(alert.end_time) : '????'} /><Row label="????" value={alert.affected_radius_km ? `${alert.affected_radius_km} km` : '???'} /><Row label="??" value={alert.source || '???????'} />{alert.description ? <Text style={styles.description}>{alert.description}</Text> : null}{alert.source_url ? <Pressable onPress={() => void Linking.openURL(alert.source_url!)}><Text style={styles.link}>???????</Text></Pressable> : null}</View>
    {alert.latitude != null && alert.longitude != null ? <><NativeGoogleMap center={{ latitude: Number(alert.latitude), longitude: Number(alert.longitude) }} markers={[{ id: alert.id, latitude: Number(alert.latitude), longitude: Number(alert.longitude), title: alert.title, color: tone }]} radiusMeters={(alert.affected_radius_km || 2) * 1000} radiusColor={tone} zoom={Math.max(0.04, (alert.affected_radius_km || 2) / 35)} /><Pressable onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`)}><Text style={styles.link}>? Google Maps ???????</Text></Pressable></> : <View style={styles.map}><Text style={styles.mapText}>?????????</Text></View>}
    <Pressable style={styles.zoneButton} onPress={() => navigation.navigate('DangerZone', { alertId: alert.id })}><Text style={styles.zoneButtonText}>????????????</Text></Pressable>
    <View style={styles.card}><Text style={styles.section}>??????</Text>{steps.map((step, index) => <View key={step} style={styles.step}><Text style={[styles.stepNo, { backgroundColor: tone }]}>{index + 1}</Text><Text style={styles.stepText}>{step}</Text></View>)}</View>
    <View style={styles.card}><Text style={styles.section}>???????</Text>{shelters.length ? shelters.map((shelter) => <Pressable key={shelter.id} style={styles.shelter} onPress={() => navigation.navigate('ShelterDetail', { shelterId: shelter.id })}><View><Text style={styles.shelterName}>{shelter.name}</Text><Text style={styles.shelterAddress}>{shelter.address || shelter.city}</Text></View><Text style={styles.chevron}>?</Text></Pressable>) : <Text style={styles.description}>?????????????????</Text>}</View>
  </Screen>;
}
function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
function format(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN') : '???'; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, back: { color: colors.info, fontWeight: '800' }, banner: { backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm }, level: { fontWeight: '900', fontSize: 12 }, alertTitle: { color: colors.text, fontSize: 24, fontWeight: '900' }, location: { color: colors.info }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, section: { color: colors.text, fontSize: 18, fontWeight: '900' }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, label: { color: colors.muted }, value: { color: colors.text, fontWeight: '700', flex: 1, textAlign: 'right' }, description: { color: '#CBD5E1', lineHeight: 22 }, link: { color: colors.info, fontWeight: '800' }, map: { height: 220, borderRadius: radius.md, backgroundColor: '#101D2B', borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, overflow: 'hidden' }, mapText: { color: colors.muted, fontSize: 12 }, zoneButton: { height: 48, borderRadius: radius.md, borderColor: colors.danger, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, zoneButtonText: { color: colors.danger, fontWeight: '900' }, step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, stepNo: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, color: colors.white, fontWeight: '900' }, stepText: { color: '#E2E8F0', flex: 1, lineHeight: 20 }, shelter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }, shelterName: { color: colors.text, fontWeight: '800' }, shelterAddress: { color: colors.muted, fontSize: 12, marginTop: 4 }, chevron: { color: colors.muted, fontSize: 26 } });
