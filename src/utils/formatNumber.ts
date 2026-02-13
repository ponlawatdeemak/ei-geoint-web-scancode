// Number formatting utility

export const LOCALE_STRING_OPTIONS = { maximumFractionDigits: 3, minimumFractionDigits: 0 }

export function formatNumber(num: number | string, options?: Intl.NumberFormatOptions) {
  const n = typeof num === 'string' ? Number(num) : num
  return n.toLocaleString(undefined, options)
}
