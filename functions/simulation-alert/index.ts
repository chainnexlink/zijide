import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimulationAlertRequest {
  action: 'start_trial' | 'trigger_alert' | 'acknowledge_alert' | 'get_trial_status' | 'get_alerts';
  user_id?: string;
  trial_id?: string;
  alert_id?: string;
  alert_type?: string;
  severity?: string;
  latitude?: number;
  longitude?: number;
}

// 模拟预警模板
const alertTemplates = [
  {
    type: 'air_strike',
    severity: 'red',
    titles: {
      zh: '空袭预警 - 立即避难',
      en: 'Air Strike Alert - Take Shelter',
      ru: 'Тревога - Воздушный удар',
      ar: 'تنبيه غارة جوية - التزم الملجأ',
      es: 'Alerta de Ataque Aéreo - Refugio',
      fr: 'Alerte Raid Aérien - Abri',
      pt: 'Alerta de Ataque Aéreo - Abrigo',
      de: 'Luftangriff Alarm - Schutzraum',
      tr: 'Hava Saldırısı Uyarısı - Sığınak'
    },
    descriptions: {
      zh: '检测到敌方空袭活动，请立即前往最近的避难所。距离您当前位置约{distance}公里。',
      en: 'Enemy air strike activity detected. Proceed to nearest shelter immediately. Approximately {distance}km from your location.',
      ru: 'Обнаружена вражеская авиация. Немедленно проследуйте в ближайшее укрытие.',
      ar: 'تم رصد نشاط جوي معادي. اذهب إلى الملجأ الأقرب فوراً.',
      es: 'Actividad aérea enemiga detectada. Vaya al refugio más cercano inmediatamente.',
      fr: 'Activité aérienne ennemie détectée. Allez immédiatement à l\'abri le plus proche.',
      pt: 'Atividade aérea inimiga detectada. Vá para o abrigo mais próximo imediatamente.',
      de: 'Feindliche Luftaktivität erkannt. Gehen Sie sofort in den nächsten Schutzraum.',
      tr: 'Düşman hava aktivitesi tespit edildi. En yakın sığınaga hemen gidin.'
    }
  },
  {
    type: 'artillery',
    severity: 'orange',
    titles: {
      zh: '炮击预警',
      en: 'Artillery Alert',
      ru: 'Тревога - Артиллерия',
      ar: 'تنبيه مدفعية',
      es: 'Alerta de Artillería',
      fr: 'Alerte Artillerie',
      pt: 'Alerta de Artilharia',
      de: 'Artillerie Alarm',
      tr: 'Topçu Uyarısı'
    },
    descriptions: {
      zh: '检测到敌方炮击活动，请保持警惕并寻找掩护。',
      en: 'Enemy artillery activity detected. Stay alert and seek cover.',
      ru: 'Обнаружена вражеская артиллерия. Будьте начеку.',
      ar: 'تم رصد نشاط مدفعي معادي. كن يقظاً.',
      es: 'Actividad de artillería enemiga detectada. Manténgase alerta.',
      fr: 'Activité d\'artillerie ennemie détectée. Restez vigilant.',
      pt: 'Atividade de artilharia inimiga detectada. Fique alerta.',
      de: 'Feindliche Artillerieaktivität erkannt. Bleiben Sie wachsam.',
      tr: 'Düşman topçu aktivitesi tespit edildi. Tetikte olun.'
    }
  },
  {
    type: 'conflict',
    severity: 'yellow',
    titles: {
      zh: '冲突区域警告',
      en: 'Conflict Zone Warning',
      ru: 'Предупреждение - Зона конфликта',
      ar: 'تحذير منطقة صراع',
      es: 'Advertencia de Zona de Conflicto',
      fr: 'Avertissement Zone de Conflit',
      pt: 'Aviso de Zona de Conflito',
      de: 'Konfliktzone Warnung',
      tr: 'Çatışma Bölgesi Uyarısı'
    },
    descriptions: {
      zh: '附近区域发生冲突，请避开该区域并注意安全。',
      en: 'Conflict in nearby area. Avoid the area and stay safe.',
      ru: 'Конфликт в ближайшем районе. Избегайте этой зоны.',
      ar: 'صراع في المنطقة المجاورة. تجنب المنطقة وكن آمناً.',
      es: 'Conflicto en área cercana. Evite la zona.',
      fr: 'Conflit dans le secteur proche. Évitez la zone.',
      pt: 'Conflito na área próxima. Evite a zona.',
      de: 'Konflikt in der Nähe. Meiden Sie die Zone.',
      tr: 'Yakın bölgede çatışma. Bölgeden uzak durun.'
    }
  },
  {
    type: 'curfew',
    severity: 'yellow',
    titles: {
      zh: '宵禁通知',
      en: 'Curfew Notice',
      ru: 'Уведомление - Комендантский час',
      ar: 'إشعار حظر تجول',
      es: 'Aviso de Toque de Queda',
      fr: 'Avis de Couvre-feu',
      pt: 'Aviso de Toque de Recolher',
      de: 'Ausgangssperre Hinweis',
      tr: 'Sokağa Çıkma Yasağı Bildirimi'
    },
    descriptions: {
      zh: '本地区即将实施宵禁，请提前做好准备。',
      en: 'Curfew will be imposed in this area. Please prepare in advance.',
      ru: 'В этом районе будет введен комендантский час.',
      ar: 'سيتم فرض حظر تجول في هذه المنطقة.',
      es: 'Se impondrá toque de queda en esta área.',
      fr: 'Un couvre-feu sera imposé dans ce secteur.',
      pt: 'Toque de recolher será imposto nesta área.',
      de: 'In diesem Gebiet wird eine Ausgangssperre verhängt.',
      tr: 'Bu bölgede sokağa çıkma yasağı uygulanacak.'
    }
  }
];

