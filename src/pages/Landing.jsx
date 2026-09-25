import { Link } from '@/lib/router'

export function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center md:py-36">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950/50 to-canvas" />
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
          Multi-Provider LLM API Gateway
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-6xl">
          One key.<br />Every model.<br />Zero leaks.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Point any OpenAI-compatible SDK at Vanguard and access dozens of upstream
          providers through a single <code className="rounded bg-surface-raised px-1.5 py-0.5 text-sm text-primary">vg_live_</code> key.
          The caller never sees who served it.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/sign-up" className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            Get your API key
          </Link>
          <Link to="/docs" className="rounded-xl border border-border bg-surface px-6 py-3 font-medium text-foreground hover:bg-surface-raised transition-colors">
            Read the docs
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-foreground md:text-3xl">Built for security and speed</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { title: 'Provider Isolation', desc: 'Every response is scrubbed. Upstream host, model ID, and provider keys never leak to the caller.' },
              { title: 'Smart Routing', desc: 'Automatic failover across providers and keys. Timeouts get cooldowns, healthy keys get priority.' },
              { title: 'Usage & Billing', desc: 'Per-key budgets, rate limits, credit balances, and detailed request logs — all from the dashboard.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-surface p-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-surface px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-12 text-2xl font-bold text-foreground md:text-3xl">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '1', title: 'Get a key', desc: 'Sign up and generate a vg_live_ API key from your dashboard.' },
              { step: '2', title: 'Make a request', desc: 'Use any OpenAI-compatible SDK. Ask for a public model name like vanguard-4-mini.' },
              { step: '3', title: 'We route it', desc: 'Vanguard picks the best provider, forwards the call, scrubs the response, and logs usage.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-foreground md:text-3xl">Ready to start?</h2>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          Sign up free. Pay only for what you use. No credit card required.
        </p>
        <Link to="/sign-up" className="mt-8 inline-block rounded-xl bg-primary px-8 py-3 font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          Create free account
        </Link>
      </section>
    </div>
  )
}
