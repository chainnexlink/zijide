import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AlertSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'api' | 'webhook';
  lastChecked: string;
  country: string;
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
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      case 'process':
        return await processPendingAlerts(supabaseAdmin);
      case 'cleanup':
        return await cleanupExpiredAlerts(supabaseAdmin);
      case 'stats':
        return await getMonitoringStats(supabaseAdmin);
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
  const sources: AlertSource[] = [
    { id: 'ua_alerts', name: 'Ukraine Alerts', url: 'https://alerts.com.ua/', type: 'api', lastChecked: new Date(0).toISOString(), country: 'Ukraine' },
    { id: 'il_alerts', name: 'Israel Alerts', url: 'https://www.oref.org.il/', type: 'api', lastChecked: new Date(0).toISOString(), country: 'Israel' },
    { id: 'sy_alerts', name: 'Syria Alerts', url: 'https://syria.liveuamap.com/', type: 'rss', lastChecked: new Date(0).toISOString(), country: 'Syria' },
    { id: 'tr_alerts', name: 'Turkey Alerts', url: 'https://deprem.afad.gov.tr/', type: 'api', lastChecked: new Date(0).toISOString(), country: 'Turkey' },
    { id: 'ps_alerts', name: 'Palestine Alerts', url: 'https://gaza.liveuamap.com/', type: 'rss', lastChecked: new Date(0).toISOString(), country: 'Palestine' },
  ];

  const collectedAlerts: AlertData[] = [];
  const now = new Date();

  for (const source of sources) {
    try {
      const mockAlerts = generateMockAlerts(source, now);
      collectedAlerts.push(...mockAlerts);
    } catch (error) {
      console.error(`Error collecting from ${source.name}:`, error);
    }
  }

  const newAlerts = [];
  for (const alert of collectedAlerts) {
    const { data: existing } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('source_url', alert.sourceUrl)
      .maybeSingle();

    if (!existing) {
      const { data, error } = await supabaseAdmin
        .from('alerts')
        .insert({
          title: alert.title,
          description: alert.description,
          type: alert.type,
          severity: alert.severity,
          latitude: alert.latitude,
          longitude: alert.longitude,
          country: alert.country,
          city: alert.city,
          source: alert.source,
          source_url: alert.sourceUrl,
          expires_at: alert.expiresAt,
          is_active: true,
        })
        .select()
        .single();

      if (!error && data) {
        newAlerts.push(data);
        await notifySubscribers(supabaseAdmin, data);
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    collected: collectedAlerts.length,
    new: newAlerts.length,
    timestamp: now.toISOString(),
  }), { headers: corsHeaders });
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
    };

    alerts.push(alert);
  }

  return alerts;
}

async function notifySubscribers(supabaseAdmin: any, alert: any) {
  const { data: subscribers } = await supabaseAdmin
    .from('user_alert_settings')
    .select('user_id')
    .eq('push_enabled', true);

  if (subscribers && subscribers.length > 0) {
    const notifications = subscribers.map((sub: any) => ({
      user_id: sub.user_id,
      title: `🚨 ${alert.title}`,
      body: alert.description,
      type: 'alert',
      data: { alert_id: alert.id },
    }));

    await supabaseAdmin.from('notifications').insert(notifications);
  }
}

async function processPendingAlerts(supabaseAdmin: any) {
  const { data: pendingAlerts, error } = await supabaseAdmin
    .from('alerts')
    .select('*')
    .eq('is_active', true)
    .lt('expires_at', new Date(Date.now() + 300000).toISOString());

  if (error) throw error;

  let processed = 0;
  for (const alert of pendingAlerts || []) {
    await supabaseAdmin
      .from('alerts')
      .update({ is_active: false })
      .eq('id', alert.id);
    processed++;
  }

  return new Response(JSON.stringify({
    success: true,
    processed,
    timestamp: new Date().toISOString(),
  }), { headers: corsHeaders });
}

async function cleanupExpiredAlerts(supabaseAdmin: any) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .delete()
    .eq('is_active', false)
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
    .eq('is_active', true);

  const { data: todayAlerts } = await supabaseAdmin
    .from('alerts')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const stats = {
    active: {
      total: activeAlerts?.length || 0,
      red: activeAlerts?.filter((a: any) => a.severity === 'red').length || 0,
      orange: activeAlerts?.filter((a: any) => a.severity === 'orange').length || 0,
      yellow: activeAlerts?.filter((a: any) => a.severity === 'yellow').length || 0,
    },
    today: todayAlerts?.length || 0,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(stats), { headers: corsHeaders });
}
