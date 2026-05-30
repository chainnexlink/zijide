/**
 * 真·离线地图引擎：把 OSM 栅格瓦片下载进 Cache API，供 Leaflet 离线读取。
 * - 真实下载 / 删除 / 体积统计；元数据持久化到 localStorage。
 * 注：OSM 公共瓦片须遵守其使用政策并署名；生产建议改用有授权的瓦片服务商（替换 TILE_URL）。
 */
export interface OfflineRegion {
  id: string;
  name: string;
  country: string;
  bbox: [number, number, number, number]; // [west, south, east, north]
  center: [number, number];               // [lat, lng]
  minZoom: number;
  maxZoom: number;
}

export const OFFLINE_REGIONS: OfflineRegion[] = [
  { id: 'kyiv',    name: '基辅 Kyiv',        country: 'Ukraine',   bbox: [30.30, 50.34, 30.72, 50.54], center: [50.45, 30.52], minZoom: 11, maxZoom: 14 },
  { id: 'kharkiv', name: '哈尔科夫 Kharkiv', country: 'Ukraine',   bbox: [36.13, 49.93, 36.40, 50.05], center: [49.99, 36.23], minZoom: 11, maxZoom: 14 },
  { id: 'odesa',   name: '敖德萨 Odesa',     country: 'Ukraine',   bbox: [30.63, 46.40, 30.83, 46.53], center: [46.48, 30.73], minZoom: 11, maxZoom: 14 },
  { id: 'telaviv', name: '特拉维夫 Tel Aviv', country: 'Israel',    bbox: [34.74, 32.04, 34.85, 32.13], center: [32.08, 34.78], minZoom: 11, maxZoom: 14 },
  { id: 'gaza',    name: '加沙 Gaza',        country: 'Palestine', bbox: [34.40, 31.45, 34.53, 31.58], center: [31.50, 34.47], minZoom: 11, maxZoom: 14 },
];

// 瓦片源模板：优先用环境变量 MAP_TILE_URL（应含 {z}/{x}/{y} 占位，可带 ?key=...）；
// 未配置时回退 OSM 公共瓦片（仅供开发/演示，生产请换成允许离线缓存的授权服务商）。
const TILE_TEMPLATE = (typeof process !== 'undefined' && process.env && process.env.MAP_TILE_URL)
  || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_URL = (z: number, x: number, y: number) =>
  TILE_TEMPLATE.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
const CACHE_NAME = 'wa-offline-tiles';
const META_KEY = 'wa_offline_regions';
const MAX_TILES = 1500; // 单区域瓦片上限，避免过量下载

function lon2x(lon: number, z: number) { return Math.floor((lon + 180) / 360 * Math.pow(2, z)); }
function lat2y(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z));
}

export function regionTiles(r: OfflineRegion): Array<{ z: number; x: number; y: number }> {
  const tiles: Array<{ z: number; x: number; y: number }> = [];
  for (let z = r.minZoom; z <= r.maxZoom; z++) {
    const xA = lon2x(r.bbox[0], z), xB = lon2x(r.bbox[2], z);
    const yA = lat2y(r.bbox[3], z), yB = lat2y(r.bbox[1], z);
    for (let x = Math.min(xA, xB); x <= Math.max(xA, xB); x++) {
      for (let y = Math.min(yA, yB); y <= Math.max(yA, yB); y++) {
        tiles.push({ z, x, y });
        if (tiles.length >= MAX_TILES) return tiles;
      }
    }
  }
  return tiles;
}

export interface RegionMeta { tiles: number; bytes: number; at: string }
export function getOfflineMeta(): Record<string, RegionMeta> {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; }
}
function setOfflineMeta(m: Record<string, RegionMeta>) {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* quota */ }
}

export async function downloadRegion(
  r: OfflineRegion,
  onProgress?: (done: number, total: number) => void,
): Promise<RegionMeta> {
  if (!('caches' in window)) throw new Error('当前环境不支持离线缓存(Cache API)');
  const cache = await caches.open(CACHE_NAME);
  const tiles = regionTiles(r);
  let bytes = 0, done = 0;
  const CONC = 6;
  for (let i = 0; i < tiles.length; i += CONC) {
    const batch = tiles.slice(i, i + CONC);
    await Promise.all(batch.map(async (t) => {
      const url = TILE_URL(t.z, t.x, t.y);
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) {
          bytes += (await res.clone().arrayBuffer()).byteLength;
          await cache.put(url, res);
        }
      } catch { /* 单瓦片失败跳过 */ }
      done++;
      onProgress?.(done, tiles.length);
    }));
  }
  const meta = getOfflineMeta();
  meta[r.id] = { tiles: tiles.length, bytes, at: new Date().toISOString() };
  setOfflineMeta(meta);
  return meta[r.id];
}

export async function deleteRegion(r: OfflineRegion): Promise<void> {
  if ('caches' in window) {
    const cache = await caches.open(CACHE_NAME);
    for (const t of regionTiles(r)) { try { await cache.delete(TILE_URL(t.z, t.x, t.y)); } catch { /* ignore */ } }
  }
  const meta = getOfflineMeta();
  delete meta[r.id];
  setOfflineMeta(meta);
}

export function totalOfflineBytes(): number {
  return Object.values(getOfflineMeta()).reduce((s, v) => s + (v.bytes || 0), 0);
}

// 缓存优先取瓦片（离线时返回缓存的 blob URL；未缓存返回 null → 由调用方回退网络）
export async function getCachedTileUrl(z: number, x: number, y: number): Promise<string | null> {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(TILE_URL(z, x, y));
    if (res) return URL.createObjectURL(await res.blob());
  } catch { /* ignore */ }
  return null;
}
