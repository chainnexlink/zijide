import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { ShelterRow } from '../types';
import type { RootStackParams } from '../navigation/RootNavigator';
import { readOfflineCollection } from '../lib/offlinePacks';

type Position = { latitude: number; longitude: number };

export function SheltersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [shelters, setShelters] = useState<ShelterRow[]>([]);
  const [position, setPosition] = useState<Position | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('shelters').select('id,name,address,city,country,latitude,longitude,status,capacity,current_occupancy,has_water,has_medical').limit(100);
    const online = (data || []) as ShelterRow[];
    setShelters(error || online.length === 0 ? await readOfflineCollection<ShelterRow>('shelters') : online);
  }, []);

  useEffect(() => {
    void load();
    void Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') return;
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ latitude: result.coords.latitude, longitude: result.coords.longitude });
    });
  }, [load]);

  const sorted = useMemo(() => shelters.map((shelter) => ({
    ...shelter,
    distance: position ? distanceKm(position.latitude, position.longitude, shelter.latitude, shelter.longitude) : null,
  })).sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999)), [position, shelters]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <Screen title="????" subtitle={position ? '??????' : '?????????'} refreshing={refreshing} onRefresh={refresh}>
      {sorted.map((shelter) => (
        <View key={shelter.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.pin}><Text style={styles.pinText}>?</Text></View>
            <View style={styles.body}>
              <Text style={styles.title}>{shelter.name}</Text>
              <Text style={styles.address}>{shelter.address || [shelter.city, shelter.country].filter(Boolean).join(', ')}</Text>
            </View>
            <Text style={styles.distance}>{shelter.distance == null ? '--' : `${shelter.distance.toFixed(1)} km`}</Text>
          </View>
          <View style={styles.facilities}>
            {shelter.has_water ? <Text style={styles.facility}>??</Text> : null}
            {shelter.has_medical ? <Text style={styles.facility}>??</Text> : null}
            {shelter.capacity ? <Text style={styles.facility}>?? {shelter.capacity}</Text> : null}
          </View>
          <Pressable style={styles.route} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}&travelmode=walking`)}>
            <Text style={styles.routeText}>????</Text>
          </Pressable>
          <Pressable style={styles.detail} onPress={() => navigation.navigate('ShelterDetail', { shelterId: shelter.id, distance: shelter.distance })}><Text style={styles.detailText}>???????????? ?</Text></Pressable>
        </View>
      ))}
      {sorted.length === 0 ? <Text style={styles.empty}>?????????</Text> : null}
    </Screen>
  );
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pin: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#22C55E22', alignItems: 'center', justifyContent: 'center' },
  pinText: { color: colors.safe, fontSize: 24, fontWeight: '900' },
  body: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  address: { color: colors.muted, fontSize: 12, marginTop: 4 },
  distance: { color: colors.safe, fontWeight: '800' },
  facilities: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: spacing.md },
  facility: { color: '#CBD5E1', backgroundColor: colors.surfaceRaised, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.round, fontSize: 11 },
  route: { marginTop: spacing.md, borderRadius: radius.sm, backgroundColor: '#22C55E1F', paddingVertical: 11, alignItems: 'center' },
  routeText: { color: colors.safe, fontWeight: '800' },
  detail: { paddingTop: spacing.sm, alignItems: 'center' }, detailText: { color: colors.info, fontWeight: '800', fontSize: 12 },
  empty: { color: colors.muted, textAlign: 'center', paddingTop: 60 },
});
