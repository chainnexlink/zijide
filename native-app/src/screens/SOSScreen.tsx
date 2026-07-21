import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';

export function SOSScreen() {
  const [sending, setSending] = useState(false);
  const [lastSosId, setLastSosId] = useState<string | null>(null);

  const trigger = async () => {
    if (sending) return;
    setSending(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const location = permission.status === 'granted'
        ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        : null;
      const latitude = location?.coords.latitude;
      const longitude = location?.coords.longitude;
      let address = '';
      if (latitude != null && longitude != null) {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = places[0];
        address = [place?.street, place?.city, place?.region, place?.country].filter(Boolean).join(', ');
      }

      const { data, error } = await supabase.functions.invoke('sos-service', {
        body: { action: 'trigger', triggerMethod: 'manual', latitude, longitude, address },
      });
      if (error) throw error;
      if (!data?.success && !data?.sosId) throw new Error(data?.error || 'SOS ????');
      setLastSosId(data.sosId);
      Alert.alert('SOS ???', '?????????????????????????????');
    } catch (error) {
      Alert.alert('???? SOS', error instanceof Error ? error.message : '????????');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title="????" subtitle="???? 1 ??????">
      <View style={styles.hero}>
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <Pressable
              style={({ pressed }) => [styles.sos, pressed && styles.sosPressed]}
              onLongPress={trigger}
              delayLongPress={1000}
              disabled={sending}
              accessibilityLabel="???? SOS"
            >
              {sending ? <ActivityIndicator color={colors.white} size="large" /> : <><Text style={styles.sosText}>SOS</Text><Text style={styles.hold}>????</Text></>}
            </Pressable>
          </View>
        </View>
        <Text style={styles.hint}>??????????????????????????????</Text>
      </View>

      {lastSosId ? <View style={styles.active}><Text style={styles.activeTitle}>???????</Text><Text style={styles.activeId}>?? {lastSosId.slice(0, 8).toUpperCase()}</Text></View> : null}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>??????</Text>
        <Info text="????????????????" />
        <Info text="?????????????" />
        <Info text="??????????????" />
      </View>
    </Screen>
  );
}

function Info({ text }: { text: string }) {
  return <View style={styles.infoRow}><View style={styles.dot} /><Text style={styles.infoText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: spacing.lg },
  ringOuter: { width: 244, height: 244, borderRadius: 122, borderWidth: 1, borderColor: '#EF444433', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF44440A' },
  ringInner: { width: 206, height: 206, borderRadius: 103, borderWidth: 1, borderColor: '#EF444466', alignItems: 'center', justifyContent: 'center' },
  sos: { width: 170, height: 170, borderRadius: 85, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', shadowColor: colors.danger, shadowOpacity: 0.6, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
  sosPressed: { transform: [{ scale: 0.96 }], backgroundColor: '#DC2626' },
  sosText: { color: colors.white, fontSize: 46, fontWeight: '900', letterSpacing: 2 },
  hold: { color: '#FEE2E2', fontSize: 13, fontWeight: '700', marginTop: 3 },
  hint: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  active: { backgroundColor: '#7F1D1D66', borderColor: colors.danger, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  activeTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  activeId: { color: '#FCA5A5', marginTop: 4 },
  infoCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  infoTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning },
  infoText: { flex: 1, color: '#CBD5E1', lineHeight: 20 },
});
