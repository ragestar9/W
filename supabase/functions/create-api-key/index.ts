import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsResponse, errorResponse, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Raw key is shown exactly once, here, and is then unrecoverable.
// Only the sha256 hex digest is stored.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { user_id, name, rpm_limit, budget_usd, expires_at, allowed_model_ids } = await req.json();
    if (!user_id) return errorResponse('Missing user_id', 400);

    // Generate vg_live_<32 hex>
    const raw = `vg_live_${crypto.randomUUID().replace(/-/g, '')}`;
    const data = new TextEncoder().encode(raw);
    const buf = await crypto.subtle.digest('SHA-256', data);
    const keyHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: row, error } = await supabase
      .from('api_keys')
      .insert({
        profile_id: user_id,
        name: name || 'Default',
        key_hash: keyHash,
        key_prefix: raw.slice(0, 12),
        key_last_four: raw.slice(-4),
        rpm_limit: rpm_limit ?? null,
        budget_usd: budget_usd ?? null,
        expires_at: expires_at ?? null,
        allowed_model_ids: allowed_model_ids ?? null,
      })
      .select('id, name, key_prefix, key_last_four, status, created_at')
      .single();

    if (error) return errorResponse(error.message, 500);

    // The one and only time the raw key leaves the server.
    return jsonResponse({ ...row, raw_key: raw });
  } catch (e) {
    return errorResponse((e as Error).message, 500);
  }
});
