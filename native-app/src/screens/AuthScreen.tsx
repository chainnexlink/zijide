import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';

type AuthMode = 'login' | 'register';
type AuthMethod = 'phone' | 'email';

const friendlyError = (message: string) => {
  const value = message.toLowerCase();
  if (value.includes('invalid login credentials')) return '邮箱或密码不正确';
  if (value.includes('email not confirmed')) return '请先打开验证邮件完成邮箱验证';
  if (value.includes('user already registered')) return '该邮箱已经注册，请直接登录';
  if (value.includes('password should be')) return '密码至少需要 6 位';
  if (value.includes('rate limit')) return '操作过于频繁，请稍后再试';
  if (value.includes('sms service not configured')) return '短信服务暂未配置，请联系管理员';
  if (value.includes('sms send failed')) return '验证码发送失败，请稍后再试';
  if (value.includes('invalid or expired code')) return '验证码错误或已过期';
  return message;
};

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+86');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const normalizedCountryCode = useMemo(() => {
    const digits = countryCode.replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }, [countryCode]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const resetFeedback = () => {
    setMessage('');
    setEmailSent(false);
  };

  const sendPhoneCode = async () => {
    if (!normalizedCountryCode || normalizedPhone.length < 6) {
      setMessage('请输入有效的国家/地区代码和手机号');
      return;
    }

    setLoading(true);
    setMessage('');
    const fullPhone = `${normalizedCountryCode}${normalizedPhone}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: {
        shouldCreateUser: true,
        data: mode === 'register' ? { invite_code: inviteCode.trim() || undefined } : undefined,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(friendlyError(error.message));
      return;
    }

    setCountdown(60);
    setMessage(`验证码已发送至 ${normalizedCountryCode} ${normalizedPhone}`);
  };

  const submitPhone = async () => {
    if (!normalizedCountryCode || normalizedPhone.length < 6) {
      setMessage('请输入有效的国家/地区代码和手机号');
      return;
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      setMessage('请输入 6 位短信验证码');
      return;
    }
    if (mode === 'register' && !agreed) {
      setMessage('注册前请阅读并同意用户协议与隐私政策');
      return;
    }

    setLoading(true);
    setMessage('');
    const fullPhone = `${normalizedCountryCode}${normalizedPhone}`;
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: verificationCode,
      type: 'sms',
    });

    if (error || !data.session) {
      setLoading(false);
      setMessage(friendlyError(error?.message || '验证码验证失败'));
      return;
    }

    const profileResult = await supabase.functions.invoke('subscription', {
      body: {
        action: 'complete-phone-profile',
        inviteCode: mode === 'register' ? inviteCode.trim() : undefined,
        deviceId: `${Platform.OS}-native-app`,
      },
    });
    setLoading(false);
    if (profileResult.error || !profileResult.data?.success) {
      await supabase.auth.signOut();
      setMessage(friendlyError(profileResult.data?.error || profileResult.error?.message || '账户资料初始化失败'));
    }
  };

  const submitEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setMessage('请输入有效邮箱地址');
      return;
    }
    if (password.length < 6) {
      setMessage('密码至少需要 6 位');
      return;
    }
    if (mode === 'register' && !agreed) {
      setMessage('注册前请阅读并同意用户协议与隐私政策');
      return;
    }

    setLoading(true);
    setMessage('');
    setEmailSent(false);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      setLoading(false);
      if (error) setMessage(friendlyError(error.message));
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { invite_code: inviteCode.trim() || undefined } },
    });
    setLoading(false);
    if (error) {
      setMessage(friendlyError(error.message));
      return;
    }
    if (!data.session) {
      setEmailSent(true);
      setMessage(`验证邮件已发送至 ${cleanEmail}，请打开邮件完成验证后再登录`);
    }
  };

  const resendEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setMessage('请输入注册时使用的邮箱');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
    setLoading(false);
    setMessage(error ? friendlyError(error.message) : '验证邮件已重新发送，请检查收件箱和垃圾邮件');
  };

  const switchMode = () => {
    setMode((value) => (value === 'login' ? 'register' : 'login'));
    setVerificationCode('');
    resetFeedback();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.mark}><Text style={styles.markText}>WR</Text></View>
            <Text style={styles.name}>WarRescue</Text>
            <Text style={styles.slogan}>真正为紧急时刻设计的移动 App</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{mode === 'login' ? '欢迎回来' : '创建账号'}</Text>
            <View style={styles.segment}>
              <Pressable style={[styles.segmentItem, method === 'phone' && styles.segmentActive]} onPress={() => { setMethod('phone'); resetFeedback(); }}>
                <Text style={[styles.segmentText, method === 'phone' && styles.segmentTextActive]}>手机验证码</Text>
              </Pressable>
              <Pressable style={[styles.segmentItem, method === 'email' && styles.segmentActive]} onPress={() => { setMethod('email'); resetFeedback(); }}>
                <Text style={[styles.segmentText, method === 'email' && styles.segmentTextActive]}>邮箱密码</Text>
              </Pressable>
            </View>

            {method === 'phone' ? (
              <>
                <View style={styles.phoneRow}>
                  <TextInput
                    style={[styles.input, styles.countryInput]}
                    value={countryCode}
                    onChangeText={setCountryCode}
                    placeholder="+86"
                    placeholderTextColor={colors.muted}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="手机号"
                    placeholderTextColor={colors.muted}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.phoneRow}>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={verificationCode}
                    onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6 位验证码"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Pressable style={[styles.codeButton, (loading || countdown > 0) && styles.disabled]} onPress={sendPhoneCode} disabled={loading || countdown > 0}>
                    <Text style={styles.codeButtonText}>{countdown > 0 ? `${countdown} 秒` : '获取验证码'}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="邮箱" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="密码（至少 6 位）" placeholderTextColor={colors.muted} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </>
            )}

            {mode === 'register' ? (
              <>
                <TextInput style={styles.input} value={inviteCode} onChangeText={setInviteCode} placeholder="邀请码（选填）" placeholderTextColor={colors.muted} autoCapitalize="characters" />
                <Pressable style={styles.agreement} onPress={() => setAgreed((value) => !value)}>
                  <View style={[styles.checkbox, agreed && styles.checkboxChecked]}><Text style={styles.checkmark}>{agreed ? '✓' : ''}</Text></View>
                  <Text style={styles.agreementText}>我已阅读并同意《用户协议》和《隐私政策》</Text>
                </Pressable>
              </>
            ) : null}

            {message ? <Text style={[styles.message, emailSent && styles.success]}>{message}</Text> : null}
            {emailSent ? (
              <Pressable style={styles.secondary} onPress={resendEmail} disabled={loading}>
                <Text style={styles.secondaryText}>重新发送验证邮件</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.primary, loading && styles.disabled]} onPress={method === 'phone' ? submitPhone : submitEmail} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{mode === 'login' ? '登录' : '注册'}</Text>}
            </Pressable>
            <Pressable onPress={switchMode}>
              <Text style={styles.switchText}>{mode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  wrap: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingVertical: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  mark: { width: 74, height: 74, borderRadius: 24, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', shadowColor: colors.danger, shadowOpacity: 0.4, shadowRadius: 20 },
  markText: { color: colors.white, fontSize: 24, fontWeight: '900' },
  name: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: spacing.md },
  slogan: { color: colors.muted, marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  segment: { flexDirection: 'row', borderRadius: radius.md, backgroundColor: colors.background, padding: 4 },
  segmentItem: { flex: 1, minHeight: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surfaceRaised },
  segmentText: { color: colors.muted, fontWeight: '700' },
  segmentTextActive: { color: colors.text },
  input: { height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.background, paddingHorizontal: spacing.md, fontSize: 16 },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  countryInput: { width: 82 },
  phoneInput: { flex: 1 },
  codeButton: { minWidth: 118, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  codeButtonText: { color: colors.danger, fontWeight: '800' },
  agreement: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.danger, borderColor: colors.danger },
  checkmark: { color: colors.white, fontWeight: '900' },
  agreementText: { flex: 1, color: colors.muted, lineHeight: 20 },
  message: { color: colors.warning, lineHeight: 20 },
  success: { color: colors.safe },
  primary: { height: 52, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  secondary: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.info, fontWeight: '800' },
  switchText: { color: colors.info, textAlign: 'center', fontWeight: '700' },
  disabled: { opacity: 0.55 },
});
