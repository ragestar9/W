export function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: ['100 requests / day', '3 models', 'Community support', 'Shared rate limits'],
      cta: 'Get started',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/ month',
      features: ['Unlimited requests', 'All models', 'Priority support', 'Custom rate limits', 'Usage analytics'],
      cta: 'Start free trial',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: ['Dedicated infrastructure', 'SLA guarantee', 'SSO / SAML', 'Audit logs', 'Custom models'],
      cta: 'Contact us',
      highlight: false,
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-center text-3xl font-bold text-foreground">Pricing</h1>
      <p className="mb-12 text-center text-muted">Simple, transparent pricing. No surprises.</p>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-2xl border p-6 ${
              p.highlight ? 'border-primary bg-surface shadow-lg shadow-primary/10' : 'border-border bg-surface'
            }`}
          >
            <h2 className="text-lg font-semibold text-foreground">{p.name}</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{p.price}</span>
              {p.period && <span className="text-sm text-muted">{p.period}</span>}
            </div>
            <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm text-muted">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">&#10003;</span>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#/sign-up"
              className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
                p.highlight
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-surface-raised text-foreground'
              }`}
            >
              {p.cta}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
