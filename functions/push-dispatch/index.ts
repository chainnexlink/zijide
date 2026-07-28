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

    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    const serviceToken = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    if (token !== serviceToken) {
      const { data: { user } } = await admin.auth.getUser(token);
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      const { data: staff } = await admin.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
      if (!staff || staff.role === 'viewer') {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
      }
    }

    const { userIds, all, title, body, data, severity } = await req.json();
    if (typeof title !== 'string' || !title.trim() || title.length > 120) {
      return new Response(JSON.stringify({ error: 'title required' }), { status: 400, headers: corsHeaders });
    }
    if (body != null && (typeof body !== 'string' || body.length > 1000)) {
      return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400, headers: corsHeaders });
    }
    if (data != null && (typeof data !== 'object' || JSON.stringify(data).length > 4096)) {
      return new Response(JSON.stringify({ error: 'invalid data' }), { status: 400, headers: corsHeaders });
    }
    if (severity != null && !['red', 'orange', 'yellow'].includes(severity)) {
      return new Response(JSON.stringify({ error: 'invalid severity' }), { status: 400, headers: corsHeaders });
    }

    let targets: string[] = Array.isArray(userIds)
      ? [...new Set(userIds.filter((id: unknown) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 1000) as string[]
      : [];
    if (all === true) {
      const { data: subs } = await admin
        .from('user_alert_settings')
        .select('user_id')
        .eq('push_enabled', true);
      targets = (subs || []).map((s: any) => s.user_id);
    }
    if (!all && !targets.length) {
      return new Response(JSON.stringify({ error: 'valid userIds required' }), { status: 400, headers: corsHeaders });
    }

    const result = await sendPushToUsers(admin, targets, {
      title: title.trim(),
      body: body || '',
      data: data || {},
      severity,
    });

    return new Response(JSON.stringify({ success: true, ...result }), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), { status: 500, headers: corsHeaders });
  }
});
