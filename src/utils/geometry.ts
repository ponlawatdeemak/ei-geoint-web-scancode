import type { Geometry } from 'geojson'
import { LngLatBoundsLike } from 'maplibre-gl'

/**
 * Extract flat [lng, lat] coordinate pairs from a GeoJSON Geometry.
 * Supports Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon and GeometryCollection.
 * Returns an array of coordinate pairs. May be empty if the geometry contains no coordinates.
 */
export function extractCoordsFromGeometry(geom: Geometry | null | undefined): [number, number][] {
  const out: [number, number][] = []
  if (!geom) return out

  // recursive walker that will collect coordinate pairs from nested arrays
  const walk = (c: unknown): void => {
    if (!Array.isArray(c)) return
    // coordinate pair
    if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
      out.push([c[0] as number, c[1] as number])
      return
    }
    for (const item of c) walk(item)
  }

  if (geom.type === 'GeometryCollection') {
    // GeometryCollection.geometries is an array of Geometry
    const gc = geom as Geometry & { geometries?: Geometry[] }
    if (Array.isArray(gc.geometries)) {
      for (const g of gc.geometries) {
        out.push(...extractCoordsFromGeometry(g))
      }
    }
    return out
  }

  // Other geometry types have a `coordinates` property
  const anyGeom = geom as unknown as { coordinates?: unknown }
  if (anyGeom.coordinates !== undefined) {
    walk(anyGeom.coordinates)
  }

  return out
}

/**
 * Compute the combined extent of an array of GeoJSON geometries.
 * Returns a tuple [minX, minY, maxX, maxY] or null if no valid coordinates were found.
 */
export function computeExtentFromGeometries(
  geoms: Array<Geometry | null | undefined>,
): [number, number, number, number] | null {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const g of geoms || []) {
    if (!g) continue
    const pts = extractCoordsFromGeometry(g)
    for (const [x, y] of pts) {
      if (typeof x !== 'number' || typeof y !== 'number') continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null
  }

  return [minX, minY, maxX, maxY]
}

export function zoomToGeometries(geometries: Geometry[], map: maplibregl.Map | null): { success: boolean } {
  if (!map) return { success: false }

  try {
    const extent = computeExtentFromGeometries(geometries)

    if (extent) {
      const [minX, minY, maxX, maxY] = extent
      if (typeof map?.fitBounds === 'function') {
        map.fitBounds(
          [
            [minX, minY],
            [maxX, maxY],
          ],
          { padding: 80, duration: 800 },
        )
      } else if (typeof map?.flyTo === 'function') {
        const center: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2]
        map.flyTo({ center, duration: 800 })
      }
    }

    return { success: true }
  } catch (error) {
    console.error('zoomToGeometries error:', error)
    return { success: false }
  }
}

export const thaiExtent: LngLatBoundsLike = [97.3758964376, 5.69138418215, 105.589038527, 20.4178496363]

export function zoomToThaiExtent(map: maplibregl.Map | null): void {
  if (!map) return

  try {
    if (typeof map?.fitBounds === 'function') {
      map.fitBounds(thaiExtent, { padding: 80, duration: 800 })
    }
  } catch (error) {
    console.error('zoomToThaiExtent error:', error)
    return
  }
}

export default { extractCoordsFromGeometry, computeExtentFromGeometries, zoomToGeometries, zoomToThaiExtent }
