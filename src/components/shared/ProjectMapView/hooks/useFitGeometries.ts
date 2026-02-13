import { useEffect } from 'react'
import type { Geometry } from 'geojson'
import { computeExtentFromGeometries, zoomToGeometries } from '@/utils/geometry'
import type maplibregl from 'maplibre-gl'

type FitGeomOptions = {
  onExtent?: (extent: [number, number, number, number] | null) => void
}

export function useFitGeometries(
  mapId: string,
  mapLibre: Record<string, maplibregl.Map | null>,
  allLayers: { geometry?: Geometry }[],
  options?: FitGeomOptions,
) {
  const map = mapLibre[mapId]

  useEffect(() => {
    if (!map) return

    const geometries = allLayers.map((l) => l.geometry).filter(Boolean) as Geometry[]
    const extent = computeExtentFromGeometries(geometries)
    options?.onExtent?.(extent)
    zoomToGeometries(geometries, map)
  }, [allLayers, options, map])
}
