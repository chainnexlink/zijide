/**
 * 原生推送桥接 (Capacitor)
 * - iOS: APNs（设备返回 APNs token）
 * - Android: FCM（设备返回 FCM token，需 google-services.json）
 *
 * 仅在原生平台生效；Web 环境下所有方法安全空转。
 * 真正的“关屏/退后台下发”由后端 push-dispatch 云函数完成（见 P2 后端）。
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../supabase/client';

export interface IncomingPush {
  title: string;
  body: string;
  type?: string;
  severity?: 'red' | 'orange' | 'yellow';
  data?: any;
}

export interface PushHandlers {
  onForeground?: (n: IncomingPush) => void;
  onTap?: (data: any) => void;
}

export function isNativePush(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

let initialized = false;

/**
 * 初始化推送：创建高优先级渠道(安卓)、绑定监听、请求权限并注册。
 * 登录后调用一次（见 usePushRegistration）。
 */
export async function initPush(handlers: PushHandlers = {}): Promise<void> {
  if (!isNativePush() || initialized) return;
  initialized = true;

  // 安卓：创建“预警”高优先级渠道（heads-up + 声音 + 震动）
  if (Capacitor.getPlatform() === 'android') {
    try {
      await PushNotifications.createChannel({
        id: 'alerts',
        name: '预警通知',
        description: '空袭 / 炮击 / 化学等紧急预警',
        importance: 5, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        vibration: true,
        lights: true,
      });
    } catch (e) {
      console.warn('createChannel(alerts) failed:', e);
    }
  }

  PushNotifications.addListener('registration', (token) => {
    void saveToken(token.value);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('push registrationError:', err);
  });

  // 前台收到推送：交给上层做应用内提示 + 声音
  PushNotifications.addListener('pushNotificationReceived', (n) => {
    handlers.onForeground?.({
      title: n.title || n.data?.title || '预警',
      body: n.body || n.data?.body || '',
      type: n.data?.type,
      severity: n.data?.severity,
      data: n.data,
    });
  });

  // 用户点击通知
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    handlers.onTap?.(action.notification?.data || {});
  });

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive === 'granted') {
    await PushNotifications.register();
  }
}

async function saveToken(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const platform = Capacitor.getPlatform(); // 'ios' | 'android'
    await supabase.from('device_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform,
        enabled: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );
  } catch (e) {
    console.error('saveToken failed:', e);
  }
}
