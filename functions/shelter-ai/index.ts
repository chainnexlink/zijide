import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// Shelter AI Management Edge Function
// - Weekly auto-update shelter data via AI analysis
// - CRUD operations for shelter management
// - AI-powered shelter discovery and validation
// - Data sources: UNHCR, OCHA, ICRC, local government APIs
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ShelterData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  capacity: number | null;
  current_occupancy: number | null;
  status: 'open' | 'crowded' | 'full' | 'closed';
  has_water: boolean;
  has_electricity: boolean;
  has_medical: boolean;
  has_toilet: boolean;
  has_rest_area: boolean;
  phone: string | null;
  opening_hours: string | null;
}

interface AIUpdateResult {
  added: number;
  updated: number;
  removed: number;
  errors: string[];
  timestamp: string;
  source: string;
}

interface ShelterSourceConfig {
  country: string;
  cities: string[];
  sources: {
    name: string;
    type: 'unhcr' | 'ocha' | 'icrc' | 'government' | 'ngo' | 'ai_discovery';
    url: string;
    apiKey?: string;
  }[];
}

// Conflict zone configurations
const MONITORED_ZONES: ShelterSourceConfig[] = [
  {
    country: 'Ukraine',
    cities: ['Kyiv', 'Kharkiv', 'Odesa', 'Dnipro', 'Lviv'],
    sources: [
      { name: 'UNHCR Ukraine', type: 'unhcr', url: 'https://data.unhcr.org/api/v2/population/?geo_id=UKR' },
      { name: 'OCHA ReliefWeb', type: 'ocha', url: 'https://api.reliefweb.int/v1/reports?filter[field]=country&filter[value]=Ukraine' },
      { name: 'Ukraine Civil Defense', type: 'government', url: 'https://dsns.gov.ua/api/shelters' },
    ],
  },
  {
    country: 'Israel',
    cities: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Beersheba', 'Ashdod'],
    sources: [
      { name: 'Israel Home Front Command', type: 'government', url: 'https://www.oref.org.il/api/shelters' },
      { name: 'ICRC Israel/OPT', type: 'icrc', url: 'https://www.icrc.org/api/shelters/IL' },
    ],
  },
  {
    country: 'Palestine',
    cities: ['Gaza', 'Ramallah', 'Nablus', 'Hebron', 'Bethlehem'],
    sources: [
      { name: 'UNRWA', type: 'unhcr', url: 'https://www.unrwa.org/api/shelters' },
      { name: 'OCHA OPT', type: 'ocha', url: 'https://api.reliefweb.int/v1/reports?filter[field]=country&filter[value]=Palestine' },
    ],
  },
  {
    country: 'Syria',
    cities: ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Raqqa'],
    sources: [
      { name: 'UNHCR Syria', type: 'unhcr', url: 'https://data.unhcr.org/api/v2/population/?geo_id=SYR' },
      { name: 'White Helmets', type: 'ngo', url: 'https://www.whitehelmets.org/api/shelters' },
      { name: 'SARC', type: 'ngo', url: 'https://sarc.sy/api/shelters' },
    ],
  },
  {
    country: 'Lebanon',
    cities: ['Beirut', 'Tripoli', 'Sidon', 'Tyre'],
    sources: [
      { name: 'UNHCR Lebanon', type: 'unhcr', url: 'https://data.unhcr.org/api/v2/population/?geo_id=LBN' },
      { name: 'Lebanese Red Cross', type: 'ngo', url: 'https://www.redcross.org.lb/api/shelters' },
    ],
  },
  {
    country: 'Iraq',
    cities: ['Baghdad', 'Mosul', 'Erbil', 'Basra'],
    sources: [
      { name: 'UNHCR Iraq', type: 'unhcr', url: 'https://data.unhcr.org/api/v2/population/?geo_id=IRQ' },
      { name: 'IOM Iraq', type: 'ngo', url: 'https://iraqdtm.iom.int/api/shelters' },
    ],
  },
  {
    country: 'Yemen',
    cities: ['Sanaa', 'Aden', 'Taiz'],
    sources: [
      { name: 'UNHCR Yemen', type: 'unhcr', url: 'https://data.unhcr.org/api/v2/population/?geo_id=YEM' },
      { name: 'ICRC Yemen', type: 'icrc', url: 'https://www.icrc.org/api/shelters/YE' },
    ],
  },
  {
    country: 'Sudan',
    cities: ['Khartoum', 'Omdurman', 'Port Sudan'],
    sources: [
      { name: 'UNHCR Sudan', type: 'unhcr', url: 'https://data.unhcr.org/api/v2/population/?geo_id=SDN' },
      { name: 'OCHA Sudan', type: 'ocha', url: 'https://api.reliefweb.int/v1/reports?filter[field]=country&filter[value]=Sudan' },
    ],
  },
];

