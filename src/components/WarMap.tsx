import React, { useEffect, useRef, useCallback } from 'react';

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || 'AIzaSyChR3WiKnfzpehE22tW0VTU40fpZWRv--U';

// ============ Load Google Maps Script ============
let gmapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve();
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry&language=zh-CN`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps load failed'));
    document.head.appendChild(script);
  });
  return gmapsPromise;
}

// ============ Dark map style ============
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8899aa' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a3a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a5a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e1e3e' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e1e3e' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
];

// ============ Types ============
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type?: 'shelter-open' | 'shelter-crowded' | 'shelter-closed' | 'alert' | 'sos' | 'family' | 'custom';
  label?: string;
  popup?: string;
  onClick?: () => void;
}

export interface MapRoute {
  coordinates: { lat: number; lng: number }[];
  color?: string;
  weight?: number;
}

interface WarMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  userLocation?: { latitude: number; longitude: number } | null;
  className?: string;
  style?: React.CSSProperties;
  onMapClick?: (lat: number, lng: number) => void;
  fitMarkers?: boolean;
  showTraffic?: boolean;
  directionsResult?: google.maps.DirectionsResult | null;
}

// Marker icon configs
function getMarkerIcon(type: string): google.maps.Symbol | google.maps.Icon | string {
  const base = { strokeWeight: 2, strokeColor: '#ffffff' };
  switch (type) {
    case 'shelter-open':
      return { ...base, path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#22c55e', fillOpacity: 1 };
    case 'shelter-crowded':
      return { ...base, path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#f59e0b', fillOpacity: 1 };
    case 'shelter-closed':
      return { ...base, path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#6b7280', fillOpacity: 1 };
    case 'alert':
      return { ...base, path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 7, fillColor: '#ef4444', fillOpacity: 1 };
    case 'sos':
      return { ...base, path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 };
    case 'family':
      return { ...base, path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#a855f7', fillOpacity: 1 };
    default:
      return { ...base, path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#3b82f6', fillOpacity: 1 };
  }
}

export function getShelterMarkerType(status: string): MapMarker['type'] {
  if (status === 'crowded' || status === 'full') return 'shelter-crowded';
  if (status === 'closed') return 'shelter-closed';
  return 'shelter-open';
}

// ============ Component ============
export default function WarMap({
  center = { lat: 33.5, lng: 36.3 },
  zoom = 8,
  markers = [],
  routes = [],
  userLocation,
  className = '',
  style,
  onMapClick,
  fitMarkers = false,
  showTraffic = false,
  directionsResult = null,
}: WarMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const gMarkersRef = useRef<google.maps.Marker[]>([]);
  const gPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userCircleRef = useRef<google.maps.Circle | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const readyRef = useRef(false);

  // Init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center,
        zoom,
        styles: DARK_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });

      if (onMapClick) {
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) onMapClick(e.latLng.lat(), e.latLng.lng());
        });
      }

      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 5,
          strokeOpacity: 0.85,
        },
      });

      mapRef.current = map;
      readyRef.current = true;
    });
    return () => { cancelled = true; };
  }, []);

  // Update markers
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    // Clear old
    gMarkersRef.current.forEach(m => m.setMap(null));
    gMarkersRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    for (const m of markers) {
      const gm = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapRef.current,
        icon: getMarkerIcon(m.type || 'custom'),
        title: m.label,
        zIndex: m.type === 'sos' ? 999 : m.type === 'alert' ? 500 : 100,
      });

      if (m.popup) {
        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="color:#e2e8f0;background:#1e293b;padding:8px 12px;border-radius:8px;font-size:13px;line-height:1.5;max-width:250px">${m.popup}</div>`,
        });
        gm.addListener('click', () => {
          infoWindow.open(mapRef.current!, gm);
          m.onClick?.();
        });
      } else if (m.onClick) {
        gm.addListener('click', m.onClick);
      }

      gMarkersRef.current.push(gm);
      bounds.extend({ lat: m.lat, lng: m.lng });
    }

    if (fitMarkers && markers.length > 1 && mapRef.current) {
      mapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [markers, fitMarkers]);

  // Update polyline routes
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    gPolylinesRef.current.forEach(p => p.setMap(null));
    gPolylinesRef.current = [];

    for (const route of routes) {
      const poly = new google.maps.Polyline({
        path: route.coordinates,
        strokeColor: route.color || '#3b82f6',
        strokeWeight: route.weight || 4,
        strokeOpacity: 0.8,
        map: mapRef.current,
      });
      gPolylinesRef.current.push(poly);
    }
  }, [routes]);

  // Update directions
  useEffect(() => {
    if (!directionsRendererRef.current) return;
    if (directionsResult) {
      directionsRendererRef.current.setDirections(directionsResult);
    } else {
      directionsRendererRef.current.setDirections({ routes: [] } as any);
    }
  }, [directionsResult]);

  // Update user location
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;

    if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null; }
    if (userCircleRef.current) { userCircleRef.current.setMap(null); userCircleRef.current = null; }

    if (userLocation) {
      const pos = { lat: userLocation.latitude, lng: userLocation.longitude };
      userMarkerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: 1000,
        title: '我的位置',
      });
      userCircleRef.current = new google.maps.Circle({
        center: pos,
        radius: 80,
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        strokeColor: '#3b82f6',
        strokeWeight: 1,
        map: mapRef.current,
      });
    }
  }, [userLocation]);

  // Traffic layer
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return;
    if (showTraffic && !trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
      trafficLayerRef.current.setMap(mapRef.current);
    } else if (!showTraffic && trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
    }
  }, [showTraffic]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ minHeight: 200, background: '#0f172a', ...style }}
    />
  );
}

// ============ Google Directions helper ============
export async function fetchDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  travelMode: 'DRIVING' | 'WALKING' = 'DRIVING',
): Promise<{ result: google.maps.DirectionsResult; distance: number; duration: number; steps: any[] } | null> {
  await loadGoogleMaps();
  const service = new google.maps.DirectionsService();
  return new Promise((resolve) => {
    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode[travelMode],
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (status === 'OK' && result && result.routes[0]) {
          const leg = result.routes[0].legs[0];
          resolve({
            result,
            distance: leg.distance?.value || 0,
            duration: leg.duration?.value || 0,
            steps: leg.steps || [],
          });
        } else {
          console.error('Directions request failed:', status);
          resolve(null);
        }
      }
    );
  });
}

// ============ Google Maps type augmentation ============
declare global {
  interface Window {
    google: any;
  }
}
