import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      setMessage('请输入有效邮箱和至少 6 位密码');
      return;
    }
    setLoading(true);
    setMessage('');
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === 'register' && !result.data.session) setMessage('注册成功，请前往邮箱完成验证');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.brand}>
          <View style={styles.mark}><Text style={styles.markText}>WR</Text></View>
          <Text style={styles.name}>WarRescue</Text>
          <Text style={styles.slogan}>真正为紧急时刻设计的移动 App</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{mode === 'login' ? '欢迎回来' : '创建账号'}</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="邮箱" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="密码" placeholderTextColor={colors.muted} secureTextEntry />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable style={styles.primary} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{mode === 'login' ? '登录' : '注册'}</Text>}
          </Pressable>
          <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}>
            <Text style={styles.switchText}>{mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  wrap: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  mark: { width: 74, height: 74, borderRadius: 24, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', shadowColor: colors.danger, shadowOpacity: 0.4, shadowRadius: 20 },
  markText: { color: colors.white, fontSize: 24, fontWeight: '900' },
  name: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: spacing.md },
  slogan: { color: colors.muted, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  input: { height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.background, paddingHorizontal: spacing.md, fontSize: 16 },
  message: { color: colors.warning, lineHeight: 20 },
  primary: { height: 52, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  switchText: { color: colors.info, textAlign: 'center', fontWeight: '700' },
});