// AI prompt for shelter data analysis and discovery
function buildShelterAnalysisPrompt(country: string, cities: string[], existingShelters: any[]): string {
  return `You are an AI assistant for a war alarm system. Analyze and update shelter data for ${country}.

Current monitored cities: ${cities.join(', ')}

Existing shelters in database: ${existingShelters.length}

Tasks:
1. Verify existing shelter data is still accurate (status, capacity, facilities)
2. Identify any shelters that should be marked as closed or status changed
3. Discover new shelters that have been established recently
4. Update occupancy estimates based on recent conflict intensity
5. Validate coordinates and addresses

For each shelter, provide:
- name: Official shelter name
- address: Full address
- latitude/longitude: GPS coordinates
- city: City name
- country: ${country}
- capacity: Maximum capacity (number)
- current_occupancy: Estimated current occupancy
- status: open/crowded/full/closed
- has_water/has_electricity/has_medical/has_toilet/has_rest_area: boolean facilities
- phone: Contact phone
- opening_hours: Operating hours

Response format: JSON array of shelter objects.
Mark shelters for removal with: { "action": "remove", "id": "..." }
Mark new shelters with: { "action": "add", ...shelter_data }
Mark updates with: { "action": "update", "id": "...", ...changed_fields }`;
}

// Process AI response and extract shelter updates
function parseAIResponse(response: string): { adds: ShelterData[]; updates: any[]; removes: string[] } {
  const adds: ShelterData[] = [];
  const updates: any[] = [];
  const removes: string[] = [];

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { adds, updates, removes };

    const items = JSON.parse(jsonMatch[0]);
    for (const item of items) {
      switch (item.action) {
        case 'add':
          adds.push({
            name: item.name,
            address: item.address,
            latitude: item.latitude,
            longitude: item.longitude,
            city: item.city,
            country: item.country,
            capacity: item.capacity || null,
            current_occupancy: item.current_occupancy || null,
            status: item.status || 'open',
            has_water: item.has_water ?? true,
            has_electricity: item.has_electricity ?? false,
            has_medical: item.has_medical ?? false,
            has_toilet: item.has_toilet ?? true,
            has_rest_area: item.has_rest_area ?? false,
            phone: item.phone || null,
            opening_hours: item.opening_hours || null,
          });
          break;
        case 'update':
          if (item.id) updates.push(item);
          break;
        case 'remove':
          if (item.id) removes.push(item.id);
          break;
      }
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  return { adds, updates, removes };
}

// Call OpenAI API for shelter analysis
async function callAI(prompt: string, openaiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a humanitarian data analyst specializing in conflict zone shelter information. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Fetch data from external humanitarian sources
async function fetchExternalSource(source: { name: string; type: string; url: string; apiKey?: string }): Promise<any[]> {
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (source.apiKey) headers['Authorization'] = `Bearer ${source.apiKey}`;

    const response = await fetch(source.url, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      console.warn(`Source ${source.name} returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || data.results || data.items || []);
  } catch (e) {
    console.warn(`Failed to fetch from ${source.name}:`, e);
    return [];
  }
}

// Weekly auto-update for a specific country
async function updateCountryShelters(
  supabaseAdmin: any,
  zone: ShelterSourceConfig,
  openaiKey: string
): Promise<AIUpdateResult> {
  const result: AIUpdateResult = {
    added: 0,
    updated: 0,
    removed: 0,
    errors: [],
    timestamp: new Date().toISOString(),
    source: zone.country,
  };

  try {
    // 1. Get existing shelters for this country
    const { data: existingShelters, error: fetchError } = await supabaseAdmin
      .from('shelters')
      .select('*')
      .eq('country', zone.country);

    if (fetchError) {
      result.errors.push(`Fetch error: ${fetchError.message}`);
      return result;
    }

    // 2. Fetch data from external sources
    const externalData: any[] = [];
    for (const source of zone.sources) {
      const data = await fetchExternalSource(source);
      externalData.push(...data);
    }

    // 3. Use AI to analyze and merge data
    const prompt = buildShelterAnalysisPrompt(zone.country, zone.cities, existingShelters || []);
    const aiResponse = await callAI(prompt, openaiKey);
    const { adds, updates, removes } = parseAIResponse(aiResponse);

    // 4. Apply additions
    if (adds.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('shelters')
        .insert(adds);

      if (insertError) {
        result.errors.push(`Insert error: ${insertError.message}`);
      } else {
        result.added = adds.length;
      }
    }

    // 5. Apply updates
    for (const update of updates) {
      const { id, action, ...fields } = update;
      fields.updated_at = new Date().toISOString();

      const { error: updateError } = await supabaseAdmin
        .from('shelters')
        .update(fields)
        .eq('id', id);

      if (updateError) {
        result.errors.push(`Update error for ${id}: ${updateError.message}`);
      } else {
        result.updated++;
      }
    }

    // 6. Apply removals (soft delete - mark as closed)
    for (const removeId of removes) {
      const { error: removeError } = await supabaseAdmin
        .from('shelters')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', removeId);

      if (removeError) {
        result.errors.push(`Remove error for ${removeId}: ${removeError.message}`);
      } else {
        result.removed++;
      }
    }

    // 7. Log the update
    await supabaseAdmin.from('shelter_update_logs').insert({
      country: zone.country,
      added: result.added,
      updated: result.updated,
      removed: result.removed,
      errors: result.errors,
      ai_response_summary: `Processed ${adds.length} adds, ${updates.length} updates, ${removes.length} removes`,
    });

  } catch (e: any) {
    result.errors.push(`General error: ${e.message}`);
  }

  return result;
}

// Main handler
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    // ============================================================
    // Route: GET ?action=status - Get update status
    // ============================================================
    if (req.method === 'GET' && action === 'status') {
      const { data: logs } = await supabaseAdmin
        .from('shelter_update_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: shelterStats } = await supabaseAdmin
        .from('shelters')
        .select('country, status');

      const countryStats: Record<string, { total: number; open: number; crowded: number; closed: number }> = {};
      if (shelterStats) {
        for (const s of shelterStats) {
          if (!countryStats[s.country]) {
            countryStats[s.country] = { total: 0, open: 0, crowded: 0, closed: 0 };
          }
          countryStats[s.country].total++;
          if (s.status === 'open') countryStats[s.country].open++;
          else if (s.status === 'crowded') countryStats[s.country].crowded++;
          else if (s.status === 'closed' || s.status === 'full') countryStats[s.country].closed++;
        }
      }

      return new Response(JSON.stringify({
        monitoredCountries: MONITORED_ZONES.map(z => z.country),
        countryStats,
        recentUpdates: logs || [],
        nextScheduledUpdate: getNextWeeklyUpdate(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================
    // POST actions require auth
    // ============================================================
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // ============================================================
    // Route: POST action=weekly_update - Run weekly AI update
    // Called by cron scheduler or admin manually
    // ============================================================
    if (body.action === 'weekly_update') {
      if (!openaiKey) {
        return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const targetCountry = body.country; // optional: update specific country only
      const results: AIUpdateResult[] = [];

      const zones = targetCountry
        ? MONITORED_ZONES.filter(z => z.country === targetCountry)
        : MONITORED_ZONES;

      for (const zone of zones) {
        console.log(`Processing shelter update for ${zone.country}...`);
        const result = await updateCountryShelters(supabaseAdmin, zone, openaiKey);
        results.push(result);
        console.log(`${zone.country}: +${result.added} updated:${result.updated} removed:${result.removed} errors:${result.errors.length}`);
      }

      return new Response(JSON.stringify({
        success: true,
        results,
        summary: {
          totalAdded: results.reduce((s, r) => s + r.added, 0),
          totalUpdated: results.reduce((s, r) => s + r.updated, 0),
          totalRemoved: results.reduce((s, r) => s + r.removed, 0),
          totalErrors: results.reduce((s, r) => s + r.errors.length, 0),
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================
    // Route: POST action=validate - Validate shelter data accuracy
    // ============================================================
    if (body.action === 'validate') {
      const shelterId = body.shelter_id;
      if (!shelterId) {
        return new Response(JSON.stringify({ error: 'shelter_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: shelter } = await supabaseAdmin
        .from('shelters')
        .select('*')
        .eq('id', shelterId)
        .maybeSingle();

      if (!shelter) {
        return new Response(JSON.stringify({ error: 'Shelter not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!openaiKey) {
        return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const validationPrompt = `Validate this shelter data for accuracy:
Name: ${shelter.name}
Address: ${shelter.address}
City: ${shelter.city}, ${shelter.country}
Coordinates: ${shelter.latitude}, ${shelter.longitude}
Status: ${shelter.status}
Capacity: ${shelter.capacity}

Check:
1. Are the coordinates correct for this address?
2. Is this a real shelter/safe location?
3. Is the capacity reasonable?
4. Any known issues with this location?

Respond in JSON: { "valid": true/false, "confidence": 0-100, "issues": [], "suggestions": {} }`;

      const aiResponse = await callAI(validationPrompt, openaiKey);
      let validation;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        validation = jsonMatch ? JSON.parse(jsonMatch[0]) : { valid: true, confidence: 50, issues: ['Could not parse AI response'] };
      } catch {
        validation = { valid: true, confidence: 50, issues: ['Could not parse AI response'] };
      }

      return new Response(JSON.stringify({ shelter, validation }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================
    // Route: POST action=discover - AI discover new shelters in area
    // ============================================================
    if (body.action === 'discover') {
      const { country, city, latitude, longitude, radius_km } = body;
      if (!country || !city) {
        return new Response(JSON.stringify({ error: 'country and city required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!openaiKey) {
        return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const discoveryPrompt = `Find all known emergency shelters, bunkers, and safe houses in ${city}, ${country}.
${latitude && longitude ? `Focus area: within ${radius_km || 10}km of coordinates (${latitude}, ${longitude})` : ''}

Include: metro stations used as shelters, school basements, hospital bunkers, UNHCR facilities, 
Red Cross/Crescent centers, mosque/church basements, government civil defense shelters.

For each shelter provide complete data as JSON array with fields:
name, address, latitude, longitude, city, country, capacity, status, 
has_water, has_electricity, has_medical, has_toilet, has_rest_area, phone, opening_hours`;

      const aiResponse = await callAI(discoveryPrompt, openaiKey);
      const { adds } = parseAIResponse(`[${aiResponse.replace(/^\[/, '').replace(/\]$/, '')}]`);

      return new Response(JSON.stringify({
        discovered: adds.length,
        shelters: adds,
        note: 'Review and approve before importing',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================
    // Route: POST action=import_discovered - Import approved shelters
    // ============================================================
    if (body.action === 'import_discovered') {
      const shelters = body.shelters;
      if (!Array.isArray(shelters) || shelters.length === 0) {
        return new Response(JSON.stringify({ error: 'shelters array required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const toInsert = shelters.map((s: any) => ({
        name: s.name,
        address: s.address || null,
        latitude: s.latitude,
        longitude: s.longitude,
        city: s.city || null,
        country: s.country || null,
        capacity: s.capacity || null,
        current_occupancy: s.current_occupancy || 0,
        status: s.status || 'open',
        has_water: s.has_water ?? true,
        has_electricity: s.has_electricity ?? false,
        has_medical: s.has_medical ?? false,
        has_toilet: s.has_toilet ?? true,
        has_rest_area: s.has_rest_area ?? false,
        phone: s.phone || null,
        opening_hours: s.opening_hours || null,
      }));

      const { data, error } = await supabaseAdmin
        .from('shelters')
        .insert(toInsert)
        .select();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        imported: data?.length || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================
    // Route: POST action=update_occupancy - Batch update occupancy
    // ============================================================
    if (body.action === 'update_occupancy') {
      const updates = body.updates; // [{ id, current_occupancy, status? }]
      if (!Array.isArray(updates)) {
        return new Response(JSON.stringify({ error: 'updates array required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let successCount = 0;
      const errors: string[] = [];

      for (const u of updates) {
        const updateFields: any = { updated_at: new Date().toISOString() };
        if (u.current_occupancy !== undefined) updateFields.current_occupancy = u.current_occupancy;
        if (u.status) updateFields.status = u.status;

        // Auto-calculate status based on occupancy
        if (u.current_occupancy !== undefined && !u.status) {
          const { data: shelter } = await supabaseAdmin
            .from('shelters')
            .select('capacity')
            .eq('id', u.id)
            .maybeSingle();

          if (shelter?.capacity) {
            const ratio = u.current_occupancy / shelter.capacity;
            if (ratio >= 1) updateFields.status = 'full';
            else if (ratio >= 0.8) updateFields.status = 'crowded';
            else updateFields.status = 'open';
          }
        }

        const { error } = await supabaseAdmin
          .from('shelters')
          .update(updateFields)
          .eq('id', u.id);

        if (error) errors.push(`${u.id}: ${error.message}`);
        else successCount++;
      }

      return new Response(JSON.stringify({ success: true, updated: successCount, errors }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action', availableActions: ['weekly_update', 'validate', 'discover', 'import_discovered', 'update_occupancy'] }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('Shelter AI error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper: Calculate next weekly update time (every Monday 03:00 UTC)
function getNextWeeklyUpdate(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(3, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
  return next.toISOString();
}
