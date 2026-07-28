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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import { checkPassword } from '../lib/password';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';

type AuthMode = 'login' | 'register';
type AuthMethod = 'phone' | 'email';
type PhoneLoginMode = 'password' | 'otp';

const friendlyError = (message: string) => {
  const value = message.toLowerCase();
  if (value.includes('invalid login credentials')) return '邮箱或密码不正确';
  if (value.includes('email not confirmed')) return '请先打开验证邮件完成邮箱验证';
  if (value.includes('user already registered')) return '该邮箱已经注册，请直接登录';
  if (value.includes('password should be')) return '密码至少需要8位，并同时包含字母和数字';
  if (value.includes('rate limit')) return '操作过于频繁，请稍后再试';
  if (value.includes('sms service not configured')) return '短信服务暂未配置，请联系管理员';
  if (value.includes('sms send failed')) return '验证码发送失败，请稍后再试';
  if (value.includes('invalid or expired code')) return '验证码错误或已过期';
  if (value.includes('signups not allowed for otp') || value.includes('phone account not found')) return '该手机号尚未注册，请点击“立即注册”创建账号';
  if (value.includes('phone number already registered')) return '该手机号已经注册，请返回登录';
  if (value.includes('linked to an email account')) return '该手机号已绑定邮箱账号，请使用邮箱登录';
  if (value.includes('please wait 60 seconds')) return '验证码发送过于频繁，请等待60秒后重试';
  if (value.includes('provider is not enabled') || value.includes('unsupported provider')) return '该登录方式尚未在后台启用，请使用手机或邮箱登录';
  return message;
};

