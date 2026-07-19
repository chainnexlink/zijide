import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return;

    let cancelled = false;
    const register = async () => {
      const current = await Notifications.getPermissionsAsync();
      const permission = current.status === 'granted'
        ? current
        : await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted' || cancelled) return;

      const nativeToken = await Notifications.getDevicePushTokenAsync();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      await supabase.from('device_tokens').upsert({
        user_id: user.id,
        token: String(nativeToken.data),
        platform: Platform.OS,
        enabled: true,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'token' });
    };

    void register().catch((error) => console.warn('Push registration failed', error));
    return () => { cancelled = true; };
  }, [enabled]);
}
