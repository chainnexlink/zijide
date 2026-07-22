import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from './supabase';

export const BACKGROUND_LOCATION_TASK = 'warrescue-background-location';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations || [];
  const point = locations.at(-1);
  if (!point) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('user_alert_settings').upsert({
    user_id: auth.user.id,
    last_latitude: point.coords.latitude,
    last_longitude: point.coords.longitude,
    location_updated_at: new Date(point.timestamp).toISOString(),
  }, { onConflict: 'user_id' });
});

export async function configureBackgroundLocation(enabled: boolean) {
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  if (!enabled) {
    if (registered) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    return false;
  }
  const background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== 'granted') return false;
  if (!registered) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 500,
      timeInterval: 15 * 60 * 1000,
      deferredUpdatesDistance: 1000,
      deferredUpdatesInterval: 15 * 60 * 1000,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: Platform.OS === 'android' ? {
        notificationTitle: 'WarRescue 安全监控',
        notificationBody: '正在更新附近预警与家庭安全位置',
        notificationColor: '#EF4444',
      } : undefined,
    });
  }
  return true;
}
