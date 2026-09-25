export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-vg-client-ip, x-vg-edge-secret',
} as const;

export function corsResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status: number) {
  return jsonResponse({ error: { message, type: 'api_error' } }, status);
}
