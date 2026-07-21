export async function sendEmail(to: string, subject: string, text: string): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') || 'WarRescue <alerts@warrescue.app>';
  if (!apiKey || !to) return { ok: false, skipped: true, error: 'Email provider not configured' };
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text }) });
    if (!response.ok) return { ok: false, error: await response.text() };
    return { ok: true };
  } catch (error: any) { return { ok: false, error: error.message }; }
}
