import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../theme';

const pages = [
  { icon: '!', title: '可信预警', body: '集中查看风险等级、来源、危险范围和行动建议，并保留预警历史。' },
  { icon: '⌖', title: '避难与安全路线', body: '使用当前位置查找附近避难所、危险区域和更安全的撤离路线。' },
  { icon: 'SOS', title: '紧急求救与家人守护', body: '真实危险时长按 SOS；同时联动紧急联系人、家庭和互助人员。SOS 不能替代当地紧急电话。' },
  { icon: '✓', title: '准备完成', body: '允许通知和定位后，WarRescue 才能及时显示附近风险并发送重要预警。你也可以稍后在权限中心修改。' },
];

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const page = pages[index]!;
  const finish = async () => {
    await Promise.allSettled([Notifications.requestPermissionsAsync(), Location.requestForegroundPermissionsAsync()]);
    onComplete();
  };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.page}>
      <View style={styles.top}><Text style={styles.brand}>WarRescue</Text><Pressable onPress={onComplete}><Text style={styles.skip}>跳过</Text></Pressable></View>
      <View style={styles.content}><Text style={styles.icon}>{page.icon}</Text><Text style={styles.title}>{page.title}</Text><Text style={styles.body}>{page.body}</Text></View>
      <View style={styles.bottom}><View style={styles.dots}>{pages.map((_, dot) => <View key={dot} style={[styles.dot, dot === index && styles.dotActive]} />)}</View>{index < pages.length - 1 ? <Pressable style={styles.primary} onPress={() => setIndex((value) => value + 1)}><Text style={styles.primaryText}>继续</Text></Pressable> : <><Pressable style={styles.primary} onPress={() => void finish()}><Text style={styles.primaryText}>允许权限并开始</Text></Pressable><Pressable style={styles.secondary} onPress={onComplete}><Text style={styles.secondaryText}>暂不授权</Text></Pressable></>}</View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, padding: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.text, fontSize: 20, fontWeight: '900' },
  skip: { color: colors.muted, fontWeight: '800' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  icon: { width: 104, height: 104, borderRadius: 34, backgroundColor: colors.danger, color: colors.white, textAlign: 'center', lineHeight: 104, fontSize: 29, fontWeight: '900' },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', textAlign: 'center', marginTop: spacing.xl },
  body: { color: '#CBD5E1', fontSize: 16, lineHeight: 25, textAlign: 'center', marginTop: spacing.md },
  bottom: { gap: spacing.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 25, backgroundColor: colors.danger },
  primary: { height: 52, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  secondary: { height: 45, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.muted, fontWeight: '800' },
});
