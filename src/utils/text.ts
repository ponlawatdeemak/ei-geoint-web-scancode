export function formatText(text?: any): string {
  return text || '-'
}

export function formatNumber(value: number | string, digit: number = 2) {
  return value !== '' && value !== null && typeof value !== 'undefined'
    ? value.toLocaleString(undefined, { maximumFractionDigits: digit, minimumFractionDigits: digit })
    : ''
}

export function formatPercent(confidence: number | string, digit: number = 2) {
  const raw = typeof confidence === 'number' ? confidence : 0
  const percent = raw <= 1 ? raw * 100 : raw
  // Round to 2 decimals
  const rounded = Math.round(percent * 100) / 100
  // If fractional part is zero (e.g. 75.00) show integer percent
  if (Number.isInteger(rounded)) {
    return `${rounded}%`
  }
  // Otherwise show two decimals
  return `${rounded.toFixed(digit)}%`
}

export function maskEmail(e?: string) {
  if (!e) return ''
  const parts = e.split('@')
  if (parts.length < 2) return e
  const local = parts[0]
  const domain = parts.slice(1).join('@')
  // If local-part is shorter than or equal to 2, mask all characters
  if (local.length <= 2) return `${'*'.repeat(local.length)}@${domain}`
  // Show first 2 characters, mask the rest with the same length
  return `${local.slice(0, 2)}${'*'.repeat(local.length - 2)}@${domain}`
}
