import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsResponse, errorResponse, jsonResponse, CORS_HEADERS } from '../_shared/cors.ts';
import { scrubObject, scrubText } from '../_shared/scrub.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EDGE_SECRET = Deno.env.get('EDGE_SECRET') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Error codes: one per refusal so customers can tell them apart ──
const ERR = {
  EDGE_LOCK: 'edge_lock_failed',
  MISSING_KEY: 'missing_api_key',
  INVALID_KEY: 'invalid_api_key',
  KEY_INACTIVE: 'key_not_active',
  ACCOUNT_SUSPENDED: 'account_suspended',
  KEY_EXPIRED: 'key_expired',
  BUDGET_EXHAUSTED: 'monthly_budget_exhausted',
  CREDITS_EXHAUSTED: 'credits_exhausted',
  SPEND_WINDOW: 'spend_window_exceeded',
  IP_RULE: 'ip_rule_violation',
  RATE_LIMIT: 'rate_limit_exceeded',
  MODEL_NOT_ALLOWED: 'model_not_allowed',
  TIER_REQUIRED: 'early_access_required',
  NO_ROUTE: 'no_route',
  UPSTREAM_FAILED: 'all_providers_failed',
} as const;

function refuse(code: keyof typeof ERR, message: string, status: number) {
  return jsonResponse({ error: { code: ERR[code], message: scrubText(message) } }, status);
}

// ── Helpers ──────────────────────────────────────────────────

