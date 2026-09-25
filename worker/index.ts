export default {
  async fetch(request: Request): Promise<Response> {
    const EDGE_URL = '{{SUPABASE_EDGE_URL}}';
    const EDGE_SECRET = '{{EDGE_SECRET}}';

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

    const url = new URL(request.url);
    if (url.pathname !== '/v1/chat/completions') {
      return new Response(JSON.stringify({ error: { code: 'not_found', message: 'Not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Cloudflare-to-Cloudflare subrequests overwrite cf-connecting-ip with
    // the Worker's own address, so copy the true visitor IP into our own header.
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0';

    const edgeUrl = `${EDGE_URL}/functions/v1/chat-completions`;

    const headers = new Headers(request.headers);
    headers.set('x-vg-client-ip', clientIp);
    headers.set('x-vg-edge-secret', EDGE_SECRET);
    headers.delete('host');

    const edgeRes = await fetch(edgeUrl, {
      method: request.method,
      headers,
      body: request.body,
    });

    // Stream the body through untouched. Scrubbing happens in the function,
    // not here, so streamed chunks stay scrubbed chunk-by-chunk.
    const responseHeaders = new Headers(edgeRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(edgeRes.body, {
      status: edgeRes.status,
      headers: responseHeaders,
    });
  },
};
