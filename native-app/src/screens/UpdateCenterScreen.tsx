import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import type { RootStackParams } from '../navigation/RootNavigator';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParams, 'UpdateCenter'>;
const APP_ID = '6774955063';

export function UpdateCenterScreen({ navigation }: Props) {
  const [checking, setChecking] = useState(false);
  const [latest, setLatest] = useState<string | null>(null);
  const current = Constants.expoConfig?.version || '1.1.0';

  const check = async () => {
    setChecking(true);
    try {
      const response = await fetch(`https://itunes.apple.com/lookup?id=${APP_ID}&country=us`);
      if (!response.ok) throw new Error('App Store 暂时无法访问');
      const payload = await response.json() as { results?: Array<{ version?: string }> };
      const version = payload.results?.[0]?.version;
      setLatest(version || null);
      if (!version) Alert.alert('测试版本', 'App 尚未公开发布；TestFlight 会在新测试版本可用时提示更新。');
      else Alert.alert(compare(version, current) > 0 ? '发现新版本' : '已是最新版本', compare(version, current) > 0 ? `App Store 最新版本为 ${version}` : `当前版本 ${current} 已是最新版`);
    } catch (error) { Alert.alert('检查失败', error instanceof Error ? error.message : '请检查网络'); }
    finally { setChecking(false); }
  };

  return <Screen title="版本与更新" subtitle="检查正式版和测试版更新" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={styles.hero}><Text style={styles.logo}>WR</Text><Text style={styles.name}>WarRescue</Text><Text style={styles.version}>当前版本 {current}</Text>{latest ? <Text style={styles.latest}>App Store 最新版本 {latest}</Text> : null}</View>
    <View style={styles.card}><Text style={styles.title}>更新检查</Text><Text style={styles.body}>正式发布后可从 App Store 更新；TestFlight 测试员可在 TestFlight App 中查看并安装测试版本。</Text><Pressable style={styles.primary} onPress={() => void check()} disabled={checking}>{checking ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>检查更新</Text>}</Pressable><Pressable style={styles.outline} onPress={() => void Linking.openURL(`itms-apps://apps.apple.com/app/id${APP_ID}`)}><Text style={styles.outlineText}>打开 App Store</Text></Pressable><Pressable style={styles.outline} onPress={() => void Linking.openURL('itms-beta://')}><Text style={styles.outlineText}>打开 TestFlight</Text></Pressable></View>
  </Screen>;
}

function compare(left: string, right: string) { const a = left.split('.').map(Number); const b = right.split('.').map(Number); for (let i = 0; i < Math.max(a.length, b.length); i += 1) { const delta = (a[i] || 0) - (b[i] || 0); if (delta) return delta; } return 0; }
const styles = StyleSheet.create({ back: { color: colors.info, fontWeight: '800' }, hero: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm }, logo: { width: 72, height: 72, borderRadius: 22, textAlign: 'center', lineHeight: 72, backgroundColor: colors.danger, color: colors.white, fontSize: 24, fontWeight: '900' }, name: { color: colors.text, fontSize: 27, fontWeight: '900' }, version: { color: colors.text, fontWeight: '800' }, latest: { color: colors.safe }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, title: { color: colors.text, fontSize: 18, fontWeight: '900' }, body: { color: colors.muted, lineHeight: 21 }, primary: { height: 50, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.white, fontWeight: '900' }, outline: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.info, alignItems: 'center', justifyContent: 'center' }, outlineText: { color: colors.info, fontWeight: '900' } });
