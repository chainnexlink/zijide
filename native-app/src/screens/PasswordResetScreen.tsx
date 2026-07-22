import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { checkPassword } from '../lib/password';
import { supabase } from '../lib/supabase';
import type { RootStackParams } from '../navigation/RootNavigator';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParams, 'PasswordReset'>;

export function PasswordResetScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const checked = useMemo(() => checkPassword(password), [password]);

  const save = async () => {
    if (!checked.valid) return Alert.alert('密码不符合要求', checked.message);
    if (password !== confirm) return Alert.alert('密码不一致', '请重新确认');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return Alert.alert('重置失败', error.message);
    Alert.alert('密码已重置', '请使用新密码登录', [{
      text: '完成',
      onPress: async () => {
        await supabase.auth.signOut();
        navigation.navigate('Auth');
      },
    }]);
  };

  return <Screen title="重置密码" subtitle="来自验证邮件的安全链接">
    <View style={styles.card}>
      <Text style={styles.title}>设置新密码</Text>
      <TextInput style={styles.input} value={password} onChangeText={(value) => setPassword(value.slice(0, 128))} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="新密码（至少8位，包含字母和数字）" placeholderTextColor={colors.muted} />
      <Text style={[styles.hint, checked.valid && styles.valid]}>{checked.label} · {checked.message}</Text>
      <TextInput style={styles.input} value={confirm} onChangeText={(value) => setConfirm(value.slice(0, 128))} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="再次输入新密码" placeholderTextColor={colors.muted} />
      <Pressable style={styles.save} onPress={() => void save()} disabled={busy}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>保存新密码</Text>}</Pressable>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 20, fontWeight: '900' },
  input: { height: 52, borderRadius: radius.sm, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background, color: colors.text, paddingHorizontal: spacing.md },
  hint: { color: colors.warning, fontSize: 12 },
  valid: { color: colors.safe },
  save: { height: 50, borderRadius: radius.sm, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontWeight: '900' },
});