function resolveClientIp(req: Request): string {
  // Trust the Worker's header only when the edge secret also checks out.
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

function buildUpstreamHeaders(u: any, secret: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const extra = (u.extra_headers as Record<string, string>) || {};
  for (const [k, v] of Object.entries(extra)) headers[k] = v;

  switch (u.auth_scheme) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${secret}`;
      break;
    case 'x-api-key':
      headers['x-api-key'] = secret;
      break;
    case 'api-key':
      headers['api-key'] = secret;
      break;
    case 'header':
      if (u.auth_header_name) headers[u.auth_header_name] = secret;
      break;
    case 'query':
      // handled in URL construction
      break;
  }
  return headers;
}

function buildUpstreamUrl(u: any, secret: string): string {
  const base = u.base_url.replace(/\/+$/, '');
  const path = (u.chat_path || '/v1/chat/completions').replace(/^\/+/, '');
  let url = `${base}/${path}`;
  if (u.auth_scheme === 'query' && u.auth_header_name) {
    url += `${url.includes('?') ? '&' : '?'}${encodeURIComponent(u.auth_header_name)}=${encodeURIComponent(secret)}`;
  }
  return url;
}

async function logRequest(fields: Record<string, unknown>) {
  try {
    await supabase.from('request_logs').insert(fields);
  } catch {
    // logging must never break the request path
  }
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
    // 1. Edge lock: when enabled, refuse anything without the Worker secret.
    if (EDGE_SECRET && req.headers.get('x-vg-edge-secret') !== EDGE_SECRET) {
      return refuse('EDGE_LOCK', 'Forbidden', 403);
    }

    // 2. Client IP (trusted only when the edge secret checked out).
    const clientIp = resolveClientIp(req);

    // 3. Authenticate: one round trip via SECURITY DEFINER RPC.
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return refuse('MISSING_KEY', 'Missing API key', 401);

    const keyHash = await hashKey(token);
    const { data: auth, error: authErr } = await supabase.rpc('authenticate_key', {
      p_key_hash: keyHash,
    });

    // No row = invalid key, OR dead key on a dead account (logged nowhere by design).
    if (authErr || !auth || auth.length === 0) {
      return refuse('INVALID_KEY', 'Invalid API key', 401);
    }

    const k = auth[0];
    keyId = k.key_id;
    profileId = k.profile_id;

    // 4. Refuse in fixed order, each with its own code, and log each refusal.
    const logRefusal = (code: string, msg: string, httpStatus: number) => {
      void logRequest({
        api_key_id: keyId, profile_id: profileId, model_public_id: modelPublicId,
        ok: false, status_code: httpStatus, error_code: code, client_ip: clientIp,
      });
      return jsonResponse({ error: { code, message: msg } }, httpStatus);
    };

    if (k.key_status !== 'active') return logRefusal(ERR.KEY_INACTIVE, 'API key is not active', 403);
    if (k.profile_status === 'suspended') return logRefusal(ERR.ACCOUNT_SUSPENDED, 'Account suspended', 403);
    if (k.expires_at && new Date(k.expires_at) < new Date()) return logRefusal(ERR.KEY_EXPIRED, 'API key expired', 403);

    const settingsRes = await supabase.from('app_settings').select('*').eq('id', 1).single();
    const settings = settingsRes.data || {};

    const monthlyCap = k.budget_usd ?? k.monthly_budget_usd;
    if (monthlyCap != null && (k.month_spend_usd ?? 0) >= monthlyCap) {
      return logRefusal(ERR.BUDGET_EXHAUSTED, 'Monthly budget exhausted', 429);
    }
    if (settings.credits_enforced && (k.credit_balance_usd ?? 0) <= -(settings.overdraft_limit_usd ?? 0)) {
      return logRefusal(ERR.CREDITS_EXHAUSTED, 'Credit balance exhausted', 429);
    }

    // Rolling spend window
    if (settings.spend_window_limit_usd != null) {
      const since = new Date(Date.now() - (settings.spend_window_minutes ?? 60) * 60_000).toISOString();
      const { data: windowRows } = await supabase
        .from('request_logs').select('cost_usd').eq('api_key_id', keyId).gte('created_at', since);
      const windowSpend = (windowRows || []).reduce((s: number, r: any) => s + (r.cost_usd || 0), 0);
      if (windowSpend >= settings.spend_window_limit_usd) {
        return logRefusal(ERR.SPEND_WINDOW, 'Rolling spend window exceeded', 429);
      }
    }

    // Per-key rate limit
    const rpm = k.rpm_limit ?? settings.global_rpm_ceiling;
    if (rpm != null) {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await supabase
        .from('request_logs').select('id', { count: 'exact', head: true })
        .eq('api_key_id', keyId).gte('created_at', since);
      if ((count ?? 0) >= rpm) return logRefusal(ERR.RATE_LIMIT, 'Rate limit exceeded', 429);
    }

    // 5. Parse body, enforce allowlist and access tier.
    const body = await req.json();
    modelPublicId = body.model;
    if (!modelPublicId) return refuse('NO_ROUTE', 'Missing model field', 400);
    const isStream = body.stream === true;

    if (Array.isArray(k.allowed_model_ids) && k.allowed_model_ids.length > 0
        && !k.allowed_model_ids.includes(modelPublicId)) {
      return logRefusal(ERR.MODEL_NOT_ALLOWED, `Key is not permitted to use model "${modelPublicId}"`, 403);
    }

    // 6. Resolve candidate routes.
    const { data: routes, error: routeErr } = await supabase
      .from('models')
      .select('id, upstream_id, upstream_model_id, access_tier, timeout_ms, upstreams!inner(base_url, chat_path, auth_scheme, auth_header_name, extra_headers, timeout_ms, max_key_tries, rotate_on_timeout, is_active, priority)')
      .eq('public_id', modelPublicId)
      .eq('is_active', true)
      .eq('status', 'active')
      .eq('upstreams.is_active', true)
      .order('sort_order', { ascending: true });

    if (routeErr || !routes || routes.length === 0) {
      return logRefusal(ERR.NO_ROUTE, `Model "${modelPublicId}" not found`, 404);
    }

    if (routes.some((r: any) => r.access_tier === 'early_access') && k.profile_role !== 'early_access' && k.profile_role !== 'admin') {
      return logRefusal(ERR.TIER_REQUIRED, `Model "${modelPublicId}" requires early access`, 403);
    }

    // 7. Walk candidates; per-provider key walk. Two separate budgets.
    const maxHops = settings.failover_enabled === false ? 1 : (settings.max_failover_hops ?? 3);
    let lastError = 'All providers failed';
    let failovers = 0;

    for (let hop = 0; hop < routes.length && hop < maxHops; hop++) {
      const route = routes[hop] as any;
      const upstream = route.upstreams;
      upstreamId = route.upstream_id;

      const keyTries = upstream.max_key_tries ?? 2;
      const { data: uKeys } = await supabase
        .from('upstream_keys')
        .select('id, key_encrypted')
        .eq('upstream_id', route.upstream_id)
        .eq('is_active', true)
        .neq('status', 'failing')
        .or(`cooldown_until.is.null,cooldown_until.lt.${new Date().toISOString()}`)
        .order('consecutive_failures', { ascending: true })
        .order('timeout_count', { ascending: true })
        .limit(keyTries);

      if (!uKeys || uKeys.length === 0) continue;

      for (const uk of uKeys) {
        const secret = uk.key_encrypted;
        const upstreamUrl = buildUpstreamUrl(upstream, secret);
        const timeoutMs = route.timeout_ms ?? upstream.timeout_ms ?? settings.default_timeout_ms ?? 30000;
        const upstreamBody = { ...body, model: route.upstream_model_id };

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let timedOut = false;

        try {
          const upstreamRes = await fetch(upstreamUrl, {
            method: 'POST',
            headers: buildUpstreamHeaders(upstream, secret),
            body: JSON.stringify(upstreamBody),
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!upstreamRes.ok) {
            // Scrub the upstream error body: the most common accidental leak.
            const rawErr = await upstreamRes.text().catch(() => '');
            lastError = scrubText(`Upstream returned ${upstreamRes.status}: ${rawErr.slice(0, 300)}`);

            const updates: Record<string, unknown> = {
              consecutive_failures: (uk as any).consecutive_failures + 1 || 1,
              last_checked_at: new Date().toISOString(),
            };
            if (upstreamRes.status === 429) {
              updates.status = 'rate_limited';
              updates.cooldown_until = new Date(Date.now() + 60_000).toISOString();
            } else if (upstreamRes.status >= 500) {
              updates.cooldown_until = new Date(Date.now() + 60_000).toISOString();
            } else if (upstreamRes.status === 401 || upstreamRes.status === 403) {
              updates.status = 'expired';
            }
            await supabase.from('upstream_keys').update(updates).eq('id', uk.id);
            failovers++;
            continue;
          }

          // Success: reset failure counter.
          await supabase.from('upstream_keys')
            .update({ consecutive_failures: 0, status: 'working', last_checked_at: new Date().toISOString() })
            .eq('id', uk.id);

          const latencyMs = Date.now() - start;

          if (isStream) {
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            const encoder = new TextEncoder();
            const upstreamModelId = route.upstream_model_id;
            const escapedId = upstreamModelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            (async () => {
              const reader = upstreamRes.body!.getReader();
              const decoder = new TextDecoder();
              let inputTokens = 0, outputTokens = 0;
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  let text = decoder.decode(value, { stream: true });
                  text = text.replace(new RegExp(`"model"\\s*:\\s*"${escapedId}"`, 'g'), `"model": "${modelPublicId}"`);
                  text = scrubText(text);
                  await writer.write(encoder.encode(text));
                }
              } finally {
                writer.close();
                void logRequest({
                  api_key_id: keyId, profile_id: profileId, model_public_id: modelPublicId,
                  upstream_id: upstreamId, upstream_key_id: uk.id, ok: true,
                  status_code: upstreamRes.status, input_tokens: inputTokens,
                  output_tokens: outputTokens, latency_ms: latencyMs, client_ip: clientIp,
                  failover_count: failovers,
                });
              }
            })();

            return new Response(readable, {
              status: 200,
              headers: { ...CORS_HEADERS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
            });
          } else {
            const data = await upstreamRes.json();
            if (data.model) data.model = modelPublicId;
            const scrubbed = scrubObject(data);
            const inputTokens = data.usage?.prompt_tokens || 0;
            const outputTokens = data.usage?.completion_tokens || 0;

            void logRequest({
              api_key_id: keyId, profile_id: profileId, model_public_id: modelPublicId,
              upstream_id: upstreamId, upstream_key_id: uk.id, ok: true,
              status_code: upstreamRes.status, input_tokens: inputTokens,
              output_tokens: outputTokens, latency_ms: latencyMs, client_ip: clientIp,
              failover_count: failovers,
            });

            return jsonResponse(scrubbed);
          }
        } catch (e) {
          clearTimeout(timer);
          timedOut = (e as Error).name === 'AbortError';

          // Timeout is distinct from a bad key: record separately, brief cooldown.
          const updates: Record<string, unknown> = { last_checked_at: new Date().toISOString() };
          if (timedOut) {
            updates.timeout_count = ((uk as any).timeout_count ?? 0) + 1;
            if (upstream.rotate_on_timeout !== false) {
              updates.cooldown_until = new Date(Date.now() + 30_000).toISOString();
            }
          } else {
            updates.consecutive_failures = ((uk as any).consecutive_failures ?? 0) + 1;
          }
          await supabase.from('upstream_keys').update(updates).eq('id', uk.id);

          lastError = scrubText(timedOut ? 'Upstream timeout' : (e as Error).message);
          failovers++;
          continue;
        }
      }
    }

    void logRequest({
      api_key_id: keyId, profile_id: profileId, model_public_id: modelPublicId,
      upstream_id: upstreamId, ok: false, status_code: 502,
      error_code: ERR.UPSTREAM_FAILED, client_ip: clientIp, failover_count: failovers,
      latency_ms: Date.now() - start,
    });
    return refuse('UPSTREAM_FAILED', lastError, 502);
  } catch (e) {
    if (keyId) {
      void logRequest({
        api_key_id: keyId, profile_id: profileId, model_public_id: modelPublicId,
        upstream_id: upstreamId, ok: false, status_code: 500,
        error_code: 'internal_error', client_ip: resolveClientIp(req),
        latency_ms: Date.now() - start,
      });
    }
    return refuse('UPSTREAM_FAILED', 'Internal server error', 500);
  }
});
