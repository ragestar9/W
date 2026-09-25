import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
let pass = 0;
let fail = 0;

function assert(name, condition) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.error(`  FAIL: ${name}`);
  }
}

// ── 1. File existence ────────────────────────────────────────
console.log('\n[1] File existence checks');
const required = [
  'index.html',
  'src/main.jsx',
  'src/App.jsx',
  'src/index.css',
  'src/lib/router.jsx',
  'src/lib/theme.js',
  'src/lib/supabase.js',
  'src/lib/firebase.js',
  'src/lib/scrub.js',
  'src/context/auth-context.jsx',
  'src/components/Navbar.jsx',
  'src/components/Footer.jsx',
  'src/components/States.jsx',
  'src/pages/Landing.jsx',
  'src/pages/Models.jsx',
  'src/pages/Pricing.jsx',
  'src/pages/Docs.jsx',
  'src/pages/Status.jsx',
  'src/pages/SignIn.jsx',
  'src/pages/SignUp.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/NotFound.jsx',
  'supabase/migrations/00001_initial_schema.sql',
  'supabase/functions/chat-completions/index.ts',
  'supabase/functions/_shared/cors.ts',
  'supabase/functions/_shared/scrub.ts',
  'worker/index.ts',
  'worker/wrangler.toml',
];

for (const f of required) {
  try {
    readFileSync(join(ROOT, f), 'utf8');
    assert(`exists: ${f}`, true);
  } catch {
    assert(`exists: ${f}`, false);
  }
}

// ── 2. index.html checks ────────────────────────────────────
console.log('\n[2] index.html');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
assert('has data-theme', html.includes('data-theme'));
assert('title contains Vanguard', html.toLowerCase().includes('vanguard'));
assert('loads main.jsx', html.includes('/src/main.jsx'));

// ── 3. CSS theme tokens ─────────────────────────────────────
console.log('\n[3] Theme tokens');
const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8');
const requiredTokens = ['--color-canvas', '--color-surface', '--color-foreground', '--color-primary', '--color-border', '--color-muted'];
for (const tok of requiredTokens) {
  assert(`CSS has ${tok}`, css.includes(tok));
}
assert('dark theme block', css.includes("data-theme='dark'") || css.includes('data-theme="dark"'));
assert('light theme block', css.includes("data-theme='light'") || css.includes('data-theme="light"'));

// ── 4. Router exports ───────────────────────────────────────
console.log('\n[4] Router');
const router = readFileSync(join(ROOT, 'src/lib/router.jsx'), 'utf8');
assert('exports useRoute', router.includes('export function useRoute'));
assert('exports navigate', router.includes('export function navigate'));
assert('exports Link', router.includes('export function Link'));
assert('uses useSyncExternalStore', router.includes('useSyncExternalStore'));

// ── 5. App routing table ────────────────────────────────────
console.log('\n[5] App routing');
const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');
const routePaths = ['/', '/models', '/pricing', '/docs', '/status', '/sign-in', '/sign-up', '/dashboard'];
for (const rp of routePaths) {
  assert(`route ${rp}`, app.includes(`'${rp}'`));
}
assert('uses NotFoundPage fallback', app.includes('NotFoundPage'));

// ── 6. Auth context ─────────────────────────────────────────
console.log('\n[6] Auth context');
const auth = readFileSync(join(ROOT, 'src/context/auth-context.jsx'), 'utf8');
assert('has AuthProvider', auth.includes('export function AuthProvider'));
assert('has useAuth', auth.includes('export function useAuth'));
assert('has signIn', auth.includes('signIn'));
assert('has signUp', auth.includes('signUp'));
assert('has signInWithGoogle', auth.includes('signInWithGoogle'));
assert('has signOut', auth.includes('signOut'));
assert('has isAdmin', auth.includes('isAdmin'));

// ── 7. SQL schema ───────────────────────────────────────────
console.log('\n[7] SQL schema');
const sql = readFileSync(join(ROOT, 'supabase/migrations/00001_initial_schema.sql'), 'utf8');
const tables = ['profiles', 'api_keys', 'upstreams', 'upstream_keys', 'models', 'request_logs', 'app_settings'];
for (const t of tables) {
  assert(`table ${t}`, sql.includes(`create table if not exists public.${t}`));
}
assert('public_models view', sql.includes('create or replace view public.public_models'));
assert('authenticate_key RPC', sql.includes('authenticate_key'));
assert('RLS enabled', (sql.match(/enable row level security/g) || []).length >= 7);

// ── 8. Edge function ────────────────────────────────────────
console.log('\n[8] Edge function');
const edge = readFileSync(join(ROOT, 'supabase/functions/chat-completions/index.ts'), 'utf8');
assert('imports scrub', edge.includes('scrubObject') && edge.includes('scrubText'));
assert('resolves client IP', edge.includes('x-vg-client-ip'));
assert('calls authenticate_key RPC', edge.includes('authenticate_key'));
assert('handles streaming', edge.includes('text/event-stream'));
assert('rewrites model id', edge.includes('modelPublicId'));

// ── 9. Cloudflare worker ────────────────────────────────────
console.log('\n[9] Worker');
const worker = readFileSync(join(ROOT, 'worker/index.ts'), 'utf8');
assert('forwards x-vg-client-ip', worker.includes('x-vg-client-ip'));
assert('forwards x-vg-edge-secret', worker.includes('x-vg-edge-secret'));
assert('proxies to edge function', worker.includes('/functions/v1/chat-completions'));

// ── 10. Scrub shared helper ─────────────────────────────────
console.log('\n[10] Scrub helper');
const scrub = readFileSync(join(ROOT, 'supabase/functions/_shared/scrub.ts'), 'utf8');
assert('scrubs openai', scrub.toLowerCase().includes('openai'));
assert('scrubs anthropic', scrub.toLowerCase().includes('anthropic'));
assert('exports scrubText', scrub.includes('export function scrubText'));
assert('exports scrubObject', scrub.includes('export function scrubObject'));

// ── Summary ─────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`  PASS: ${pass}   FAIL: ${fail}`);
console.log(`========================================\n`);
process.exit(fail > 0 ? 1 : 0);
