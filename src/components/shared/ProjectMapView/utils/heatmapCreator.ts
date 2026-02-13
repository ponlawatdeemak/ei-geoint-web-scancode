import { layerIdConfig } from '@/components/common/map/config/map'
import maplibregl from 'maplibre-gl'
import useMapStore from '@/components/common/map/store/map'

// MapLibre heatmap configuration constants
const HEAT_MAX_ZOOM_LEVEL = 15
const HEAT_OPACITY_0_LEVEL = 14
const HEAT_OPACITY_1_LEVEL = 6

// Default heatmap paint configuration
const HEAT_PAINT = {
  'heatmap-weight': 1,
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(33,102,172,0)',
    0.2,
    'rgb(103,169,207)',
    0.4,
    'rgb(209,229,240)',
    0.6,
    'rgb(253,219,199)',
    0.8,
    'rgb(239,138,98)',
    1,
    'rgb(178,24,43)',
  ],
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
  'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], HEAT_OPACITY_1_LEVEL, 1, HEAT_OPACITY_0_LEVEL, 0],
}

/**
 * Creates or updates a MapLibre heatmap layer with the given configuration.
 * Registers a style-data handler to re-create the heatmap after basemap changes.
 *
 * @param map - MapLibre GL JS map instance
 * @param id - Unique identifier for the heatmap (will create `${id}-heat` layer and `${id}-src` source)
 * @param tileTemplate - Tile URL template for the heatmap data source
 * @param color - Optional hex color code (e.g., '#FF0000') for custom heatmap gradient
 * @returns cleanup function to unregister the handler
 *
 * @example
 * ```typescript
 * const cleanup = createHeatmap(map, 'weekly-heatmap-1', 'https://tiles.example.com/{z}/{x}/{y}', '#FF5733')
 * // later: cleanup()
 * ```
 */
export const createHeatmap = (map: maplibregl.Map, id: string, tileTemplate: string, color?: string): (() => void) => {
  const sourceId = `${id}-src`
  const layerId = `${id}-heat`

  // If layer exists, just update its paint / source tiles; avoid flicker
  const existingLayer = map.getLayer(layerId)
  const existingSource = map.getSource(sourceId) as maplibregl.VectorTileSource | undefined

  // Create custom heatmap paint using provided color or default
  const heatmapPaint = color
    ? {
        'heatmap-weight': 10,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          `${color}00`, // transparent at 0
          0.2,
          `${color}33`, // 20% opacity
          0.4,
          `${color}66`, // 40% opacity
          0.6,
          `${color}99`, // 60% opacity
          0.8,
          `${color}CC`, // 80% opacity
          1,
          `${color}FF`, // full opacity
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], HEAT_OPACITY_1_LEVEL, 1, HEAT_OPACITY_0_LEVEL, 0],
      }
    : HEAT_PAINT

  if (!existingSource) {
    map.addSource(sourceId, {
      type: 'vector',
      tiles: [tileTemplate],
      maxzoom: HEAT_MAX_ZOOM_LEVEL,
    })
  } else {
    // Update tiles template if changed
    const currentTiles = (existingSource.tiles ?? []) as string[]
    if (!currentTiles.includes(tileTemplate)) {
      // MapLibre doesn't support dynamic update of source tiles directly; recreate source
      try {
        removeHeatmap(map, id)
      } catch {}

      map.addSource(sourceId, {
        type: 'vector',
        tiles: [tileTemplate],
        maxzoom: HEAT_MAX_ZOOM_LEVEL,
      })
    }
  }

  if (!existingLayer || !map.getLayer(layerId)) {
    map.addLayer(
      {
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        'source-layer': 'default',
        maxzoom: HEAT_MAX_ZOOM_LEVEL,
        paint: heatmapPaint as any,
      },
      layerIdConfig.customReferer,
    )
  } else {
    // Update paint props
    Object.entries(heatmapPaint).forEach(([k, v]) => {
      try {
        map.setPaintProperty(layerId, k, v as any)
      } catch {}
    })
  }

  // Register style-data handler to re-create heatmap after basemap/style reload
  const handlerId = `heatmap-${id}`
  const register = useMapStore.getState().registerStyleDataHandler
  const unregister = useMapStore.getState().unregisterStyleDataHandler

  const handler = (m: maplibregl.Map) => {
    try {
      const src = m.getSource(sourceId)
      if (!src) {
        m.addSource(sourceId, {
          type: 'vector',
          tiles: [tileTemplate],
          maxzoom: HEAT_MAX_ZOOM_LEVEL,
        })
      }
      if (!m.getLayer(layerId)) {
        m.addLayer(
          {
            id: layerId,
            type: 'heatmap',
            source: sourceId,
            'source-layer': 'default',
            maxzoom: HEAT_MAX_ZOOM_LEVEL,
            paint: heatmapPaint as any,
          },
          layerIdConfig.customReferer,
        )
      }
    } catch (e) {
      console.error('heatmap style-data handler error', e)
    }
  }

  register(map, handlerId, handler)

  return () => {
    try {
      unregister(map, handlerId)
    } catch {
      // ignore
    }

    try {
      removeHeatmap(map, id)
    } catch {
      // ignore
    }
  }
}

/**
 * Removes a heatmap layer and its source from the map.
 *
 * @param map - MapLibre GL JS map instance
 * @param id - Unique identifier for the heatmap (matches the id used in createHeatmap)
 *
 * @example
 * ```typescript
 * removeHeatmap(map, 'weekly-heatmap-1')
 * ```
 */
export const removeHeatmap = (map: maplibregl.Map, id: string) => {
  const layerId = `${id}-heat`
  const sourceId = `${id}-src`

  try {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
  } catch {
    console.warn(`Failed to remove heatmap layer ${layerId}`)
  }

  try {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId)
    }
  } catch {
    console.warn(`Failed to remove heatmap source ${sourceId}`)
  }
}
