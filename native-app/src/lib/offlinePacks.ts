import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export type OfflinePack = {
  city: string;
  country: string;
  path: string;
  size: number;
  downloadedAt: string;
  alerts: number;
  shelters: number;
};

type OfflinePayload = {
  alerts?: unknown[];
  shelters?: unknown[];
};

export async function readOfflineCollection<T>(key: 'alerts' | 'shelters'): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem('offline-map-packs');
    const packs = raw ? JSON.parse(raw) as OfflinePack[] : [];
    const values = await Promise.all(packs.map(async (pack) => {
      const info = await FileSystem.getInfoAsync(pack.path);
      if (!info.exists) return [] as T[];
      const payload = JSON.parse(await FileSystem.readAsStringAsync(pack.path)) as OfflinePayload;
      return (payload[key] || []) as T[];
    }));
    const unique = new Map<string, T>();
    values.flat().forEach((item) => {
      const id = (item as { id?: string }).id;
      if (id) unique.set(id, item);
    });
    return [...unique.values()];
  } catch {
    return [];
  }
}
