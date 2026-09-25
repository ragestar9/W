# Vanguard Gateway

Multi-provider LLM API gateway. One key, every model, zero leaks.

## Stack

- **Frontend**: Vite + React 19 (plain JSX), Tailwind CSS v4, hash-based routing
- **Backend**: Supabase (Postgres + RLS + Edge Functions in TypeScript)
- **CDN/Proxy**: Cloudflare Worker
- **Auth**: Firebase (email/password + Google), bridged into Supabase

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Firebase](https://console.firebase.google.com) project with Authentication enabled
- (Optional) A [Cloudflare](https://dash.cloudflare.com) account for the Worker

### 2. Clone and install

```bash
git clone https://github.com/Hadionlineclas/vanguard-gateway.git
cd vanguard-gateway
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in the values:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard > Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard > Settings > API > `anon` `public` key |
| `VITE_FIREBASE_*` | Firebase console > Project settings > General > Your apps > Web app config |

### 4. Set up Supabase database

1. Go to the Supabase SQL Editor
2. Paste the contents of `supabase/migrations/00001_initial_schema.sql`
3. Run it

This creates all tables (profiles, api_keys, upstreams, upstream_keys, models, request_logs, app_settings), the `public_models` view, RLS policies, and the `authenticate_key` RPC.

### 5. Set up Firebase Authentication

1. In Firebase Console > Authentication > Sign-in method
2. Enable **Email/Password**
3. Enable **Google** sign-in
4. Add your domain to Authorized domains

### 6. Deploy the Edge Function (optional)

```bash
npx supabase functions deploy chat-completions
```

Set secrets in Supabase dashboard:
- `EDGE_SECRET` — a random string shared with the Worker
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings > API

### 7. Deploy the Cloudflare Worker (optional)

```bash
cd worker
# Edit wrangler.toml: replace {{SUPABASE_EDGE_URL}} and {{EDGE_SECRET}}
npx wrangler deploy
```

### 8. Run the frontend

```bash
npm run dev
```

Open http://localhost:5173

## Project Structure

```
src/
  main.jsx              # Entry point — theme init, AuthProvider
  App.jsx               # Hash router + page shell
  index.css             # Tailwind + OKLCH Indigo theme tokens
  lib/
    router.jsx          # Hash router (useSyncExternalStore)
    theme.js            # Dark/light theme manager
    supabase.js         # Supabase client
    firebase.js         # Firebase client
    scrub.js            # Provider-name scrubber
  context/
    auth-context.jsx    # Firebase auth + Supabase profile bridge
  components/
    Navbar.jsx          # Nav bar with theme toggle
    Footer.jsx          # Footer
    States.jsx          # Loading, Error, Empty states
  pages/
    Landing.jsx         # Public landing page
    Models.jsx          # Public model catalog (from public_models view)
    Pricing.jsx         # Pricing tiers
    Docs.jsx            # API documentation
    Status.jsx          # System health check
    SignIn.jsx          # Sign in form
    SignUp.jsx          # Sign up form
    Dashboard.jsx       # Authenticated dashboard
    NotFound.jsx        # 404 page
supabase/
  migrations/           # SQL schema
  functions/
    chat-completions/   # Edge Function — the LLM router
    _shared/            # Shared helpers (CORS, scrub)
worker/
  index.ts              # Cloudflare Worker proxy
  wrangler.toml         # Worker config
tests/
  smoke.mjs             # Smoke tests (plain Node, no framework)
```

## Running Tests

```bash
node tests/smoke.mjs
```

## For Gemini 3.8 (Google AI Studio)

To install and run this project:

1. Clone the repo: `git clone https://github.com/Hadionlineclas/vanguard-gateway.git`
2. `cd vanguard-gateway`
3. `npm install`
4. Copy `.env.example` to `.env` and fill in your Supabase and Firebase credentials
5. Run the SQL migration in your Supabase SQL editor
6. `npm run dev` to start the dev server
7. Open http://localhost:5173 in a browser

The frontend runs entirely client-side. The Supabase Edge Function and Cloudflare Worker are only needed when you want the API routing to work.