// 模拟城市数据
const cities = [
  { name: 'Kyiv', country: 'Ukraine', lat: 50.4501, lng: 30.5234 },
  { name: 'Kharkiv', country: 'Ukraine', lat: 49.9935, lng: 36.2304 },
  { name: 'Odesa', country: 'Ukraine', lat: 46.4825, lng: 30.7233 },
  { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { name: 'Jerusalem', country: 'Israel', lat: 31.7683, lng: 35.2137 },
  { name: 'Beirut', country: 'Lebanon', lat: 33.8938, lng: 35.5018 },
  { name: 'Baghdad', country: 'Iraq', lat: 33.3152, lng: 44.3661 },
  { name: 'Addis Ababa', country: 'Ethiopia', lat: 9.145, lng: 40.4897 }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SimulationAlertRequest = await req.json();
    const { action } = body;

    switch (action) {
      case 'start_trial':
        return await startTrial(supabase, body);
      case 'trigger_alert':
        return await triggerAlert(supabase, body);
      case 'acknowledge_alert':
        return await acknowledgeAlert(supabase, body);
      case 'get_trial_status':
        return await getTrialStatus(supabase, body);
      case 'get_alerts':
        return await getAlerts(supabase, body);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function startTrial(supabase: any, body: SimulationAlertRequest) {
  const { user_id } = body;
  
  if (!user_id) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 检查是否已有活跃体验
  const { data: existingTrial } = await supabase
    .from('simulation_trials')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .maybeSingle();

  if (existingTrial) {
    return new Response(JSON.stringify({ 
      success: true, 
      trial: existingTrial,
      message: 'Trial already active'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 创建7天体验记录
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: trial, error } = await supabase
    .from('simulation_trials')
    .insert({
      user_id,
      expires_at: expiresAt.toISOString(),
      is_active: true,
      alert_count: 0
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 立即触发第一个模拟预警（欢迎体验）
  await createWelcomeAlert(supabase, trial.id, user_id);

  return new Response(JSON.stringify({ 
    success: true, 
    trial,
    message: '7-day simulation trial started'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createWelcomeAlert(supabase: any, trialId: string, userId: string) {
  const welcomeAlert = {
    trial_id: trialId,
    user_id: userId,
    alert_type: 'system',
    severity: 'info',
    title: '模拟预警体验已启动',
    description: '您已进入7天模拟预警体验期。系统将模拟真实的预警场景，包括推送通知和短信提醒。',
    city: 'Simulation',
    country: 'Demo',
    reliability_score: 100,
    push_sent: true,
    sms_sent: true
  };

  const { data: alert } = await supabase
    .from('simulation_alerts')
    .insert(welcomeAlert)
    .select()
    .single();

  if (alert) {
    // 记录通知日志（双向并行）
    await supabase.from('simulation_notifications').insert([
      { alert_id: alert.id, user_id: userId, channel: 'push', status: 'delivered', delivered_at: new Date().toISOString() },
      { alert_id: alert.id, user_id: userId, channel: 'sms', status: 'delivered', delivered_at: new Date().toISOString() },
      { alert_id: alert.id, user_id: userId, channel: 'in_app', status: 'delivered', delivered_at: new Date().toISOString() }
    ]);

    // 更新体验计数
    await supabase
      .from('simulation_trials')
      .update({ 
        alert_count: 1, 
        last_alert_at: new Date().toISOString() 
      })
      .eq('id', trialId);
  }

  return alert;
}

async function triggerAlert(supabase: any, body: SimulationAlertRequest) {
  const { user_id, trial_id, alert_type, severity, latitude, longitude } = body;
  
  if (!user_id || !trial_id) {
    return new Response(JSON.stringify({ error: 'User ID and Trial ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 获取体验记录
  const { data: trial } = await supabase
    .from('simulation_trials')
    .select('*')
    .eq('id', trial_id)
    .eq('user_id', user_id)
    .maybeSingle();

  if (!trial || !trial.is_active) {
    return new Response(JSON.stringify({ error: 'Trial not active' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 检查是否已过期
  if (new Date(trial.expires_at) < new Date()) {
    await supabase
      .from('simulation_trials')
      .update({ is_active: false })
      .eq('id', trial_id);
    
    return new Response(JSON.stringify({ error: 'Trial expired' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 生成模拟预警
  const template = alertTemplates.find(t => t.type === alert_type) || alertTemplates[0];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const userLat = latitude || city.lat;
  const userLng = longitude || city.lng;
  const distance = Math.floor(Math.random() * 10) + 1;

  // 计算距离
  const calculatedDistance = calculateDistance(userLat, userLng, city.lat, city.lng);

  const alertData = {
    trial_id: trial_id,
    user_id: user_id,
    alert_type: alert_type || template.type,
    severity: severity || template.severity,
    title: template.titles.zh,
    description: template.descriptions.zh.replace('{distance}', calculatedDistance.toFixed(1)),
    city: city.name,
    country: city.country,
    latitude: city.lat,
    longitude: city.lng,
    distance: calculatedDistance,
    reliability_score: Math.floor(Math.random() * 20) + 80,
    push_sent: true,
    sms_sent: true
  };

  const { data: alert, error } = await supabase
    .from('simulation_alerts')
    .insert(alertData)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 双向并行通知记录
  const now = new Date().toISOString();
  await supabase.from('simulation_notifications').insert([
    { 
      alert_id: alert.id, 
      user_id: user_id, 
      channel: 'push', 
      status: 'delivered', 
      sent_at: now,
      delivered_at: now 
    },
    { 
      alert_id: alert.id, 
      user_id: user_id, 
      channel: 'sms', 
      status: 'delivered', 
      sent_at: now,
      delivered_at: now 
    },
    { 
      alert_id: alert.id, 
      user_id: user_id, 
      channel: 'in_app', 
      status: 'delivered', 
      sent_at: now,
      delivered_at: now 
    }
  ]);

  // 更新体验统计
  await supabase
    .from('simulation_trials')
    .update({ 
      alert_count: (trial.alert_count || 0) + 1, 
      last_alert_at: now 
    })
    .eq('id', trial_id);

  return new Response(JSON.stringify({ 
    success: true, 
    alert,
    message: 'Simulation alert triggered with dual-channel notification'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function acknowledgeAlert(supabase: any, body: SimulationAlertRequest) {
  const { user_id, alert_id } = body;
  
  if (!user_id || !alert_id) {
    return new Response(JSON.stringify({ error: 'User ID and Alert ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data, error } = await supabase
    .from('simulation_alerts')
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', alert_id)
    .eq('user_id', user_id)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    alert: data 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getTrialStatus(supabase: any, body: SimulationAlertRequest) {
  const { user_id } = body;
  
  if (!user_id) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: trial, error } = await supabase
    .from('simulation_trials')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 检查是否过期
  if (trial && new Date(trial.expires_at) < new Date()) {
    await supabase
      .from('simulation_trials')
      .update({ is_active: false })
      .eq('id', trial.id);
    
    trial.is_active = false;
  }

  return new Response(JSON.stringify({ 
    success: true, 
    trial,
    hasActiveTrial: !!trial && trial.is_active
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getAlerts(supabase: any, body: SimulationAlertRequest) {
  const { user_id, trial_id } = body;
  
  if (!user_id) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let query = supabase
    .from('simulation_alerts')
    .select('*, simulation_notifications(*)')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (trial_id) {
    query = query.eq('trial_id', trial_id);
  }

  const { data: alerts, error } = await query.limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    alerts 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
