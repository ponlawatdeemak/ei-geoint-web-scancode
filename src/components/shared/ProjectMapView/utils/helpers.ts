import { GetModelAllDtoOut, Language } from '@interfaces/index'
import { getHierarchicalNames } from '@/utils/transformData'

// extract href(s) from an asset which may be an object or an array
export function getAssetHref(asset: unknown): string | string[] {
  if (Array.isArray(asset)) {
    return asset.map((a) => {
      if (a && typeof a === 'object' && 'href' in (a as Record<string, unknown>)) {
        const href = (a as Record<string, unknown>).href
        return typeof href === 'string' ? href : ''
      }
      return ''
    })
  }
  if (asset && typeof asset === 'object' && 'href' in (asset as Record<string, unknown>)) {
    const href = (asset as Record<string, unknown>).href
    return typeof href === 'string' ? href : ''
  }
  return ''
}

// extract the first [lon, lat] pair from a geometry-like object/structure
export function extractCoordinatesFromObject(object: unknown): [number, number] | undefined {
  if (!object || typeof object !== 'object') return undefined

  const obj = object as Record<string, unknown>
  const feature = obj.feature as Record<string, unknown> | undefined
  const geom = (obj.geometry as unknown) ?? (feature && (feature.geometry as unknown)) ?? obj

  const isValidCoordPair = (arr: unknown[]): arr is [number, number] => {
    return Array.isArray(arr) && arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number'
  }

  const searchArray = (arr: unknown[], finder: (x: unknown) => [number, number] | undefined) => {
    for (const el of arr) {
      const res = finder(el)
      if (res) return res
    }
    return undefined
  }

  const extractFromGeometry = (x: unknown, finder: (x: unknown) => [number, number] | undefined) => {
    if (x && typeof x === 'object') {
      const rx = x as Record<string, unknown>
      if ('coordinates' in rx) return finder(rx.coordinates)
      if ('geometry' in rx) return finder(rx.geometry)
    }
    return undefined
  }

  const findFirstPair = (x: unknown): [number, number] | undefined => {
    if (!x) return undefined
    if (Array.isArray(x)) {
      if (isValidCoordPair(x as unknown[])) return [x[0] as number, x[1] as number]
      return searchArray(x as unknown[], findFirstPair)
    } else if (typeof x === 'object') {
      return extractFromGeometry(x, findFirstPair)
    }
    return undefined
  }

  return findFirstPair(geom)
}

// accept either a Feature-like object ({ properties }) or a plain properties object
export function extractPropertiesFromObject(object: unknown): Record<string, unknown> {
  const maybeProps =
    object && typeof object === 'object' && 'properties' in (object as Record<string, unknown>)
      ? (object as { properties?: Record<string, unknown> }).properties
      : (object as Record<string, unknown>)
  return (maybeProps ?? {}) as Record<string, unknown>
}

// Build display model name using modelAll and language
export function buildDisplayModelName(
  data: Record<string, unknown>,
  modelAll: GetModelAllDtoOut[] | undefined,
  language: string,
): string {
  const hierarchicalNames = getHierarchicalNames(modelAll || [], (data.predicted_type as string) || '')
  if (!hierarchicalNames) return ''
  return language === Language.TH ? hierarchicalNames.name.join(' - ') : hierarchicalNames.nameEn.join(' - ')
}

export function extractConfidenceNum(data: Record<string, unknown>): number | undefined {
  const rawValue = data.confidence ?? data.confidence_mean ?? data.condidence
  if (typeof rawValue === 'undefined') return rawValue
  if (typeof rawValue === 'number') return rawValue
  if (typeof rawValue === 'string') {
    const p = Number.parseFloat(rawValue)
    return Number.isNaN(p) ? 0 : p
  }
  return 0
}

export type FeatureLike = { properties?: Record<string, unknown> }
