const PROVIDER_PATTERNS: Array<[RegExp, string]> = [
  [/openai/gi, '[REDACTED]'],
  [/anthropic/gi, '[REDACTED]'],
  [/google/gi, '[REDACTED]'],
  [/mistral/gi, '[REDACTED]'],
  [/cohere/gi, '[REDACTED]'],
  [/deepseek/gi, '[REDACTED]'],
  [/groq/gi, '[REDACTED]'],
  [/together/gi, '[REDACTED]'],
  [/fireworks/gi, '[REDACTED]'],
  [/perplexity/gi, '[REDACTED]'],
];

export function scrubText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of PROVIDER_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function scrubObject(obj: unknown): unknown {
  if (typeof obj === 'string') return scrubText(obj);
  if (Array.isArray(obj)) return obj.map(scrubObject);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = scrubObject(v);
    }
    return out;
  }
  return obj;
}
