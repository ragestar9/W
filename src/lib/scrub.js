export function scrub(text, replacements = {}) {
  if (typeof text !== 'string') return text
  let result = text
  for (const [secret, replacement] of Object.entries(replacements)) {
    if (secret && result.includes(secret)) {
      result = result.replaceAll(secret, replacement || '[REDACTED]')
    }
  }
  return result
}
