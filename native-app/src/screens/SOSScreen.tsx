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
      let location: Location.LocationObject | null = null;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        }
      } catch {
        // SOS must still be sent if GPS is unavailable or temporarily fails.
      }
      const latitude = location?.coords.latitude;
      const longitude = location?.coords.longitude;
      let address = '';
      let city = '';
      let country = '';
      if (latitude != null && longitude != null) {
        try {
          const places = await Location.reverseGeocodeAsync({ latitude, longitude });
          const place = places[0];
          city = place?.city || place?.region || '';
          country = place?.country || '';
          address = [place?.street, place?.city, place?.region, place?.country].filter(Boolean).join(', ');
        } catch {
          address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }
      }

      const { data, error } = await supabase.functions.invoke('sos-service', {
        body: { action: 'trigger', triggerMethod: 'manual', latitude, longitude, address, city, country },
      });
      if (error) throw error;
      if (!data?.success && !data?.sosId) throw new Error(data?.error || 'SOS 发送失败');
      setLastSosId(data.sosId);
      const duplicate = data?.success === false;
      Alert.alert(
        duplicate ? 'SOS 已在处理中' : 'SOS 已发送',
        latitude == null
          ? '求救已发送，但本次无法取得定位。请保持电话畅通，并主动告知救援人员你的位置。'
          : '家人、附近救援人员和紧急联系人已收到通知。请保持电话畅通。',
      );
    } catch (error) {
      Alert.alert('无法发送 SOS', error instanceof Error ? error.message : '请检查网络后重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title="紧急求救" subtitle="长按按钮 1 秒，防止误触">
      <View style={styles.hero}>
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <Pressable
              style={({ pressed }) => [styles.sos, pressed && styles.sosPressed]}
              onLongPress={trigger}
              delayLongPress={1000}
              disabled={sending}
              accessibilityLabel="长按发送 SOS"
            >
              {sending ? <ActivityIndicator color={colors.white} size="large" /> : <><Text style={styles.sosText}>SOS</Text><Text style={styles.hold}>长按求救</Text></>}
            </Pressable>
          </View>
        </View>
        <Text style={styles.hint}>触发后会上传当前位置，并通知家人、附近互助人员及紧急联系人。</Text>
      </View>

      {lastSosId ? <View style={styles.active}><Text style={styles.activeTitle}>求救信号已激活</Text><Text style={styles.activeId}>编号 {lastSosId.slice(0, 8).toUpperCase()}</Text></View> : null}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>发送前请确认</Text>
        <Info text="仅在真实危险或紧急医疗情况下使用" />
        <Info text="允许定位可显著提高救援速度" />
        <Info text="发送后保持设备联网并留意来电" />
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
