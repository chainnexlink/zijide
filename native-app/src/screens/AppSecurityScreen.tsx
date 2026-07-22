import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import type { RootStackParams } from '../navigation/RootNavigator';
import { colors, radius, spacing } from '../theme';

export const BIOMETRIC_LOCK_KEY = 'biometric-lock-enabled';
type Props = NativeStackScreenProps<RootStackParams, 'AppSecurity'>;

export function AppSecurityScreen({ navigation }: Props) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => { void (async () => { const [hardware, enrolled, stored] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(), AsyncStorage.getItem(BIOMETRIC_LOCK_KEY)]); setAvailable(hardware && enrolled); setEnabled(stored === 'true'); setBusy(false); })(); }, []);

  const toggle = async (value: boolean) => {
    if (value) {
      if (!available) return Alert.alert('无法启用', '请先在系统设置中录入 Face ID、Touch ID 或设备生物识别。');
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: '启用 WarRescue 生物识别锁', cancelLabel: '取消', disableDeviceFallback: false });
      if (!result.success) return;
    }
    await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, String(value));
    setEnabled(value);
  };

  return <Screen title="App 安全锁" subtitle="保护医疗、家庭和 SOS 信息" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={styles.card}>{busy ? <ActivityIndicator color={colors.info} /> : <View style={styles.row}><View style={styles.rowBody}><Text style={styles.title}>生物识别解锁</Text><Text style={styles.body}>{available ? 'App 从后台重新打开时验证 Face ID、Touch ID 或设备生物识别。' : '当前设备未设置可用的生物识别。'}</Text></View><Switch value={enabled} onValueChange={(value) => void toggle(value)} disabled={!available} /></View>}</View>
    <View style={styles.notice}><Text style={styles.noticeTitle}>安全说明</Text><Text style={styles.body}>生物识别结果只由系统返回，WarRescue 不读取或保存你的面容、指纹数据。设备密码可作为系统回退方式。</Text></View>
  </Screen>;
}

const styles = StyleSheet.create({
  back: { color: colors.info, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, paddingRight: spacing.md },
  title: { color: colors.text, fontSize: 17, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 21, marginTop: spacing.xs },
  notice: { backgroundColor: '#0C4A6E33', borderColor: '#38BDF855', borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  noticeTitle: { color: colors.info, fontWeight: '900' },
});
