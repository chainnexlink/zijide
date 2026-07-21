import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';
import { supabase } from './src/lib/supabase';

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
      const fragment = url.split('#')[1] || url.split('?')[1] || '';
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token'); const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    };
    void Linking.getInitialURL().then(async (url) => { if (url) await handleUrl({ url }); });
    const subscription = Linking.addEventListener('url', (event) => { void handleUrl(event); });
    return () => subscription.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme} linking={{ prefixes: ['warrescue://'], config: { screens: { PasswordReset: 'reset-password' } } }}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
