import { useEffect } from 'react';
import { initPush, isNativePush } from '../utils/push';
import { useNotification } from './useNotification';

/**
 * 登录后在原生平台注册推送：
 * - 拿到 APNs/FCM token 并存入 device_tokens
 * - 前台收到推送时，加入应用内通知列表并播放警报声
 * - 点击推送时跳转到对应预警/SOS 页面
 *
 * Web 平台自动空转。
 */
export function usePushRegistration(isAuthenticated: boolean): void {
  const { pushNotification } = useNotification();

  useEffect(() => {
    if (!isAuthenticated || !isNativePush()) return;

    void initPush({
      onForeground: (n) => {
        pushNotification({
          title: n.title,
          body: n.body,
          type: (n.type as any) || 'alert',
          severity: n.severity,
          data: n.data,
        });
      },
      onTap: (data) => {
        const alertId = data?.alertId || data?.alert_id;
        const sosId = data?.sosId || data?.sos_id;
        if (alertId) window.location.hash = `#/alert/${alertId}`;
        else if (sosId) window.location.hash = '#/sos-history';
      },
    });
    // initPush 内部有幂等保护，仅首次真正执行
  }, [isAuthenticated]);
}
