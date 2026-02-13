export function convertArea(areaSqm: number, unit: string): number {
  switch (unit) {
    case 'sqm':
      return areaSqm
    case 'sqkm':
      return areaSqm / 1e6
    case 'hectare':
      return areaSqm / 10000
    case 'rai':
      return areaSqm / 1600
    case 'acre':
      return areaSqm / 4046.85642
    case 'sqmile':
      return areaSqm / 2_589_988.110336
    case 'sqnauticmile':
      return areaSqm / 3_429_904
    default:
      return areaSqm
  }
}

export function convertLength(m: number, unit: string): number {
  switch (unit) {
    case 'meter':
      return m
    case 'km':
      return m / 1000
    case 'foot':
      return m / 0.3048
    case 'yard':
      return m / 0.9144
    case 'mile':
      return m / 1609.344
    case 'nauticmile':
      return m / 1852
    default:
      return m
  }
}

/**
 * Convert bytes to TB
 * @param bytes - size in bytes
 * @param decimals - number of decimal places (default: 2)
 * @returns size in TB
 */
export function bytesToTB(bytes: number, decimals = 2): number {
  if (bytes === 0) return 0
  const tb = bytes / 1024 ** 4
  return Number(tb.toFixed(decimals))
}
