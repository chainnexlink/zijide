import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Network from 'expo-network';

import { colors } from '../theme';

export function ConnectivityBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    void Network.getNetworkStateAsync().then((state) => setOffline(state.isConnected === false || state.isInternetReachable === false));
    const subscription = Network.addNetworkStateListener((state) => setOffline(state.isConnected === false || state.isInternetReachable === false));
    return () => subscription.remove();
  }, []);

  if (!offline) return null;
  return <View accessibilityRole="alert" style={styles.banner}><Text style={styles.text}>当前处于离线状态 · 将优先使用已保存的安全数据</Text></View>;
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', zIndex: 1000, top: 0, left: 0, right: 0, minHeight: 30, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warning },
  text: { color: '#111827', fontSize: 12, fontWeight: '900', textAlign: 'center' },
});
