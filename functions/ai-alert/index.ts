import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushToUsers } from '../_shared/push.ts';

interface AlertSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'api' | 'webhook' | 'ai';
  lastChecked: string;
  country: string;
  reliability: number;
}

interface AlertData {
  id: string;
  title: string;
  description: string;
  type: 'air_strike' | 'artillery' | 'conflict' | 'curfew' | 'chemical' | 'other';
  severity: 'red' | 'orange' | 'yellow';
  latitude: number;
  longitude: number;
  country: string;
  city: string;
  source: string;
  sourceUrl: string;
  createdAt: string;
  expiresAt: string;
  confidence: number;
}

interface AIAnalysisResult {
  isAlert: boolean;
  type: string;
  severity: string;
  confidence: number;
  location: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  description: string;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEOO_AI_BASE_URL = 'https://api.meoo.host';
const MEOO_PROJECT_SERVICE_AK = Deno.env.get('MEOO_PROJECT_API_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    let action = url.searchParams.get('action') || '';

    // 前端通过 supabase.functions.invoke 将 action 放在 body 中
    // 仅 URL 参数为空时从 body 读取，使用 clone() 保留原始 body
    if (!action && req.method === 'POST') {
      try {
        const clonedBody = await req.clone().json();
        action = clonedBody.action || '';
      } catch {}
    }
    if (!action) action = 'collect';

    switch (action) {
      case 'collect':
        return await collectAlerts(supabaseAdmin);
      case 'analyze':
        return await analyzeWithAI(supabaseAdmin, req);
      case 'process':
        return await processPendingAlerts(supabaseAdmin);
      case 'cleanup':
        return await cleanupExpiredAlerts(supabaseAdmin);
      case 'realtime_monitor':
        return await realtimeMonitor(supabaseAdmin);
      case 'time_analysis':
        return await timeDelayAnalysis(supabaseAdmin, req);
      case 'incremental_crawl':
        return await incrementalCrawl(supabaseAdmin);
      case 'stats':
        return await getMonitoringStats(supabaseAdmin);
      case 'verify':
        return await verifyAlert(supabaseAdmin, req);
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function collectAlerts(supabaseAdmin: any) {
  const now = new Date();
  const demoMode = (Deno.env.get('ALERT_DEMO_MODE') || '').toLowerCase() === 'true';

  let collected = 0;
  let inserted = 0;
  const perSource: any[] = [];

  if (demoMode) {
    // ⚠️ 仅用于本地测试 / 应用商店审核演示：生成合成预警。
    // 生产环境请勿设置 ALERT_DEMO_MODE=true —— 真实预警来自下方真实数据源。
    const demoSources: AlertSource[] = [
      { id: 'demo_ua', name: 'Ukraine Alerts (DEMO)', url: 'https://alerts.com.ua', type: 'api', lastChecked: new Date(0).toISOString(), country: 'Ukraine', reliability: 0.95 },
      { id: 'demo_il', name: 'Israel Alerts (DEMO)', url: 'https://www.oref.org.il', type: 'api', lastChecked: new Date(0).toISOString(), country: 'Israel', reliability: 0.95 },
    ];
    for (const source of demoSources) {
      for (const a of generateMockAlerts(source, now)) {
        collected++;
        if (await insertAlertIfNew(supabaseAdmin, mapAlertDataToRow(a, now), now)) inserted++;
      }
    }
    return new Response(JSON.stringify({ success: true, demoMode: true, collected, new: inserted, timestamp: now.toISOString() }), { headers: corsHeaders });
  }

  // 生产：从真实上游数据源增量采集（自上次抓取时间起）
  const { data: crawlStates } = await supabaseAdmin.from('alert_crawl_state').select('*');
  const stateMap: Record<string, any> = {};
  if (crawlStates) for (const s of crawlStates) stateMap[s.source_name] = s;

  for (const source of REALTIME_SOURCES) {
    const lastState = stateMap[source.name];
    const since = lastState?.last_crawl_at ? new Date(lastState.last_crawl_at) : new Date(now.getTime() - 3600000);
    try {
      const result = await crawlSource(source, since, supabaseAdmin);
      collected += result.newItems;
      inserted += result.inserted;
      perSource.push({ source: source.name, fetched: result.newItems, inserted: result.inserted, avgDelaySeconds: result.avgDelaySeconds });
      await supabaseAdmin.from('alert_crawl_state').upsert({
        source_name: source.name, last_crawl_at: now.toISOString(),
        items_found: result.newItems, avg_delay_seconds: result.avgDelaySeconds, error: null,
      }, { onConflict: 'source_name' });
    } catch (e: any) {
      perSource.push({ source: source.name, error: e.message });
      await supabaseAdmin.from('alert_crawl_state').upsert({
        source_name: source.name, last_crawl_at: now.toISOString(), items_found: 0, error: e.message,
      }, { onConflict: 'source_name' });
    }
  }

  // AI 分析器（仅在配置了 MEOO_PROJECT_API_KEY 时运行）
  if (MEOO_PROJECT_SERVICE_AK) {
    try {
      for (const a of await generateAIAnalyzedAlerts(supabaseAdmin, now)) {
        collected++;
        if (await insertAlertIfNew(supabaseAdmin, mapAlertDataToRow(a, now), now)) inserted++;
      }
    } catch (e) {
      console.error('AI analyzer failed:', e);
    }
  }

  return new Response(JSON.stringify({ success: true, demoMode: false, collected, new: inserted, sources: perSource, timestamp: now.toISOString() }), { headers: corsHeaders });
}

// 允许的预警类型（与 alerts 表 CHECK 约束一致）
const ALLOWED_ALERT_TYPES = ['air_strike', 'artillery', 'conflict', 'curfew', 'chemical', 'other'];

// 将采集到的 AlertData 映射为 alerts 表的真实列。
// 关键：活跃预警 = end_time IS NULL（与前端 Dashboard 的 .is('end_time', null) 查询一致），
// 不再使用历史代码里那些根本不存在的 is_active / expires_at 列。
function mapAlertDataToRow(a: AlertData, now: Date) {
  return {
    alert_type: ALLOWED_ALERT_TYPES.includes(a.type) ? a.type : 'other',
    severity: ['red', 'orange', 'yellow'].includes(a.severity) ? a.severity : 'yellow',
    title: a.title,
    description: a.description,
    latitude: a.latitude,
    longitude: a.longitude,
    city: a.city,
    country: a.country,
    source: a.source,
    source_id: a.id,
    source_url: a.sourceUrl,
    source_published_at: a.createdAt,
    detected_at: now.toISOString(),
    detection_delay_seconds: 0,
    confidence: a.confidence ?? 0.7,
    start_time: a.createdAt,
    // end_time 留空 = 活跃
  };
}

// 去重后插入；新插入成功后写入站内通知。返回插入的行或 null。
async function insertAlertIfNew(supabaseAdmin: any, row: any, _now: Date) {
  if (!ALLOWED_ALERT_TYPES.includes(row.alert_type)) row.alert_type = 'other';

  let existing: any = null;
  if (row.source_id) {
    const r = await supabaseAdmin.from('alerts').select('id').eq('source_id', row.source_id).maybeSingle();
    existing = r.data;
  }
  if (!existing && row.source_url) {
    const r = await supabaseAdmin.from('alerts').select('id').eq('source_url', row.source_url).maybeSingle();
    existing = r.data;
  }
  if (existing) return null;

  const { data, error } = await supabaseAdmin.from('alerts').insert(row).select().single();
  if (error) {
    // 唯一索引冲突（并发重复）等视为非致命，记录后跳过
    console.error('alert insert failed:', error.message, row.source_id);
    return null;
  }
  try {
    await notifySubscribers(supabaseAdmin, data);
  } catch (e) {
    console.error('notifySubscribers failed:', e);
  }
  return data;
}

async function generateAIAnalyzedAlerts(supabaseAdmin: any, now: Date): Promise<AlertData[]> {
  const alerts: AlertData[] = [];
  
  try {
    const response = await fetch(
      `${MEOO_AI_BASE_URL}/meoo-ai/compatible-mode/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MEOO_PROJECT_SERVICE_AK}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-vl-plus',
          messages: [{
            role: 'user',
            content: `Analyze current armed-conflict and security situations worldwide, PRIORITIZING active war zones (the Middle East — Israel, Palestine, Lebanon, Syria, Jordan, Iraq, Iran, Yemen, Egypt, Turkey, the Gulf states — plus Ukraine and Sudan), and also covering other global conflict/security hotspots (the Sahel and rest of Africa, South/Southeast Asia, etc.). Focus on conflict/security events (air strikes, shelling, armed clashes, attacks, curfews), NOT natural disasters.
            Return JSON array with: title, description, type (air_strike/artillery/conflict/curfew/chemical/other),
            severity (red/orange/yellow), country, city, latitude, longitude, confidence (0-1).
            Generate 3-5 alerts, with war zones listed first, across a spread of countries.`
          }],
          stream: false,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';
      
      try {
        const parsedAlerts = JSON.parse(aiResponse);
        if (Array.isArray(parsedAlerts)) {
          for (const alert of parsedAlerts) {
            alerts.push({
              id: `ai_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
              title: alert.title,
              description: alert.description,
              type: alert.type as AlertData['type'],
              severity: alert.severity as AlertData['severity'],
              latitude: alert.latitude,
              longitude: alert.longitude,
              country: alert.country,
              city: alert.city,
              source: 'AI Analyzer',
              sourceUrl: `https://ai.warrescue.com/alert/${now.getTime()}`,
              createdAt: now.toISOString(),
              expiresAt: new Date(now.getTime() + 3600000 * (alert.severity === 'red' ? 2 : alert.severity === 'orange' ? 4 : 8)).toISOString(),
              confidence: alert.confidence || 0.8,
            });
          }
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
  }

  return alerts;
}

async function analyzeWithAI(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { text, imageUrl } = body;

    const messages = [];
    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: text || 'Analyze this image for potential security threats or alerts.' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: text || 'Analyze for potential security threats.',
      });
    }

    const response = await fetch(
      `${MEOO_AI_BASE_URL}/meoo-ai/compatible-mode/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MEOO_PROJECT_SERVICE_AK}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-vl-plus',
          messages,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({
      success: true,
      analysis: data.choices?.[0]?.message?.content,
      timestamp: new Date().toISOString(),
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

function generateMockAlerts(source: AlertSource, now: Date): AlertData[] {
  const alerts: AlertData[] = [];
  const cities: Record<string, { cities: string[]; coords: [number, number][] }> = {
    Ukraine: {
      cities: ['Kyiv', 'Kharkiv', 'Odesa', 'Dnipro', 'Lviv'],
      coords: [[50.45, 30.52], [49.99, 36.23], [46.48, 30.73], [48.46, 35.04], [49.84, 24.03]],
    },
    Israel: {
      cities: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Beersheba', 'Ashdod'],
      coords: [[32.08, 34.78], [31.77, 35.21], [32.79, 34.99], [31.25, 34.79], [31.80, 34.64]],
    },
    Syria: {
      cities: ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Raqqa'],
      coords: [[33.51, 36.27], [36.20, 37.13], [34.73, 36.71], [35.52, 35.78], [35.95, 39.00]],
    },
    Turkey: {
      cities: ['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Gaziantep'],
      coords: [[41.01, 28.97], [39.93, 32.85], [38.42, 27.14], [36.89, 30.71], [37.06, 37.38]],
    },
    Palestine: {
      cities: ['Gaza', 'Ramallah', 'Nablus', 'Hebron', 'Bethlehem'],
      coords: [[31.50, 34.47], [31.90, 35.20], [32.22, 35.26], [31.53, 35.10], [31.70, 35.20]],
    },
  };

  const types: AlertData['type'][] = ['air_strike', 'artillery', 'conflict', 'curfew', 'chemical', 'other'];
  const severities: AlertData['severity'][] = ['red', 'orange', 'yellow'];

  const countryData = cities[source.country];
  if (!countryData) return alerts;

  const numAlerts = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < numAlerts; i++) {
    const cityIndex = Math.floor(Math.random() * countryData.cities.length);
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    const titles: Record<AlertData['type'], Record<AlertData['severity'], string>> = {
      air_strike: {
        red: 'Air Raid Alert - Immediate Shelter',
        orange: 'Air Strike Warning',
        yellow: 'Air Activity Detected',
      },
      artillery: {
        red: 'Heavy Artillery Fire',
        orange: 'Artillery Shelling Reported',
        yellow: 'Artillery Activity',
      },
      conflict: {
        red: 'Active Combat Zone',
        orange: 'Armed Conflict Reported',
        yellow: 'Tensions Rising',
      },
      curfew: {
        red: 'Emergency Curfew Imposed',
        orange: 'Curfew Warning',
        yellow: 'Curfew Advisory',
      },
      chemical: {
        red: 'Chemical Attack Alert',
        orange: 'Chemical Hazard Warning',
        yellow: 'Chemical Risk Advisory',
      },
      other: {
        red: 'Critical Emergency',
        orange: 'Emergency Warning',
        yellow: 'Safety Advisory',
      },
    };

    const alert: AlertData = {
      id: `${source.id}_${now.getTime()}_${i}`,
      title: titles[type][severity],
      description: `Alert for ${countryData.cities[cityIndex]} area. Take immediate precautions.`,
      type,
      severity,
      latitude: countryData.coords[cityIndex][0] + (Math.random() - 0.5) * 0.1,
      longitude: countryData.coords[cityIndex][1] + (Math.random() - 0.5) * 0.1,
      country: source.country,
      city: countryData.cities[cityIndex],
      source: source.name,
      sourceUrl: `${source.url}/alert/${now.getTime()}_${i}`,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 3600000 * (severity === 'red' ? 2 : severity === 'orange' ? 4 : 8)).toISOString(),
      confidence: source.reliability,
    };

    alerts.push(alert);
  }

  return alerts;
}

async function notifySubscribers(supabaseAdmin: any, alert: any) {
  const { data: subscribers } = await supabaseAdmin
    .from('user_alert_settings')
    .select('user_id, monitor_radius_km, last_latitude, last_longitude, profiles(country)')
    .eq('push_enabled', true);

  // 地理过滤：只推给"在预警附近"的用户（有坐标→距离≤监测半径；无坐标→退回国家匹配）
  const targets = (subscribers || []).filter((u: any) => isAlertRelevantToUser(u, alert));
  if (targets.length === 0) return;

  const targetIds = targets.map((u: any) => u.user_id);
  const notifications = targetIds.map((uid: string) => ({
    user_id: uid,
    title: `🚨 ${alert.title}`,
    body: alert.description,
    type: 'alert',
    data: { alert_id: alert.id },
  }));
  await supabaseAdmin.from('notifications').insert(notifications);

  // 真正下发原生推送（关屏/退后台也能收到）；未配置 APNs/FCM 密钥时安全跳过
  try {
    await sendPushToUsers(supabaseAdmin, targetIds, {
      title: `🚨 ${alert.title}`,
      body: alert.description || '',
      data: { alert_id: alert.id, type: 'alert', severity: alert.severity },
      severity: alert.severity,
    });
  } catch (e) {
    console.error('push dispatch failed:', e);
  }
}

// 坐标是否“有效”：必须是有限数，且不是 (0,0)。
// (0,0) 在几内亚湾，绝不会是真实预警点；历史上无经纬度的源被写成 0,0，
// 会让距离判断误以为“有坐标”，从而绕过国家兜底、导致谁都收不到推送。
function hasValidCoord(lat: any, lng: any): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && Number.isFinite(lat) && Number.isFinite(lng)
    && !(lat === 0 && lng === 0);
}

// 判断某预警是否与某用户相关（地理过滤）
function isAlertRelevantToUser(u: any, alert: any): boolean {
  const aLat = alert.latitude, aLng = alert.longitude;
  const userHasCoord = u.last_latitude != null && u.last_longitude != null;
  // 仅当“用户有坐标”且“预警有有效坐标”时才按距离过滤
  if (userHasCoord && hasValidCoord(aLat, aLng)) {
    return haversineKm(u.last_latitude, u.last_longitude, aLat, aLng) <= (u.monitor_radius_km || 30);
  }
  // 用户无坐标 / 预警无有效坐标（如 ReliefWeb、以色列 Oref 不带经纬度）→ 退回国家匹配，避免漏推
  const country = u.profiles?.country;
  return !!(country && alert.country && country === alert.country);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function processPendingAlerts(supabaseAdmin: any) {
  // 活跃预警 = end_time IS NULL。按严重级别 TTL 过期：red 2h / orange 4h / yellow 8h。
  const ttlHours: Record<string, number> = { red: 2, orange: 4, yellow: 8 };
  const nowISO = new Date().toISOString();
  let processed = 0;

  for (const sev of Object.keys(ttlHours)) {
    const cutoff = new Date(Date.now() - ttlHours[sev] * 3600000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .update({ end_time: nowISO })
      .is('end_time', null)
      .eq('severity', sev)
      .lt('created_at', cutoff)
      .select('id');
    if (error) throw error;
    processed += data?.length || 0;
  }

  return new Response(JSON.stringify({
    success: true,
    processed,
    timestamp: nowISO,
  }), { headers: corsHeaders });
}

async function cleanupExpiredAlerts(supabaseAdmin: any) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .delete()
    .not('end_time', 'is', null)
    .lt('created_at', cutoff)
    .select('id');

  if (error) throw error;

  return new Response(JSON.stringify({
    success: true,
    deleted: data?.length || 0,
    timestamp: new Date().toISOString(),
  }), { headers: corsHeaders });
}

async function getMonitoringStats(supabaseAdmin: any) {
  const { data: activeAlerts } = await supabaseAdmin
    .from('alerts')
    .select('severity')
    .is('end_time', null);

  const { data: todayAlerts } = await supabaseAdmin
    .from('alerts')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { data: aiAlerts } = await supabaseAdmin
    .from('alerts')
    .select('confidence')
    .eq('source', 'AI Analyzer');

  const stats = {
    active: {
      total: activeAlerts?.length || 0,
      red: activeAlerts?.filter((a: any) => a.severity === 'red').length || 0,
      orange: activeAlerts?.filter((a: any) => a.severity === 'orange').length || 0,
      yellow: activeAlerts?.filter((a: any) => a.severity === 'yellow').length || 0,
    },
    today: todayAlerts?.length || 0,
    aiGenerated: aiAlerts?.length || 0,
    avgConfidence: aiAlerts?.length
      ? (aiAlerts.reduce((sum: number, a: any) => sum + (a.confidence || 0), 0) / aiAlerts.length).toFixed(2)
      : 0,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(stats), { headers: corsHeaders });
}

async function verifyAlert(supabaseAdmin: any, req: Request) {
  try {
    const body = await req.json();
    const { alertId } = body;

    const { data: alert } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .maybeSingle();

    if (!alert) {
      return new Response(JSON.stringify({ error: 'Alert not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const verificationResponse = await fetch(
      `${MEOO_AI_BASE_URL}/meoo-ai/compatible-mode/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MEOO_PROJECT_SERVICE_AK}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-vl-plus',
          messages: [{
            role: 'user',
            content: `Verify this alert: "${alert.title}" in ${alert.city}, ${alert.country}. 
            Description: ${alert.description}. 
            Return JSON with: verified (boolean), confidence (0-1), notes (string).`
          }],
          stream: false,
        }),
      }
    );

    if (verificationResponse.ok) {
      const data = await verificationResponse.json();
      const result = data.choices?.[0]?.message?.content || '';
      
      try {
        const verification = JSON.parse(result);
        await supabaseAdmin
          .from('alerts')
          .update({
            is_verified: verification.verified, // 修复：alerts 表列名是 is_verified（原写 verified 不存在）
            verified_at: verification.verified ? new Date().toISOString() : null,
            verification_confidence: verification.confidence,
            verification_notes: verification.notes
          })
          .eq('id', alertId);

        return new Response(JSON.stringify({
          success: true,
          verification,
          timestamp: new Date().toISOString(),
        }), { headers: corsHeaders });
      } catch (parseError) {
        console.error('Failed to parse verification:', parseError);
      }
    }

    return new Response(JSON.stringify({ error: 'Verification failed' }), {
      status: 500,
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// ============================================================
// 24-Hour Real-time Monitor
// Continuously crawls incremental data from alert sources,
// compares platform publish time vs our alert time for delay estimation
// ============================================================

interface CrawlSource {
  name: string;
  country: string;
  url: string;
  type: 'reliefweb' | 'liveuamap' | 'gdacs' | 'acled' | 'oref' | 'orefLive' | 'ukrainealarm' | 'telegram';
  checkIntervalMinutes: number;
  priority?: boolean; // true = 战区实时源：每周期最先抓取+先入库，保证战区预警时效性（付费用户核心），绝不被全球聚合源拖慢
}

const REALTIME_SOURCES: CrawlSource[] = [
  // —— 战区实时源（秒级空袭警报，priority；每周期最先处理，时效性优先于全球覆盖）——
  // Ukraine Alarm 官方 API：需 UKRAINEALARM_TOKEN（免费申请）；未配置则静默跳过。
  { name: 'Ukraine Alarm (official)', country: 'Ukraine', url: 'https://api.ukrainealarm.com/api/v3/alerts', type: 'ukrainealarm', checkIntervalMinutes: 1, priority: true },
  // 以色列 Pikud HaOref 实时端点：无 token，但需特定请求头；无警报时返回空（已做防御）。
  { name: 'Israel Oref Live', country: 'Israel', url: 'https://www.oref.org.il/WarningMessages/alert/alerts.json', type: 'orefLive', checkIntervalMinutes: 1, priority: true },
  { name: 'Ukraine Live Map', country: 'Ukraine', url: 'https://liveuamap.com/ajax/ukraine-latest', type: 'liveuamap', checkIntervalMinutes: 2, priority: true },
  // —— 全球聚合源（冲突/安全事件，覆盖广但时效较慢；仅在战区实时源之后处理）——
  { name: 'ReliefWeb API', country: 'Global', url: 'https://api.reliefweb.int/v1/reports?appname=warrescue&filter[field]=date.created&filter[value][from]=', type: 'reliefweb', checkIntervalMinutes: 5 },
  { name: 'GDACS Events', country: 'Global', url: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=', type: 'gdacs', checkIntervalMinutes: 10 },
  { name: 'ACLED Conflict Data', country: 'Global', url: 'https://api.acleddata.com/acled/read?event_date=', type: 'acled', checkIntervalMinutes: 30 },
];

async function realtimeMonitor(supabaseAdmin: any) {
  const monitorResults: any[] = [];
  const now = new Date();

  // Get last crawl timestamps from database
  const { data: crawlState } = await supabaseAdmin
    .from('alert_crawl_state')
    .select('*');

  const stateMap: Record<string, any> = {};
  if (crawlState) {
    for (const s of crawlState) stateMap[s.source_name] = s;
  }

  // 战区优先：priority 源（乌克兰/以色列实时空袭）每周期最先抓取+入库，
  // 保证付费用户战区预警时效性，绝不被全球聚合源拖慢。
  const orderedSources = [...REALTIME_SOURCES].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));

  for (const source of orderedSources) {
    const lastState = stateMap[source.name];
    // 首次（无 last_crawl_at）只回看 1 小时，避免从 1970 拉全量历史；与 collect/incrementalCrawl 一致
    const lastCrawl = lastState?.last_crawl_at ? new Date(lastState.last_crawl_at) : new Date(now.getTime() - 3600000);
    const minutesSinceLastCrawl = (now.getTime() - lastCrawl.getTime()) / 60000;

    // Skip if not enough time has passed
    if (minutesSinceLastCrawl < source.checkIntervalMinutes) {
      monitorResults.push({
        source: source.name,
        status: 'skipped',
        reason: `Next check in ${Math.ceil(source.checkIntervalMinutes - minutesSinceLastCrawl)} min`,
      });
      continue;
    }

    try {
      const crawlResult = await crawlSource(source, lastCrawl, supabaseAdmin);
      monitorResults.push({
        source: source.name,
        status: 'success',
        newItems: crawlResult.newItems,
        processedAt: now.toISOString(),
        avgDelaySeconds: crawlResult.avgDelaySeconds,
      });

      // Update crawl state
      await supabaseAdmin
        .from('alert_crawl_state')
        .upsert({
          source_name: source.name,
          last_crawl_at: now.toISOString(),
          items_found: crawlResult.newItems,
          avg_delay_seconds: crawlResult.avgDelaySeconds,
          error: null,
        }, { onConflict: 'source_name' });

    } catch (e: any) {
      monitorResults.push({
        source: source.name,
        status: 'error',
        error: e.message,
      });

      await supabaseAdmin
        .from('alert_crawl_state')
        .upsert({
          source_name: source.name,
          last_crawl_at: now.toISOString(),
          items_found: 0,
          error: e.message,
        }, { onConflict: 'source_name' });
    }
  }

  return new Response(JSON.stringify({
    monitorCycle: now.toISOString(),
    sources: monitorResults,
    summary: {
      totalSources: REALTIME_SOURCES.length,
      crawled: monitorResults.filter(r => r.status === 'success').length,
      skipped: monitorResults.filter(r => r.status === 'skipped').length,
      errors: monitorResults.filter(r => r.status === 'error').length,
      totalNewItems: monitorResults.reduce((s, r) => s + (r.newItems || 0), 0),
    },
  }), { headers: corsHeaders });
}

// Crawl a specific source for incremental data
async function crawlSource(
  source: CrawlSource,
  since: Date,
  supabaseAdmin: any
): Promise<{ newItems: number; inserted: number; avgDelaySeconds: number }> {
  const sinceISO = since.toISOString();
  let newItems = 0;
  let inserted = 0;
  let totalDelay = 0;
  const now = new Date();

  try {
    let fetchUrl = source.url;
    const headers: Record<string, string> = { 'Accept': 'application/json', 'User-Agent': 'WarRescue/1.0' };
    if (source.type === 'reliefweb') {
      fetchUrl += encodeURIComponent(sinceISO) + '&limit=100&sort[]=date.created:desc'; // 全球后调高，减少高峰漏报
    } else if (source.type === 'gdacs') {
      fetchUrl += sinceISO.split('T')[0] + '&toDate=' + now.toISOString().split('T')[0];
    } else if (source.type === 'acled') {
      fetchUrl += since.toISOString().split('T')[0] + '&event_date_where=%3E&limit=200'; // 全球后调高，减少高峰漏报
    } else if (source.type === 'ukrainealarm') {
      const token = Deno.env.get('UKRAINEALARM_TOKEN') || '';
      if (!token) {
        // 未配置 token：静默跳过该源（不报错、不影响其它源）
        return { newItems: 0, inserted: 0, avgDelaySeconds: 0 };
      }
      headers['Authorization'] = token;
    } else if (source.type === 'orefLive') {
      // Oref 实时端点需要这些头，否则可能被拒或返回空
      headers['Referer'] = 'https://www.oref.org.il/';
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    const response = await fetch(fetchUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Oref 实时端点无警报时返回空串/空对象，直接 json() 会抛错 → 用文本防御解析
    let data: any;
    if (source.type === 'orefLive') {
      const txt = (await response.text()).trim();
      if (!txt || txt === '{}' || txt === '[]') {
        return { newItems: 0, inserted: 0, avgDelaySeconds: 0 };
      }
      try { data = JSON.parse(txt); } catch { return { newItems: 0, inserted: 0, avgDelaySeconds: 0 }; }
    } else {
      data = await response.json();
    }
    const items = extractItems(data, source.type);

    for (const item of items) {
      const platformTime = new Date(item.publishedAt);
      const ourDetectionTime = now;
      const delaySeconds = (ourDetectionTime.getTime() - platformTime.getTime()) / 1000;

      totalDelay += Math.max(0, delaySeconds);
      newItems++;

      if (item.isRelevant) {
        // 通过去重助手插入；列名对齐真实表（alert_type / start_time / 无 is_active）
        const ok = await insertAlertIfNew(supabaseAdmin, {
          alert_type: item.alertType || 'other',
          severity: item.severity || 'yellow',
          title: item.title,
          description: item.description,
          country: item.country,
          city: item.city || 'Unknown',
          latitude: hasValidCoord(item.latitude, item.longitude) ? item.latitude : null,
          longitude: hasValidCoord(item.latitude, item.longitude) ? item.longitude : null,
          source: source.name,
          source_id: item.externalId,
          source_url: item.sourceUrl || source.url,
          source_published_at: platformTime.toISOString(),
          detected_at: ourDetectionTime.toISOString(),
          detection_delay_seconds: Math.round(delaySeconds),
          confidence: item.confidence || 0.7,
          start_time: platformTime.toISOString(),
        }, now);
        if (ok) inserted++;
      }
    }
  } catch (e: any) {
    console.error(`Crawl error for ${source.name}:`, e.message);
    throw e;
  }

  return {
    newItems,
    inserted,
    avgDelaySeconds: newItems > 0 ? Math.round(totalDelay / newItems) : 0,
  };
}

// 预警覆盖范围：全球，但只收“冲突/安全”事件（排除纯自然灾害），保持“空袭/战区预警”信号纯度。
// 用于过滤 ReliefWeb 等聚合源：标题/正文命中冲突关键词才纳入。
// （ACLED 本身即全球冲突数据；GDACS 为自然灾害源，相对降权、不扩量。）
const CONFLICT_KEYWORDS = [
  'air strike', 'airstrike', 'air raid', 'shelling', 'artillery', 'rocket', 'missile', 'drone',
  'bombing', 'bombard', 'explosion', 'blast', 'attack', 'assault', 'clash', 'armed', 'militant',
  'gunfire', 'gunmen', 'insurgent', 'terror', 'war', 'conflict', 'offensive', 'siege', 'ambush',
  'violence', 'killed', 'casualt', 'evacuat', 'curfew', 'ceasefire', 'hostilit', 'combat', 'unrest',
  '空袭', '炮击', '导弹', '火箭', '袭击', '冲突', '交火', '爆炸', '武装', '戒严', '撤离', '枪',
];
function isSecurityEvent(title: string, body: string): boolean {
  const text = ((title || '') + ' ' + (body || '')).toLowerCase();
  return CONFLICT_KEYWORDS.some((k) => text.includes(k));
}

// Extract relevant items from various API response formats
function extractItems(data: any, type: string): any[] {
  const items: any[] = [];

  switch (type) {
    case 'reliefweb': {
      const reports = data.data || [];
      for (const r of reports) {
        const fields = r.fields || {};
        const country = fields.country?.[0]?.name || 'Unknown';
        // 全球覆盖，但只收“冲突/安全”事件（按标题/正文关键词判定，排除纯自然灾害），保持战区预警信号纯度
        const isConflictZone = isSecurityEvent(fields.title || '', fields.body || '');
        items.push({
          externalId: `rw_${r.id}`,
          title: fields.title || 'Report',
          description: (fields.body || '').substring(0, 500),
          publishedAt: fields.date?.created || new Date().toISOString(),
          country,
          city: fields.source?.[0]?.name || '',
          isRelevant: isConflictZone,
          alertType: detectAlertType(fields.title || ''),
          severity: detectSeverity(fields.title || '', fields.body || ''),
          confidence: 0.7,
          sourceUrl: fields.url_alias || '',
        });
      }
      break;
    }
    case 'gdacs': {
      const events = data.features || data.events || [];
      for (const e of events) {
        const props = e.properties || e;
        items.push({
          externalId: `gdacs_${props.eventid || props.alertscore}`,
          title: props.name || props.eventname || 'GDACS Event',
          description: props.description || `${props.eventtype} in ${props.country}`,
          publishedAt: props.fromdate || props.datemodified || new Date().toISOString(),
          country: props.country || 'Unknown',
          city: '',
          latitude: e.geometry?.coordinates?.[1] || props.lat || 0,
          longitude: e.geometry?.coordinates?.[0] || props.lng || 0,
          isRelevant: true,
          alertType: 'other',
          severity: props.alertlevel === 'Red' ? 'red' : props.alertlevel === 'Orange' ? 'orange' : 'yellow',
          confidence: 0.8,
          sourceUrl: props.url || '',
        });
      }
      break;
    }
    case 'acled': {
      const events = data.data || [];
      for (const e of events) {
        items.push({
          externalId: `acled_${e.data_id}`,
          title: `${e.event_type}: ${e.sub_event_type || ''} in ${e.admin1 || e.country}`,
          description: e.notes || '',
          publishedAt: e.event_date ? `${e.event_date}T00:00:00Z` : new Date().toISOString(),
          country: e.country || 'Unknown',
          city: e.admin1 || e.location || '',
          latitude: parseFloat(e.latitude) || 0,
          longitude: parseFloat(e.longitude) || 0,
          isRelevant: true,
          alertType: detectAlertType(e.event_type || ''),
          severity: e.fatalities > 10 ? 'red' : e.fatalities > 0 ? 'orange' : 'yellow',
          confidence: 0.75,
          sourceUrl: e.source || '',
        });
      }
      break;
    }
    case 'oref': {
      const alerts = Array.isArray(data) ? data : [];
      for (const a of alerts) {
        items.push({
          externalId: `oref_${a.rid || a.alertDate}`,
          title: `${a.title || 'Alert'} - ${a.data || a.desc || ''}`,
          description: a.desc || a.data || '',
          publishedAt: a.alertDate || new Date().toISOString(),
          country: 'Israel',
          city: a.data || '',
          isRelevant: true,
          alertType: 'air_strike',
          severity: 'red',
          confidence: 0.95,
          sourceUrl: 'https://www.oref.org.il/',
        });
      }
      break;
    }
    case 'ukrainealarm': {
      // 官方 v3：返回各区域 + activeAlerts[]；区域级无经纬度 → 退回国家匹配（已修复 0,0 漏推）
      const regions = Array.isArray(data) ? data : [];
      for (const reg of regions) {
        const active = reg.activeAlerts || reg.alerts || [];
        for (const al of active) {
          const at = String(al.type || '').toUpperCase();
          const alertType = at === 'AIR' ? 'air_strike'
            : at.includes('ARTILLER') ? 'artillery'
            : (at === 'CHEMICAL' || at === 'NUCLEAR') ? 'chemical'
            : at === 'URBAN_FIGHTS' ? 'conflict' : 'other';
          items.push({
            externalId: `uaalarm_${reg.regionId}_${al.type}_${al.lastUpdate || reg.lastUpdate || ''}`,
            title: `${alertType === 'air_strike' ? 'Air Raid Alert' : (al.type || 'Alert')} - ${reg.regionEngName || reg.regionName || 'Ukraine'}`,
            description: `${al.type || 'Alert'} active in ${reg.regionName || ''}${reg.regionEngName ? ' (' + reg.regionEngName + ')' : ''}`,
            publishedAt: al.lastUpdate || reg.lastUpdate || new Date().toISOString(),
            country: 'Ukraine',
            city: reg.regionEngName || reg.regionName || '',
            isRelevant: true,
            alertType,
            severity: 'red',
            confidence: 0.97,
            sourceUrl: 'https://api.ukrainealarm.com/',
          });
        }
      }
      break;
    }
    case 'orefLive': {
      // 实时端点：有警报时返回 { id, cat, title, data:[区域...], desc }；无经纬度 → 退回国家匹配
      const obj = (data && !Array.isArray(data)) ? data : null;
      const areas = obj && Array.isArray(obj.data) ? obj.data : [];
      for (const area of areas) {
        items.push({
          externalId: `oreflive_${obj.id || ''}_${area}`,
          title: `${obj.title || 'Red Alert'} - ${area}`,
          description: obj.desc || obj.title || '',
          publishedAt: new Date().toISOString(),
          country: 'Israel',
          city: String(area),
          isRelevant: true,
          alertType: 'air_strike',
          severity: 'red',
          confidence: 0.97,
          sourceUrl: 'https://www.oref.org.il/',
        });
      }
      break;
    }
    case 'liveuamap': {
      const events = Array.isArray(data) ? data : (data.events || []);
      for (const e of events) {
        items.push({
          externalId: `luam_${e.id || e.time}`,
          title: e.title || e.text || 'Update',
          description: e.text || e.description || '',
          publishedAt: e.time ? new Date(e.time * 1000).toISOString() : new Date().toISOString(),
          country: 'Ukraine',
          city: e.place || '',
          latitude: e.lat || 0,
          longitude: e.lng || 0,
          isRelevant: true,
          alertType: detectAlertType(e.title || e.text || ''),
          severity: 'orange',
          confidence: 0.8,
          sourceUrl: e.link || 'https://liveuamap.com/',
        });
      }
      break;
    }
  }

  return items;
}

// Detect alert type from text
function detectAlertType(text: string): AlertData['type'] {
  const lower = text.toLowerCase();
  if (lower.includes('air') || lower.includes('drone') || lower.includes('missile') || lower.includes('bomb')) return 'air_strike';
  if (lower.includes('artiller') || lower.includes('shell') || lower.includes('mortar')) return 'artillery';
  if (lower.includes('chemical') || lower.includes('gas') || lower.includes('toxic')) return 'chemical';
  if (lower.includes('curfew') || lower.includes('lockdown') || lower.includes('restriction')) return 'curfew';
  if (lower.includes('conflict') || lower.includes('clash') || lower.includes('battle') || lower.includes('fight')) return 'conflict';
  return 'other';
}

// Detect severity from text
function detectSeverity(title: string, body: string): AlertData['severity'] {
  const text = (title + ' ' + body).toLowerCase();
  if (text.includes('urgent') || text.includes('critical') || text.includes('immediate') ||
      text.includes('mass casualt') || text.includes('emergency')) return 'red';
  if (text.includes('warning') || text.includes('escalat') || text.includes('intensif')) return 'orange';
  return 'yellow';
}

// ============================================================
// Incremental Crawl - Fetch only new data since last check
// ============================================================
async function incrementalCrawl(supabaseAdmin: any) {
  const now = new Date();
  const results: any[] = [];

  const { data: crawlStates } = await supabaseAdmin
    .from('alert_crawl_state')
    .select('*');

  const stateMap: Record<string, any> = {};
  if (crawlStates) {
    for (const s of crawlStates) stateMap[s.source_name] = s;
  }

  for (const source of REALTIME_SOURCES) {
    const lastState = stateMap[source.name];
    const since = lastState?.last_crawl_at ? new Date(lastState.last_crawl_at) : new Date(now.getTime() - 3600000); // default: last 1 hour

    try {
      const result = await crawlSource(source, since, supabaseAdmin);
      results.push({
        source: source.name,
        since: since.toISOString(),
        newItems: result.newItems,
        avgDelaySeconds: result.avgDelaySeconds,
      });

      await supabaseAdmin
        .from('alert_crawl_state')
        .upsert({
          source_name: source.name,
          last_crawl_at: now.toISOString(),
          items_found: result.newItems,
          avg_delay_seconds: result.avgDelaySeconds,
          error: null,
        }, { onConflict: 'source_name' });
    } catch (e: any) {
      results.push({ source: source.name, error: e.message });
    }
  }

  return new Response(JSON.stringify({
    crawlTime: now.toISOString(),
    results,
    totalNewItems: results.reduce((s, r) => s + (r.newItems || 0), 0),
  }), { headers: corsHeaders });
}

// ============================================================
// Time Delay Analysis
// Compares platform publish time vs our detection/alert time
// ============================================================
async function timeDelayAnalysis(supabaseAdmin: any, req: Request) {
  let timeRange = 24; // hours
  let country: string | null = null;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      timeRange = body.hours || 24;
      country = body.country || null;
    } catch {}
  }

  const since = new Date(Date.now() - timeRange * 3600000).toISOString();

  // Query alerts that have source_published_at and detected_at fields
  let query = supabaseAdmin
    .from('alerts')
    .select('id, title, country, city, source, source_published_at, detected_at, detection_delay_seconds, severity, type, created_at')
    .gte('created_at', since)
    .not('source_published_at', 'is', null)
    .order('created_at', { ascending: false });

  if (country) {
    query = query.eq('country', country);
  }

  const { data: alerts, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const alertsData = alerts || [];

  // Calculate delay statistics
  const delays = alertsData
    .filter((a: any) => a.detection_delay_seconds != null)
    .map((a: any) => a.detection_delay_seconds);

  const bySource: Record<string, { count: number; totalDelay: number; minDelay: number; maxDelay: number }> = {};
  const byCountry: Record<string, { count: number; totalDelay: number; avgDelay: number }> = {};
  const bySeverity: Record<string, { count: number; avgDelay: number }> = {};

  for (const alert of alertsData) {
    const delay = alert.detection_delay_seconds || 0;

    // Group by source
    if (!bySource[alert.source]) {
      bySource[alert.source] = { count: 0, totalDelay: 0, minDelay: Infinity, maxDelay: 0 };
    }
    bySource[alert.source].count++;
    bySource[alert.source].totalDelay += delay;
    bySource[alert.source].minDelay = Math.min(bySource[alert.source].minDelay, delay);
    bySource[alert.source].maxDelay = Math.max(bySource[alert.source].maxDelay, delay);

    // Group by country
    if (!byCountry[alert.country]) {
      byCountry[alert.country] = { count: 0, totalDelay: 0, avgDelay: 0 };
    }
    byCountry[alert.country].count++;
    byCountry[alert.country].totalDelay += delay;

    // Group by severity
    if (!bySeverity[alert.severity]) {
      bySeverity[alert.severity] = { count: 0, avgDelay: 0 };
    }
    bySeverity[alert.severity].count++;
    bySeverity[alert.severity].avgDelay += delay;
  }

  // Calculate averages
  for (const key of Object.keys(bySource)) {
    const s = bySource[key];
    (s as any).avgDelay = s.count > 0 ? Math.round(s.totalDelay / s.count) : 0;
    if (s.minDelay === Infinity) s.minDelay = 0;
  }
  for (const key of Object.keys(byCountry)) {
    const c = byCountry[key];
    c.avgDelay = c.count > 0 ? Math.round(c.totalDelay / c.count) : 0;
  }
  for (const key of Object.keys(bySeverity)) {
    const sv = bySeverity[key];
    sv.avgDelay = sv.count > 0 ? Math.round(sv.avgDelay / sv.count) : 0;
  }

  const overallAvg = delays.length > 0 ? Math.round(delays.reduce((a: number, b: number) => a + b, 0) / delays.length) : 0;
  const sortedDelays = [...delays].sort((a: number, b: number) => a - b);
  const p50 = sortedDelays.length > 0 ? sortedDelays[Math.floor(sortedDelays.length * 0.5)] : 0;
  const p95 = sortedDelays.length > 0 ? sortedDelays[Math.floor(sortedDelays.length * 0.95)] : 0;
  const p99 = sortedDelays.length > 0 ? sortedDelays[Math.floor(sortedDelays.length * 0.99)] : 0;

  return new Response(JSON.stringify({
    timeRange: `${timeRange}h`,
    analyzedAlerts: alertsData.length,
    delayStats: {
      average: overallAvg,
      median: p50,
      p95,
      p99,
      min: sortedDelays[0] || 0,
      max: sortedDelays[sortedDelays.length - 1] || 0,
      unit: 'seconds',
    },
    bySource,
    byCountry,
    bySeverity,
    performanceGrade: overallAvg < 60 ? 'A' : overallAvg < 300 ? 'B' : overallAvg < 900 ? 'C' : 'D',
    recommendations: generateDelayRecommendations(overallAvg, bySource),
  }), { headers: corsHeaders });
}

function generateDelayRecommendations(avgDelay: number, bySource: Record<string, any>): string[] {
  const recs: string[] = [];

  if (avgDelay > 300) {
    recs.push('Average detection delay exceeds 5 minutes. Consider increasing crawl frequency.');
  }
  if (avgDelay > 900) {
    recs.push('Critical: Average delay exceeds 15 minutes. Some alerts may arrive too late for users.');
  }
  if (avgDelay < 60) {
    recs.push('Excellent: Sub-minute average detection. System is performing optimally.');
  }

  for (const [source, stats] of Object.entries(bySource)) {
    if (stats.avgDelay > 600) {
      recs.push(`Source "${source}" has high average delay (${Math.round(stats.avgDelay)}s). Consider alternative data source.`);
    }
    if (stats.maxDelay > 3600) {
      recs.push(`Source "${source}" had outlier delay of ${Math.round(stats.maxDelay)}s. Check for connectivity issues.`);
    }
  }

  if (recs.length === 0) {
    recs.push('All sources performing within acceptable parameters.');
  }

  return recs;
}
