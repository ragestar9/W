export function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Documentation</h1>
      <p className="mb-8 text-muted">Everything you need to integrate with Vanguard.</p>

      <div className="flex flex-col gap-8">
        <Section title="Quick Start">
          <p>1. Sign up and create an API key from your dashboard.</p>
          <p>2. Point any OpenAI-compatible SDK at the Vanguard base URL.</p>
          <p>3. Use a public model name (e.g. <Code>vanguard-4-mini</Code>).</p>
          <CodeBlock>{`curl https://your-gateway.example.com/v1/chat/completions \\
  -H "Authorization: Bearer vg_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "vanguard-4-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</CodeBlock>
        </Section>

        <Section title="Authentication">
          <p>All requests must include an <Code>Authorization: Bearer vg_live_...</Code> header.</p>
          <p>Keys are hashed server-side. The plaintext is shown once at creation and cannot be recovered.</p>
        </Section>

        <Section title="Models">
          <p>Check the <a href="#/models" className="text-primary hover:underline">Models</a> page for available public model names.</p>
          <p>Vanguard maps each public name to one or more upstream providers. The caller never sees the real model ID or provider.</p>
        </Section>

        <Section title="Rate Limits & Budgets">
          <p>Each API key can have per-minute rate limits and monthly budget caps set by an admin.</p>
          <p>When a limit is hit, the gateway returns HTTP 429 with a <Code>Retry-After</Code> header.</p>
        </Section>

        <Section title="Streaming">
          <p>SSE streaming is supported. Set <Code>"stream": true</Code> in your request body.</p>
          <p>All streamed chunks have the model field rewritten to the public model name.</p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  )
}

function Code({ children }) {
  return <code className="rounded bg-surface-raised px-1.5 py-0.5 text-xs text-primary">{children}</code>
}

function CodeBlock({ children }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 text-xs text-foreground">
      <code>{children}</code>
    </pre>
  )
}
