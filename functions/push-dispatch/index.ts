import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushToUsers } from '../_shared/push.ts';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 统一推送下发入口。
 * body: { userIds: string[], title: string, body?: string, data?: object, severity?: 'red'|'orange'|'yellow' }
 * 也可 { all: true } 给所有开启推送的用户下发（用于全局公告/演练）。
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { userIds, all, title, body, data, severity } = await req.json();
    if (!title) {
      return new Response(JSON.stringify({ error: 'title required' }), { status: 400, headers: corsHeaders });
    }

    let targets: string[] = Array.isArray(userIds) ? userIds : [];
    if (all === true) {
      const { data: subs } = await admin
        .from('user_alert_settings')
        .select('user_id')
        .eq('push_enabled', true);
      targets = (subs || []).map((s: any) => s.user_id);
    }

    const result = await sendPushToUsers(admin, targets, {
      title,
      body: body || '',
      data: data || {},
      severity,
    });

    return new Response(JSON.stringify({ success: true, ...result }), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
});
