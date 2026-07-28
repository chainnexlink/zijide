import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator, type RootStackParams } from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { supabase } from './src/lib/supabase';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { ConnectivityBanner } from './src/components/ConnectivityBanner';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { BIOMETRIC_LOCK_KEY } from './src/screens/AppSecurityScreen';

const ONBOARDING_KEY = 'onboarding-completed-v1';
const navigationRef = createNavigationContainerRef<RootStackParams>();
let pendingNotification: Record<string, unknown> | null = null;

async function openNotification(data: Record<string, unknown>) {
  pendingNotification = data;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !navigationRef.isReady()) return;
  const alertId = String(data.alert_id || data.alertId || '');
  const sosId = String(data.sos_id || data.sosId || '');
  if (alertId) navigationRef.navigate('AlertDetail', { alertId });
  else if (sosId) navigationRef.navigate('SOSHistory');
  else navigationRef.navigate('Notifications');
  pendingNotification = null;
}

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.danger,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
  },
};

export default function App() {
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      const query = (url.split('?')[1] || '').split('#')[0] || '';
      const fragment = url.split('#')[1] || '';
      const params = new URLSearchParams([query, fragment].filter(Boolean).join('&'));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const authorizationCode = params.get('code');
      const tokenHash = params.get('token_hash');
      const type = params.get('type');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      } else if (authorizationCode) {
        await supabase.auth.exchangeCodeForSession(authorizationCode);
      } else if (tokenHash && type && ['email', 'signup', 'invite', 'magiclink', 'recovery', 'email_change'].includes(type)) {
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'email' | 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change',
        });
      }
    };
    void Linking.getInitialURL().then(async (url) => { if (url) await handleUrl({ url }); });
    const subscription = Linking.addEventListener('url', (event) => { void handleUrl(event); });
    return () => subscription.remove();
  }, []);
  return <AppErrorBoundary><SafeAreaProvider><AppAccessGate /></SafeAreaProvider></AppErrorBoundary>;
}

function AppAccessGate() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  const authenticate = useCallback(async () => {
    setUnlocking(true);
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: '解锁 WarRescue', cancelLabel: '取消', disableDeviceFallback: false });
    setUnlocked(result.success);
    setUnlocking(false);
  }, []);

  useEffect(() => { void (async () => {
    const [seen, lock] = await Promise.all([AsyncStorage.getItem(ONBOARDING_KEY), AsyncStorage.getItem(BIOMETRIC_LOCK_KEY)]);
    setOnboarded(seen === 'true');
    if (lock === 'true') { setUnlocked(false); await authenticate(); }
    setReady(true);
  })(); }, [authenticate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') backgroundAt.current = Date.now();
      if (state === 'active' && backgroundAt.current && Date.now() - backgroundAt.current > 15_000) {
        void AsyncStorage.getItem(BIOMETRIC_LOCK_KEY).then((lock) => { if (lock === 'true') { setUnlocked(false); void authenticate(); } });
        backgroundAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [authenticate]);

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void openNotification(response.notification.request.content.data as Record<string, unknown>);
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void openNotification(response.notification.request.content.data as Record<string, unknown>);
    });
    const { data: authSubscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && pendingNotification) void openNotification(pendingNotification);
    });
    return () => {
      responseSubscription.remove();
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const completeOnboarding = async () => { await AsyncStorage.setItem(ONBOARDING_KEY, 'true'); setOnboarded(true); };

  if (!ready) return <View style={styles.loading}><ActivityIndicator color={colors.danger} size="large" /></View>;
  if (!onboarded) return <OnboardingScreen onComplete={() => void completeOnboarding()} />;
  if (!unlocked) return <View style={styles.locked}><Text style={styles.lockMark}>WR</Text><Text style={styles.lockTitle}>WarRescue 已锁定</Text><Text style={styles.lockBody}>验证设备生物识别后查看安全信息。</Text><Pressable style={styles.unlock} onPress={() => void authenticate()} disabled={unlocking}>{unlocking ? <ActivityIndicator color={colors.white} /> : <Text style={styles.unlockText}>解锁 App</Text>}</Pressable><Pressable onPress={() => void supabase.auth.signOut()}><Text style={styles.signOut}>退出登录</Text></Pressable></View>;
  return <>
    <NavigationContainer
      ref={navigationRef}
      onReady={() => { if (pendingNotification) void openNotification(pendingNotification); }}
      theme={navigationTheme}
      linking={{ prefixes: ['warrescue://'], config: { screens: { PasswordReset: 'reset-password', AlertDetail: 'alert/:alertId', Notifications: 'notifications' } } }}
    >
      <StatusBar style="light" />
      <RootNavigator />
    </NavigationContainer>
    <ConnectivityBanner />
  </>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  locked: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  lockMark: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.danger, color: colors.white, lineHeight: 76, textAlign: 'center', fontSize: 24, fontWeight: '900' },
  lockTitle: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 22 },
  lockBody: { color: colors.muted, marginTop: 8, textAlign: 'center' },
  unlock: { width: '100%', height: 52, borderRadius: 16, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  unlockText: { color: colors.white, fontWeight: '900' },
  signOut: { color: colors.muted, fontWeight: '800', marginTop: 18 },
});
