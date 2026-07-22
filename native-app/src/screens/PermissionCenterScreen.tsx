import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import type { RootStackParams } from '../navigation/RootNavigator';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParams, 'PermissionCenter'>;
type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const permissionLabel = (status: PermissionState) => {
  if (status === 'granted') return '已允许';
  if (status === 'denied') return '已拒绝';
  if (status === 'unavailable') return '当前设备不可用';
  return '尚未请求';
};

export function PermissionCenterScreen({ navigation }: Props) {
  const [notification, setNotification] = useState<PermissionState>('undetermined');
  const [location, setLocation] = useState<PermissionState>('undetermined');
  const [backend, setBackend] = useState<'checking' | 'online' | 'offline'>('checking');
  const [pushRegistered, setPushRegistered] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const version = Constants.expoConfig?.version || '1.1.0';

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [notificationPermission, locationPermission, auth] = await Promise.all([
      Notifications.getPermissionsAsync().catch(() => null),
      Location.getForegroundPermissionsAsync().catch(() => null),
      supabase.auth.getUser(),
    ]);
    setNotification((notificationPermission?.status || 'unavailable') as PermissionState);
    setLocation((locationPermission?.status || 'unavailable') as PermissionState);

    if (!auth.data.user) {
      setBackend('offline');
      setPushRegistered(false);
      setRefreshing(false);
      return;
    }
    const [health, token] = await Promise.all([
      supabase.from('profiles').select('id').eq('id', auth.data.user.id).maybeSingle(),
      supabase.from('device_tokens').select('id').eq('user_id', auth.data.user.id).eq('is_active', true).limit(1),
    ]);
    setBackend(health.error ? 'offline' : 'online');
    setPushRegistered(!token.error && Boolean(token.data?.length));
    setRefreshing(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const requestNotification = async () => {
    const result = await Notifications.requestPermissionsAsync();
    setNotification(result.status as PermissionState);
  };

  const requestLocation = async () => {
    const result = await Location.requestForegroundPermissionsAsync();
    setLocation(result.status as PermissionState);
  };

  const diagnostics = [
    `WarRescue ${version}`,
    `平台: ${Platform.OS} ${Platform.Version}`,
    `设备: ${Device.modelName || Device.deviceName || '未知'}`,
    `通知权限: ${permissionLabel(notification)}`,
    `定位权限: ${permissionLabel(location)}`,
    `推送设备: ${pushRegistered ? '已注册' : '未注册'}`,
    `后台连接: ${backend === 'online' ? '正常' : backend === 'offline' ? '异常' : '检查中'}`,
  ].join('\n');

  return (
    <Screen
      title="权限与诊断"
      subtitle="管理系统权限并检查 App 服务状态"
      action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      <View style={styles.card}>
        <Text style={styles.title}>系统权限</Text>
        <PermissionRow label="推送通知" description="接收风险预警、SOS 和家庭联动消息" value={permissionLabel(notification)} granted={notification === 'granted'} onRequest={() => void requestNotification()} />
        <PermissionRow label="精确定位" description="查找附近危险、避难所和安全路线" value={permissionLabel(location)} granted={location === 'granted'} onRequest={() => void requestLocation()} />
        <Pressable style={styles.settingsButton} onPress={() => void Linking.openSettings()}><Text style={styles.settingsText}>打开系统设置</Text></Pressable>
        <Text style={styles.note}>WarRescue 会在使用相关功能时说明权限用途。拒绝权限后仍可使用不依赖该权限的功能。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>运行诊断</Text>
        <StatusRow label="后台服务" value={backend === 'online' ? '连接正常' : backend === 'offline' ? '连接异常' : '检查中'} ok={backend === 'online'} loading={backend === 'checking'} />
        <StatusRow label="推送设备" value={pushRegistered ? '已注册' : notification === 'granted' ? '等待注册' : '需要通知权限'} ok={pushRegistered} />
        <StatusRow label="App 版本" value={version} ok />
        <StatusRow label="设备" value={Device.modelName || Device.deviceName || Platform.OS} ok />
        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={() => void refresh()} disabled={refreshing}>{refreshing ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>重新检查</Text>}</Pressable>
          <Pressable style={styles.secondary} onPress={() => void Clipboard.setStringAsync(diagnostics)}><Text style={styles.secondaryText}>复制诊断信息</Text></Pressable>
        </View>
      </View>
    </Screen>
  );
}

function PermissionRow({ label, description, value, granted, onRequest }: { label: string; description: string; value: string; granted: boolean; onRequest: () => void }) {
  return <View style={styles.permissionRow}><View style={styles.rowBody}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.description}>{description}</Text><Text style={[styles.status, { color: granted ? colors.safe : colors.warning }]}>{value}</Text></View>{!granted ? <Pressable style={styles.requestButton} onPress={onRequest}><Text style={styles.requestText}>授权</Text></Pressable> : null}</View>;
}

function StatusRow({ label, value, ok, loading = false }: { label: string; value: string; ok: boolean; loading?: boolean }) {
  return <View style={styles.statusRow}><Text style={styles.rowLabel}>{label}</Text><View style={styles.statusValue}>{loading ? <ActivityIndicator size="small" color={colors.info} /> : <View style={[styles.dot, { backgroundColor: ok ? colors.safe : colors.warning }]} />}<Text style={styles.statusText}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  back: { color: colors.info, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  permissionRow: { flexDirection: 'row', alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.md },
  rowBody: { flex: 1 },
  rowLabel: { color: colors.text, fontWeight: '800' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  status: { fontSize: 12, fontWeight: '800', marginTop: 5 },
  requestButton: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.info, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  requestText: { color: colors.info, fontWeight: '800' },
  settingsButton: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  settingsText: { color: colors.text, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  statusValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '62%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: colors.text, fontWeight: '700', textAlign: 'right' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  primary: { height: 48, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontWeight: '800' },
  secondary: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.info, fontWeight: '800' },
});
