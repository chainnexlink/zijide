import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, getCachedTileUrl } from '../utils/offlineMaps';

interface ShelterPin { latitude: number; longitude: number; name: string }

/**
 * 离线地图查看器（Leaflet）。瓦片缓存优先：已下载区域断网也能显示；
 * 未缓存的瓦片在有网时回退到网络。用 circleMarker 标避难所，避免 Leaflet 默认图标的打包问题。
 */
export default function OfflineMap({ center, zoom = 12, shelters = [] }: {
  center: [number, number];
  zoom?: number;
  shelters?: ShelterPin[];
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center, zoom });
    mapRef.current = map;

    const CacheFirstLayer = (L.TileLayer as any).extend({
      createTile(coords: any, doneFn: any) {
        const img = document.createElement('img');
        img.setAttribute('role', 'presentation');
        img.alt = '';
        const finish = () => doneFn(null, img);
        img.onload = finish;
        img.onerror = finish;
        getCachedTileUrl(coords.z, coords.x, coords.y)
          .then((blobUrl) => { img.src = blobUrl || TILE_URL(coords.z, coords.x, coords.y); })
          .catch(() => { img.src = TILE_URL(coords.z, coords.x, coords.y); });
        return img;
      },
    });
    new CacheFirstLayer('', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

    shelters.forEach((s) => {
      if (typeof s.latitude === 'number' && typeof s.longitude === 'number') {
        L.circleMarker([s.latitude, s.longitude], {
          radius: 7, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.85, weight: 2,
        }).addTo(map).bindPopup(s.name);
      }
    });

    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={elRef} style={{ width: '100%', height: '100%', minHeight: 360 }} />;
}
