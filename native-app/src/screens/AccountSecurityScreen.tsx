import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'AccountSecurity'>;

export function AccountSecurityScreen({ navigation }: Props) {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setIdentity(data.user?.email || data.user?.phone || '')); }, []);

  const updatePassword = async () => {
    if (password.length < 8) return Alert.alert('密码过短', '新密码至少需要 8 位');
    if (password !== confirmPassword) return Alert.alert('密码不一致', '请重新确认新密码');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) Alert.alert('修改失败', error.message);
    else { setPassword(''); setConfirmPassword(''); Alert.alert('修改成功', '新密码已生效'); }
  };
  const logoutAll = () => Alert.alert('退出所有设备', '其他设备上的登录状态也会失效。', [{ text: '取消', style: 'cancel' }, { text: '退出', style: 'destructive', onPress: () => void supabase.auth.signOut({ scope: 'global' }) }]);
  const deleteAccount = () => Alert.alert('永久注销账号', '此操作会删除账号和关联数据，无法撤销。', [{ text: '取消', style: 'cancel' }, { text: '永久删除', style: 'destructive', onPress: async () => { setBusy(true); const { data, error } = await supabase.functions.invoke('delete-account'); setBusy(false); if (error || !data?.success) Alert.alert('注销失败', data?.error || error?.message || '请联系客服'); else await supabase.auth.signOut(); } }]);

  return <Screen title="账号安全" subtitle={identity} action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={styles.card}><Text style={styles.title}>修改密码</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="新密码（至少8位）" placeholderTextColor={colors.muted} secureTextEntry /><TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="再次输入新密码" placeholderTextColor={colors.muted} secureTextEntry /><Pressable style={styles.primary} onPress={updatePassword} disabled={busy}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>保存新密码</Text>}</Pressable></View>
    <View style={styles.card}><Text style={styles.title}>登录设备</Text><Text style={styles.body}>如果怀疑账号被他人使用，可以立即使所有设备的登录状态失效。</Text><Pressable style={styles.outline} onPress={logoutAll}><Text style={styles.outlineText}>退出所有设备</Text></Pressable></View>
    <View style={[styles.card, styles.dangerCard]}><Text style={styles.title}>注销账号</Text><Text style={styles.body}>永久删除账号、资料以及法律允许删除的关联记录。</Text><Pressable style={styles.delete} onPress={deleteAccount} disabled={busy}><Text style={styles.deleteText}>永久注销账号</Text></Pressable></View>
  </Screen>;
}

const styles = StyleSheet.create({ back: { color: colors.info, fontWeight: '800' }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }, dangerCard: { borderColor: '#EF444466' }, title: { color: colors.text, fontSize: 17, fontWeight: '900' }, body: { color: colors.muted, lineHeight: 21 }, input: { height: 52, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.background, paddingHorizontal: spacing.md }, primary: { height: 50, borderRadius: radius.sm, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: colors.white, fontWeight: '900' }, outline: { height: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.warning, alignItems: 'center', justifyContent: 'center' }, outlineText: { color: colors.warning, fontWeight: '800' }, delete: { height: 48, borderRadius: radius.sm, backgroundColor: '#7F1D1D88', alignItems: 'center', justifyContent: 'center' }, deleteText: { color: '#FCA5A5', fontWeight: '900' } });
