import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

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

export function useAlertLocationSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return;
    let cancelled = false;
    const sync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: settings } = await supabase.from('user_alert_settings').select('precise_location_enabled').eq('user_id', user.id).maybeSingle();
      if (settings?.precise_location_enabled === false) return;
      const permission = await Location.getForegroundPermissionsAsync();
      const granted = permission.status === 'granted' ? permission : await Location.requestForegroundPermissionsAsync();
      if (granted.status !== 'granted' || cancelled) return;
      const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await supabase.from('user_alert_settings').upsert({ user_id: user.id, last_latitude: point.coords.latitude, last_longitude: point.coords.longitude, location_updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    };
    void sync().catch((error) => console.warn('Alert location sync failed', error));
    const timer = setInterval(() => void sync().catch(() => undefined), 15 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [enabled]);
}
