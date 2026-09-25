export default {
  async fetch(request: Request): Promise<Response> {
    const EDGE_URL = '{{SUPABASE_EDGE_URL}}';
    const EDGE_SECRET = '{{EDGE_SECRET}}';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    // Only proxy /v1/chat/completions
    const url = new URL(request.url);
    if (url.pathname !== '/v1/chat/completions') {
      return new Response(JSON.stringify({ error: { message: 'Not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Resolve true client IP
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0';

    // Forward to Supabase Edge Function
    const edgeUrl = `${EDGE_URL}/functions/v1/chat-completions`;

    const headers = new Headers(request.headers);
    headers.set('x-vg-client-ip', clientIp);
    headers.set('x-vg-edge-secret', EDGE_SECRET);
    // Remove host header so Supabase accepts it
    headers.delete('host');

    const edgeRes = await fetch(edgeUrl, {
      method: request.method,
      headers,
      body: request.body,
    });

    // Stream through
    const responseHeaders = new Headers(edgeRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(edgeRes.body, {
      status: edgeRes.status,
      headers: responseHeaders,
    });
  },
};