export function AuthScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [mode, setMode] = useState<AuthMode>('login');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [phoneLoginMode, setPhoneLoginMode] = useState<PhoneLoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
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
  const passwordCheck = useMemo(() => checkPassword(password), [password]);
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
    const { data, error } = await supabase.functions.invoke('subscription', {
      body: {
        action: 'send-sms-code',
        phone: normalizedPhone,
        countryCode: normalizedCountryCode,
        purpose: mode === 'register' ? 'register' : 'login',
      },
    });
    setLoading(false);

    if (error || !data?.success) {
      setMessage(friendlyError(data?.error || error?.message || '验证码发送失败'));
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
    if (mode === 'login' && phoneLoginMode === 'password') {
      if (!password) {
        setMessage('请输入密码');
        return;
      }
      setLoading(true);
      setMessage('');
      const { error } = await supabase.auth.signInWithPassword({ phone: `${normalizedCountryCode}${normalizedPhone}`, password });
      setLoading(false);
      if (error) setMessage(friendlyError(error.message));
      return;
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      setMessage('请输入 6 位短信验证码');
      return;
    }
    if (mode === 'register' && !passwordCheck.valid) {
      setMessage(passwordCheck.message);
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setMessage('两次输入的密码不一致');
      return;
    }
    if (mode === 'register' && !agreed) {
      setMessage('注册前请阅读并同意用户协议与隐私政策');
      return;
    }

    setLoading(true);
    setMessage('');
    const verifyResult = await supabase.functions.invoke('subscription', {
      body: {
        action: 'verify-sms-code',
        phone: normalizedPhone,
        countryCode: normalizedCountryCode,
        code: verificationCode,
        purpose: mode === 'register' ? 'register' : 'login',
        inviteCode: mode === 'register' ? inviteCode.trim() : undefined,
        deviceId: `${Platform.OS}-native-app`,
      },
    });
    const tokenHash = verifyResult.data?.auth?.tokenHash;
    if (verifyResult.error || verifyResult.data?.error || !tokenHash) {
      setLoading(false);
      setMessage(friendlyError(verifyResult.data?.error || verifyResult.error?.message || '验证码验证失败'));
      return;
    }
    const { error: sessionError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
    if (sessionError) {
      setLoading(false);
      setMessage(friendlyError(sessionError.message));
      return;
    }

    if (mode === 'register') {
      const passwordResult = await supabase.auth.updateUser({ password });
      if (passwordResult.error) {
        setLoading(false);
        await supabase.auth.signOut();
        setMessage(friendlyError(passwordResult.error.message));
        return;
      }
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
    if (mode === 'register' && !passwordCheck.valid) {
      setMessage(passwordCheck.message);
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setMessage('两次输入的密码不一致');
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
      if (!password) {
        setLoading(false);
        setMessage('请输入密码');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      setLoading(false);
      if (error) setMessage(friendlyError(error.message));
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: 'warrescue://auth-callback',
        data: { invite_code: inviteCode.trim() || undefined },
      },
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
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: { emailRedirectTo: 'warrescue://auth-callback' },
    });
    setLoading(false);
    setMessage(error ? friendlyError(error.message) : '验证邮件已重新发送，请检查收件箱和垃圾邮件');
  };

  const resetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setMessage('请先输入注册时使用的邮箱');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: 'warrescue://reset-password' });
    setLoading(false);
    setMessage(error ? friendlyError(error.message) : '密码重置邮件已发送，请检查收件箱和垃圾邮件');
  };

  const switchMode = () => {
    setMode((value) => (value === 'login' ? 'register' : 'login'));
    setVerificationCode('');
    setConfirmPassword('');
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
                {mode === 'login' ? <View style={styles.loginModeRow}><Pressable onPress={() => { setPhoneLoginMode('password'); resetFeedback(); }}><Text style={[styles.loginModeText, phoneLoginMode === 'password' && styles.loginModeActive]}>密码登录</Text></Pressable><Text style={styles.loginModeDivider}>|</Text><Pressable onPress={() => { setPhoneLoginMode('otp'); resetFeedback(); }}><Text style={[styles.loginModeText, phoneLoginMode === 'otp' && styles.loginModeActive]}>验证码登录</Text></Pressable></View> : null}
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
                {mode === 'register' || phoneLoginMode === 'otp' ? <View style={styles.phoneRow}>
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
                </View> : null}
                {mode === 'register' || phoneLoginMode === 'password' ? <>
                  <View style={styles.passwordWrap}>
                    <TextInput style={styles.passwordInput} value={password} onChangeText={(value) => setPassword(value.slice(0, 128))} placeholder={mode === 'register' ? '设置密码（至少8位，包含字母和数字）' : '密码'} placeholderTextColor={colors.muted} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
                    <Pressable style={styles.passwordToggle} onPress={() => setPasswordVisible((value) => !value)}><Text style={styles.passwordToggleText}>{passwordVisible ? '隐藏' : '显示'}</Text></Pressable>
                  </View>
                  {mode === 'register' ? <><Text style={[styles.passwordHint, passwordCheck.valid && styles.passwordHintValid]}>密码强度：{passwordCheck.label} · {passwordCheck.message}</Text><TextInput style={styles.input} value={confirmPassword} onChangeText={(value) => setConfirmPassword(value.slice(0, 128))} placeholder="再次输入密码" placeholderTextColor={colors.muted} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} /></> : null}
                </> : null}
              </>
            ) : (
              <>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="邮箱" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                <View style={styles.passwordWrap}>
                  <TextInput style={styles.passwordInput} value={password} onChangeText={(value) => setPassword(value.slice(0, 128))} placeholder={mode === 'login' ? '密码' : '密码（至少8位，包含字母和数字）'} placeholderTextColor={colors.muted} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} textContentType={mode === 'login' ? 'password' : 'newPassword'} />
                  <Pressable style={styles.passwordToggle} onPress={() => setPasswordVisible((value) => !value)}><Text style={styles.passwordToggleText}>{passwordVisible ? '隐藏' : '显示'}</Text></Pressable>
                </View>
                {mode === 'register' ? <>
                  <Text style={[styles.passwordHint, passwordCheck.valid && styles.passwordHintValid]}>密码强度：{passwordCheck.label} · {passwordCheck.message}</Text>
                  <TextInput style={styles.input} value={confirmPassword} onChangeText={(value) => setConfirmPassword(value.slice(0, 128))} placeholder="再次输入密码" placeholderTextColor={colors.muted} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" />
                </> : null}
              </>
            )}

            {mode === 'register' ? (
              <>
                <TextInput style={styles.input} value={inviteCode} onChangeText={setInviteCode} placeholder="邀请码（选填）" placeholderTextColor={colors.muted} autoCapitalize="characters" />
                <View style={styles.agreement}>
                  <Pressable onPress={() => setAgreed((value) => !value)}>
                  <View style={[styles.checkbox, agreed && styles.checkboxChecked]}><Text style={styles.checkmark}>{agreed ? '✓' : ''}</Text></View>
                  </Pressable>
                  <Text style={styles.agreementText}>我已阅读并同意</Text>
                  <Pressable onPress={() => navigation.navigate('LegalDocument', { kind: 'terms' })}><Text style={styles.legalLink}>《用户协议》</Text></Pressable>
                  <Text style={styles.agreementText}>和</Text>
                  <Pressable onPress={() => navigation.navigate('LegalDocument', { kind: 'privacy' })}><Text style={styles.legalLink}>《隐私政策》</Text></Pressable>
                </View>
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
            {mode === 'login' && method === 'email' ? <Pressable onPress={resetPassword} disabled={loading}><Text style={styles.forgotText}>忘记密码？发送重置邮件</Text></Pressable> : null}
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
  passwordWrap: { height: 52, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  passwordInput: { flex: 1, height: 50, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
  passwordToggle: { height: 50, justifyContent: 'center', paddingHorizontal: spacing.md },
  passwordToggleText: { color: colors.info, fontWeight: '800' },
  passwordHint: { color: colors.warning, fontSize: 12, lineHeight: 18 },
  passwordHintValid: { color: colors.safe },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  countryInput: { width: 82 },
  phoneInput: { flex: 1 },
  codeButton: { minWidth: 118, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  codeButtonText: { color: colors.danger, fontWeight: '800' },
  agreement: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.danger, borderColor: colors.danger },
  checkmark: { color: colors.white, fontWeight: '900' },
  agreementText: { color: colors.muted, lineHeight: 20 },
  legalLink: { color: colors.info, fontWeight: '800', lineHeight: 20 },
  message: { color: colors.warning, lineHeight: 20 },
  success: { color: colors.safe },
  primary: { height: 52, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  secondary: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.info, fontWeight: '800' },
  switchText: { color: colors.info, textAlign: 'center', fontWeight: '700' },
  forgotText: { color: colors.muted, textAlign: 'center', fontWeight: '700' },
  disabled: { opacity: 0.55 },
  loginModeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm },
  loginModeText: { color: colors.muted, fontWeight: '700' },
  loginModeActive: { color: colors.info },
  loginModeDivider: { color: colors.border },
  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  socialLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  socialDividerText: { color: colors.muted, fontSize: 12 },
  socialRow: { gap: spacing.sm },
  appleButton: { width: '100%', height: 48 },
  googleButton: { height: 48, borderRadius: radius.md, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  googleText: { color: '#1F2937', fontWeight: '800' },
});
