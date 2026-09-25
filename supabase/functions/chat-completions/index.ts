import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsResponse, errorResponse, jsonResponse, CORS_HEADERS } from '../_shared/cors.ts';
import { scrubObject, scrubText } from '../_shared/scrub.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EDGE_SECRET = Deno.env.get('EDGE_SECRET') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ──────────────────────────────────────────────────

function resolveClientIp(req: Request): string {
  if (EDGE_SECRET && req.headers.get('x-vg-edge-secret') === EDGE_SECRET) {
    const forwarded = req.headers.get('x-vg-client-ip');
    if (forwarded) return forwarded;
  }
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const start = Date.now();
  let keyId: string | null = null;
  let profileId: string | null = null;
  let modelPublicId: string | null = null;
  let upstreamId: string | null = null;

  try {
    // ── Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return errorResponse('Missing API key', 401);

    const keyHash = await hashKey(token);
    const { data: auth, error: authErr } = await supabase.rpc('authenticate_key', {
      p_key_hash: keyHash,
    });

    if (authErr || !auth || auth.length === 0) {
      return errorResponse('Invalid API key', 401);
    }

    const k = auth[0];
    keyId = k.key_id;
    profileId = k.profile_id;

    // ── Refuse chain ─────────────────────────────────────
    if (k.key_status !== 'active') return errorResponse('API key is not active', 403);
    if (k.profile_status === 'suspended') return errorResponse('Account suspended', 403);
    if (k.expires_at && new Date(k.expires_at) < new Date()) {
      return errorResponse('API key expired', 403);
    }
    if (k.budget_usd && k.spent_usd >= k.budget_usd) {
      return errorResponse('Budget exhausted', 429);
    }

    // ── Parse body ────────────────────────────────────────
    const body = await req.json();
    modelPublicId = body.model;
    if (!modelPublicId) return errorResponse('Missing model field', 400);
    const isStream = body.stream === true;

    // ── Resolve model routes ─────────────────────────────
    const { data: routes, error: routeErr } = await supabase
      .from('models')
      .select('id, upstream_id, upstream_model_id, priority, upstreams!inner(base_url, name, is_active)')
      .eq('public_id', modelPublicId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (routeErr || !routes || routes.length === 0) {
      return errorResponse(`Model "${modelPublicId}" not found`, 404);
    }

    // ── Walk candidates ──────────────────────────────────
    let lastError = 'All providers failed';

    for (const route of routes) {
      const upstream = (route as any).upstreams;
      if (!upstream?.is_active) continue;
      upstreamId = route.upstream_id;

      // Pick an active key that isn't in cooldown
      const { data: uKeys } = await supabase
        .from('upstream_keys')
        .select('id, key_encrypted')
        .eq('upstream_id', route.upstream_id)
        .eq('is_active', true)
        .or(`cooldown_until.is.null,cooldown_until.lt.${new Date().toISOString()}`)
        .limit(1);

      if (!uKeys || uKeys.length === 0) continue;

      const upstreamKey = uKeys[0].key_encrypted;
      const upstreamUrl = `${upstream.base_url}/v1/chat/completions`;

      const upstreamBody = {
        ...body,
        model: route.upstream_model_id,
      };

      try {
        const upstreamRes = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${upstreamKey}`,
          },
          body: JSON.stringify(upstreamBody),
        });

        if (!upstreamRes.ok) {
          lastError = `Upstream returned ${upstreamRes.status}`;
          // Cooldown this key on 429 or 5xx
          if (upstreamRes.status === 429 || upstreamRes.status >= 500) {
            const cooldownUntil = new Date(Date.now() + 60_000).toISOString();
            await supabase
              .from('upstream_keys')
              .update({ cooldown_until: cooldownUntil })
              .eq('id', uKeys[0].id);
          }
          continue;
        }

        const latencyMs = Date.now() - start;
        const clientIp = resolveClientIp(req);

        if (isStream) {
          // ── SSE streaming ──────────────────────────────
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const encoder = new TextEncoder();

          (async () => {
            const reader = upstreamRes.body!.getReader();
            const decoder = new TextDecoder();
            let inputTokens = 0;
            let outputTokens = 0;
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                let text = decoder.decode(value, { stream: true });
                // Rewrite model id in streamed chunks
                text = text.replace(
                  new RegExp(`"model"\\s*:\\s*"${route.upstream_model_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
                  `"model": "${modelPublicId}"`
                );
                text = scrubText(text);
                await writer.write(encoder.encode(text));
              }
            } finally {
              writer.close();
              // Log async
              supabase.from('request_logs').insert({
                api_key_id: keyId,
                profile_id: profileId,
                model_public_id: modelPublicId,
                upstream_id: upstreamId,
                status_code: upstreamRes.status,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                latency_ms: latencyMs,
                client_ip: clientIp,
              });
            }
          })();

          return new Response(readable, {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          });
        } else {
          // ── JSON response ──────────────────────────────
          const data = await upstreamRes.json();
          // Rewrite model id
          if (data.model) data.model = modelPublicId;
          const scrubbed = scrubObject(data);

          const inputTokens = data.usage?.prompt_tokens || 0;
          const outputTokens = data.usage?.completion_tokens || 0;

          // Log request (fire and forget)
          supabase.from('request_logs').insert({
            api_key_id: keyId,
            profile_id: profileId,
            model_public_id: modelPublicId,
            upstream_id: upstreamId,
            status_code: upstreamRes.status,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            latency_ms: latencyMs,
            client_ip: clientIp,
          });

          // Update spent
          // (simplified: a proper implementation would compute cost from token prices)
          return jsonResponse(scrubbed);
        }
      } catch (e) {
        lastError = (e as Error).message;
        continue;
      }
    }

    return errorResponse(lastError, 502);
  } catch (e) {
    const latencyMs = Date.now() - start;
    // Log error
    if (keyId) {
      supabase.from('request_logs').insert({
        api_key_id: keyId,
        profile_id: profileId,
        model_public_id: modelPublicId,
        upstream_id: upstreamId,
        status_code: 500,
        latency_ms: latencyMs,
        error_message: (e as Error).message,
        client_ip: resolveClientIp(req),
      });
    }
    return errorResponse('Internal server error', 500);
  }
});
