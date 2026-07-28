import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const key = Deno.env.get('GOOGLE_MAPS_KEY');
    if (!key) return json({ error: 'Google Maps routing is not configured' }, 503);
    const body = await req.json();
    const { origin, destination, avoid = [] } = body;
    const mode = ['walking', 'driving', 'bicycling', 'transit'].includes(body.mode) ? body.mode : 'walking';
    if (!validPoint(origin) || !validPoint(destination)) return json({ error: 'Valid origin and destination are required' }, 400);
    const params = new URLSearchParams({ origin: `${origin.latitude},${origin.longitude}`, destination: `${destination.latitude},${destination.longitude}`, mode, alternatives: 'true', language: body.language || 'zh-CN', key });
    if (Array.isArray(avoid) && avoid.length) params.set('avoid', avoid.filter((v: string) => ['tolls', 'highways', 'ferries'].includes(v)).join('|'));
    const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
    const directions = await response.json();
    if (!response.ok || directions.status !== 'OK') return json({ error: directions.error_message || directions.status || 'Route planning failed' }, 502);
    const { data: dangerRows } = await admin.from('alerts').select('id,title,severity,latitude,longitude,affected_radius_km').eq('is_verified', true).is('end_time', null).not('latitude', 'is', null).not('longitude', 'is', null).limit(100);
    const dangers = dangerRows || [];
    const routes = (directions.routes || []).map((route: any, index: number) => {
      const coordinates = decodePolyline(route.overview_polyline?.points || '');
      const leg = route.legs?.[0] || {};
      const dangerHits = dangers.filter((danger: any) => coordinates.some((point: any) => distanceKm(point, { latitude: Number(danger.latitude), longitude: Number(danger.longitude) }) <= Number(danger.affected_radius_km || 2)));
      return { id: `route-${index}`, summary: route.summary || `路线 ${index + 1}`, coordinates, distanceMeters: leg.distance?.value || 0, distanceText: leg.distance?.text || '', durationSeconds: leg.duration?.value || 0, durationText: leg.duration?.text || '', safetyScore: Math.max(0, 100 - dangerHits.reduce((sum: number, item: any) => sum + (item.severity === 'red' ? 35 : item.severity === 'orange' ? 20 : 10), 0)), dangerWarnings: dangerHits.map((item: any) => ({ id: item.id, title: item.title, severity: item.severity })) };
    });
    return json({ success: true, routes, fastestId: [...routes].sort((a, b) => a.durationSeconds - b.durationSeconds)[0]?.id, shortestId: [...routes].sort((a, b) => a.distanceMeters - b.distanceMeters)[0]?.id, safestId: [...routes].sort((a, b) => b.safetyScore - a.safetyScore || a.durationSeconds - b.durationSeconds)[0]?.id });
  } catch (error: any) { return json({ error: error.message || 'Unknown error' }, 500); }
});

function validPoint(value: any) {
  if (!value) return false;
  const lat = Number(value.latitude); const lng = Number(value.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
function decodePolyline(encoded: string) { let index = 0, lat = 0, lng = 0; const points: Array<{ latitude: number; longitude: number }> = []; while (index < encoded.length) { let result = 0, shift = 0, byte; do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20); lat += result & 1 ? ~(result >> 1) : result >> 1; result = 0; shift = 0; do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20); lng += result & 1 ? ~(result >> 1) : result >> 1; points.push({ latitude: lat / 1e5, longitude: lng / 1e5 }); } return points; }
function distanceKm(a: any, b: any) { const rad = (v: number) => v * Math.PI / 180; const dLat = rad(b.latitude - a.latitude); const dLng = rad(b.longitude - a.longitude); const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); }
