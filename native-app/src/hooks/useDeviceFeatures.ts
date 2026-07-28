import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

import { supabase } from '../lib/supabase';
import { configureBackgroundLocation } from '../lib/backgroundLocation';

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
      // Permission prompts must only follow an explicit user action. In particular,
      // do not re-prompt after the user chose "暂不授权" during onboarding.
      if (current.status !== 'granted' || cancelled) return;

      const nativeToken = await Notifications.getDevicePushTokenAsync();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // The security-definer RPC atomically transfers a device token when the
      // same physical device signs in to a different account.
      const { error } = await supabase.rpc('register_device_token', {
        p_token: String(nativeToken.data),
        p_platform: Platform.OS,
      });
      if (error) throw error;
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
      // Background synchronization observes existing permission only. Permission
      // prompts belong to onboarding/permission center or a location feature.
      if (permission.status !== 'granted' || cancelled) return;
      const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await supabase.from('user_alert_settings').upsert({ user_id: user.id, last_latitude: point.coords.latitude, last_longitude: point.coords.longitude, location_updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    };
    void sync().catch((error) => console.warn('Alert location sync failed', error));
    const timer = setInterval(() => void sync().catch(() => undefined), 15 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [enabled]);
}

export function useBackgroundSafetyMonitoring(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return;
    let cancelled = false;
    void supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user || cancelled) return;
      const { data: settings } = await supabase.from('user_alert_settings').select('background_monitor_enabled').eq('user_id', auth.user.id).maybeSingle();
      if (!cancelled) await configureBackgroundLocation(settings?.background_monitor_enabled === true);
    }).catch((error) => console.warn('Background monitoring setup failed', error));
    return () => { cancelled = true; };
  }, [enabled]);
}
