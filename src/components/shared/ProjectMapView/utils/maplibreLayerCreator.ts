import maplibregl from 'maplibre-gl'
import { renderToStaticMarkup } from 'react-dom/server'
import { bluePinIcon } from '@/icons'
import {
  LayerConfig,
  MapType,
  TileLayerConfig,
  VectorLayerConfig,
  GeoJsonLayerConfig,
  ItvLayerConfig,
  SARChangeDetectionKey,
  SARBattleDamageKey,
  ItvTileLayerConfig,
  ItvVectorLayerConfig,
  ItvAnnotationLayerConfig,
  ItvDrawType,
} from '@interfaces/index'
import { hexToRGBAArray, getColorByModelId } from '@/utils/color'
import { DefaultAoiColor } from '@interfaces/config/color.config'
import { cropCanvasImage } from '@/utils/crop-image'
import type { FeatureLike } from './helpers'
import { layerIdConfig } from '@/components/common/map/config/map'
import useMapStore from '@/components/common/map/store/map'
import ms from 'milsymbol'
import { AnnotationLabelItem } from '@interfaces/entities'
import { rgbaArrayToCss } from './utils'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'

export interface MapLibreLayerDeps {
  thresholds?: Record<string, [number, number]>
  layerVisibility?: Record<string, boolean>
  getFeatureConfidence?: (feature: FeatureLike | null) => number
  getClickInfo?: (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => void
  map: maplibregl.Map
}

export interface CreatedMapLibreLayers {
  sourceIds: string[]
  layerIds: string[]
  cleanup: () => void
}

// SVG pin icon (blue)
const pinSvg = `<svg width="21" height="29" viewBox="0 0 21 29" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.333 0.5C15.769 0.5 20.1668 4.89702 20.167 10.333C20.167 12.7528 19.4703 15.0176 18.1973 17.0518L18.1963 17.0508C17.5474 18.1089 16.7997 19.0853 16.0674 20.0352C15.4214 20.8731 14.7893 21.6906 14.2227 22.5488L13.9834 22.9189C13.5277 23.6462 13.1731 24.3384 12.8164 25.0938L12.4551 25.874C12.3775 26.0447 12.3088 26.2331 12.2109 26.4756C12.1191 26.7031 12.0081 26.9591 11.8662 27.1973C11.5803 27.6771 11.1123 28.167 10.333 28.167C9.55417 28.1669 9.08691 27.6776 8.7998 27.1992C8.65735 26.9618 8.54552 26.706 8.45215 26.4795C8.35292 26.2388 8.28066 26.048 8.20117 25.8799L8.19629 25.8701C7.72064 24.7999 7.2786 23.8903 6.66992 22.9189L6.66895 22.918C6.04441 21.9161 5.32372 20.9823 4.58594 20.0254C3.85324 19.075 3.10328 18.1012 2.4541 17.0488V17.0479C1.1962 15.0152 0.5 12.752 0.5 10.333C0.500175 4.89712 4.89712 0.500175 10.333 0.5ZM10.333 7.83301C8.7693 7.83318 7.5 9.10324 7.5 10.667C7.50018 12.2306 8.76941 13.4998 10.333 13.5C11.8968 13.5 13.1668 12.2307 13.167 10.667C13.167 9.10313 11.8969 7.83301 10.333 7.83301Z" fill="#0B76C8" stroke="white"/></svg>`

const getPinSvgPhoto = () => renderToStaticMarkup(bluePinIcon({ xmlns: 'http://www.w3.org/2000/svg' }))
// Safe image add helper: avoid duplicate-image errors when multiple components try to add the same icon
const safeAddImage = (m: maplibregl.Map, name: string, img: HTMLImageElement | ImageBitmap, options?: any) => {
  try {
    if (!m.hasImage(name)) {
      m.addImage(name, img as any, options)
    }
  } catch (e) {
    // Ignore duplicate-image error (race condition / concurrent adds can throw)
    try {
      const msg = String(e)
      if (!/already exists/i.test(msg)) {
        // only warn for unexpected errors
        // eslint-disable-next-line no-console
        console.warn('addImage failed for', name, e)
      }
    } catch (_) {}
  }
}

const buildCleanup = (
  map: maplibregl.Map,
  createdLayers: string[],
  createdSources: string[],
  removeHandlers: Array<() => void>,
): (() => void) => {
  return () => {
    for (const fn of removeHandlers) fn()
    for (const lid of createdLayers) {
      if (map.getLayer(lid)) map.removeLayer(lid)
    }
    for (const sid of createdSources) {
      if (map.getSource(sid)) map.removeSource(sid)
    }
  }
}

const createTileLayers = (
  cfg: TileLayerConfig,
  map: maplibregl.Map,
  visible: boolean,
): CreatedMapLibreLayers | null => {
  // Fix from thaicom: append band and colormap params to tile URLs
  let data = cfg.template ?? cfg.data ?? cfg.tiles
  if (data) {
    const appendBand = (url: string) => {
      try {
        const [base, search] = url.split('?')
        const params = new URLSearchParams(search)
        const currentBands =
          cfg.bands && cfg.bands.length > 0 ? cfg.bands.map((b) => b.toString()) : params.getAll('bidx')

        const currentColormap = cfg.colormapName ?? params.get('colormap_name')

        params.delete('bidx')
        params.delete('colormap_name')
        currentBands.forEach((b) => {
          params.append('bidx', b)
        })
        if (currentColormap) {
          params.append('colormap_name', currentColormap)
        }
        return `${base}?${params.toString()}`
      } catch (e) {
        return url
      }
    }
    if (Array.isArray(data)) {
      data = data.map(appendBand)
    } else {
      data = appendBand(data)
    }
  }

  if (!data) return null

  const createdSources: string[] = []
  const createdLayers: string[] = []
  const removeHandlers: Array<() => void> = []
  const sourceId = `${cfg.id}-source`

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'raster',
      tiles: Array.isArray(data) ? data : [data],
      tileSize: 256,
      minzoom: 10,
    })
    createdSources.push(sourceId)
  }

  const layerId = cfg.id
  if (!map.getLayer(layerId)) {
    map.addLayer(
      {
        id: layerId,
        type: 'raster',
        source: sourceId,
        layout: { visibility: visible ? 'visible' : 'none' },
        paint: { 'raster-opacity': 1 },
        minzoom: 10,
      },
      layerIdConfig.customReferer,
    )
    createdLayers.push(layerId)
  } else {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
    // even if the layer already existed, record it so callers can update visibility
    createdLayers.push(layerId)
  }

  // register style-data handler to re-create source/layer if style reload removed them
  try {
    const handlerId = `layer-reg-${cfg.id}`
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handler = (m: maplibregl.Map) => {
      try {
        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, {
            type: 'raster',
            tiles: Array.isArray(data) ? data : [data],
            tileSize: 256,
            minzoom: 10,
          })
        }
        if (!m.getLayer(layerId)) {
          m.addLayer(
            {
              id: layerId,
              type: 'raster',
              source: sourceId,
              layout: { visibility: 'visible' },
              paint: { 'raster-opacity': 1 },
              minzoom: 10,
            },
            layerIdConfig.customReferer,
          )
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('tile layer style-data handler error', e)
      }
    }
    // Unregister existing handler before registering new one to avoid duplicates
    try {
      unregister(map, handlerId)
    } catch {}
    register(map, handlerId, handler)
    removeHandlers.push(() => unregister(map, handlerId))
  } catch {}

  return {
    sourceIds: createdSources,
    layerIds: createdLayers,
    cleanup: buildCleanup(map, createdLayers, createdSources, removeHandlers),
  }
}

const createSARPointLayer = (
  map: maplibregl.Map,
  cfg: VectorLayerConfig,
  id: string,
  sourceId: string,
  filter: maplibregl.ExpressionSpecification,
  visible: boolean,
  fillColor: string,
  strokeColor: string,
  getClickInfo?: (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => void,
): { layerId: string; handler?: () => void } => {
  const pointLayerId = `${id}-point`
  if (!map.getLayer(pointLayerId)) {
    map.addLayer(
      {
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        'source-layer': 'default',
        minzoom: 10,
        filter,
        layout: { visibility: visible ? 'visible' : 'none' },
        paint: {
          'circle-color': [
            'match',
            ['get', 'damage_level'], 
            1, '#ffebee',
            2, '#ffcdd2',      
            3, '#ef9a9a',       
            4, '#e57373',        
            5, '#ef5350',
            fillColor 
          ],
          'circle-stroke-color': [
            'match',
            ['get', 'damage_level'], 
            1, '#ffebee',
            2, '#ffcdd2',      
            3, '#ef9a9a',       
            4, '#e57373',        
            5, '#ef5350',
            strokeColor 
          ],
          'circle-radius': 5,
          'circle-stroke-width': 1,
          'circle-opacity': 0.8,
        },
      },
      layerIdConfig.customReferer,
    )
  } else {
    // map.setFilter(pointLayerId, filter)
  }

  let handler: (() => void) | undefined
  if (getClickInfo) {
    const clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      const props = feature ? { ...(feature.properties as Record<string, unknown>), type: cfg.type } : null
      const lngLat: [number, number] | undefined = e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : undefined
      getClickInfo(lngLat, props)
    }
    map.on('click', pointLayerId, clickHandler)
    handler = () => map.off('click', pointLayerId, clickHandler)
  }

  return { layerId: pointLayerId, handler }
}

const createSarPolygonLayers = (
  map: maplibregl.Map,
  cfg: VectorLayerConfig,
  id: string,
  sourceId: string,
  filter: maplibregl.ExpressionSpecification,
  visible: boolean,
  fillColor: string,
  strokeColor: string,
  getClickInfo?: (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => void,
): { layerIds: string[]; handler?: () => void } => {
  const fillLayerId = `${id}-fill`
  if (!map.getLayer(fillLayerId)) {
    map.addLayer(
      {
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        'source-layer': 'default',
        minzoom: 10,
        filter,
        layout: { visibility: visible ? 'visible' : 'none' },
        paint: {
          'fill-color': [
            'match',
            ['get', 'damage_level'], 
            1, '#f44336',      
            2, '#e53935',       
            3, '#d32f2f',        
            4, '#c62828',
            5, '#b71c1c',
            fillColor 
          ],
          'fill-outline-color': [
            'match',
            ['get', 'damage_level'], 
            1, '#f44336',      
            2, '#e53935',       
            3, '#d32f2f',        
            4, '#c62828',
            5, '#b71c1c',
            strokeColor 
          ],
          'fill-opacity': 0.8,
        },
      },
      layerIdConfig.customReferer,
    )
  } else {
    // map.setFilter(fillLayerId, filter)
  }

  const lineLayerId = `${id}-line`
  if (!map.getLayer(lineLayerId)) {
    map.addLayer(
      {
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        'source-layer': 'default',
        minzoom: 10,
        filter,
        layout: { visibility: visible ? 'visible' : 'none' },
        paint: {
          'line-color': [
            'match',
            ['get', 'damage_level'], 
            1, '#f44336',      
            2, '#e53935',       
            3, '#d32f2f',        
            4, '#c62828',
            5, '#b71c1c',
            strokeColor 
          ],
          'line-width': 1.2,
        },
      },
      layerIdConfig.customReferer,
    )
  } else {
    // map.setFilter(lineLayerId, filter)
  }

  let handler: (() => void) | undefined
  if (getClickInfo) {
    const clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      const props = feature ? { ...(feature.properties as Record<string, unknown>), type: cfg.type } : null
      const lngLat: [number, number] | undefined = e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : undefined
      getClickInfo(lngLat, props)
    }
    map.on('click', fillLayerId, clickHandler)
    map.on('click', lineLayerId, clickHandler)
    handler = () => {
      map.off('click', fillLayerId, clickHandler)
      map.off('click', lineLayerId, clickHandler)
    }
  }

  return { layerIds: [fillLayerId, lineLayerId], handler }
}

const createRegularVectorLayers = (
  map: maplibregl.Map,
  cfg: VectorLayerConfig,
  id: string,
  sourceId: string,
  filter: maplibregl.ExpressionSpecification,
  visible: boolean,
  fillColor: string,
  strokeColor: string,
  getClickInfo?: (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => void,
): { layerIds: string[]; handler?: () => void } => {
  const addLayerIfMissing = (layer: maplibregl.LayerSpecification) => {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer, layerIdConfig.customReferer)
    }
  }

  const fillLayerId = `${id}-fill`
  addLayerIfMissing({
    id: fillLayerId,
    type: 'fill',
    source: sourceId,
    'source-layer': 'default',
    minzoom: 10,
    filter,
    layout: { visibility: visible ? 'visible' : 'none' },
    paint: {
      'fill-color': fillColor,
      'fill-opacity': 0.6,
      'fill-outline-color': strokeColor,
    },
  })

  const lineLayerId = `${id}-line`
  addLayerIfMissing({
    id: lineLayerId,
    type: 'line',
    source: sourceId,
    'source-layer': 'default',
    minzoom: 10,
    filter,
    layout: { visibility: visible ? 'visible' : 'none' },
    paint: {
      'line-color': strokeColor,
      'line-width': 1.2,
    },
  })

  let handler: (() => void) | undefined
  if (getClickInfo) {
    const clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      const props = feature ? { ...(feature.properties as Record<string, unknown>), type: cfg.type } : null
      const lngLat: [number, number] | undefined = e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : undefined
      getClickInfo(lngLat, props)
    }
    map.on('click', fillLayerId, clickHandler)
    map.on('click', lineLayerId, clickHandler)
    handler = () => {
      map.off('click', fillLayerId, clickHandler)
      map.off('click', lineLayerId, clickHandler)
    }
  }

  return { layerIds: [fillLayerId, lineLayerId], handler }
}

const createGeoJsonLayers = (
  cfg: GeoJsonLayerConfig | ItvLayerConfig,
  map: maplibregl.Map,
  visible: boolean,
  getClickInfo?: (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => void,
): CreatedMapLibreLayers | null => {
  const { id, data, color_code, type } = cfg
  if (!data) return null

  const createdSources: string[] = []
  const createdLayers: string[] = []
  const sourceId = `${id}-source`

  let parsedData: GeoJSON.FeatureCollection
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data)
    } catch (e) {
      console.error(`Failed to parse GeoJSON data for layer ${id}:`, e)
      return null
    }
  } else {
    parsedData = data as GeoJSON.FeatureCollection
  }

  if (!parsedData) return null

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: parsedData as any,
    })
    createdSources.push(sourceId)
  }

  const fillColorArr = color_code ? hexToRGBAArray(color_code, false) : hexToRGBAArray(DefaultAoiColor, false)
  const strokeColorArr = color_code ? hexToRGBAArray(color_code) : hexToRGBAArray(DefaultAoiColor)
  const fillColor = rgbaArrayToCss(fillColorArr, `rgba(${DefaultAoiColor}aa)`)
  const strokeColor = rgbaArrayToCss(strokeColorArr, `rgba(${DefaultAoiColor}ff)`)

  const isItvVector = cfg.type === MapType.itvVector

  const pointSourceId = `${id}-point-source`
  const pointLayerId = `${id}-point`
  const fillLayerId = `${id}-fill`
  const lineLayerId = `${id}-line`
  const iconName = 'custom-pin-icon'
  const iconNamePhoto = 'custom-pin-icon-photo'

  const geoJsonEnsurePointIcons = (
    targetMap: maplibregl.Map,
    photoMap: maplibregl.Map,
    setPhotoCrossOrigin: boolean,
  ) => {
    if (!targetMap.hasImage(iconName)) {
      const img = new window.Image(21, 29)
      const svg = new Blob([pinSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(svg)
      img.onload = () => {
        try {
          safeAddImage(targetMap, iconName, img, { pixelRatio: 2 })
        } catch {}
        URL.revokeObjectURL(url)
      }
      img.src = url
    }
    if (!photoMap.hasImage(iconNamePhoto)) {
      const img = new window.Image(36, 36)
      const svg = new Blob([getPinSvgPhoto()], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(svg)
      if (setPhotoCrossOrigin) img.crossOrigin = 'Anonymous'
      img.onload = () => {
        try {
          safeAddImage(photoMap, iconNamePhoto, img, { pixelRatio: 2 })
        } catch {}
        URL.revokeObjectURL(url)
      }
      img.src = url
    }
  }

  const geoJsonEnsurePointSource = (m: maplibregl.Map, pointFeatures: GeoJSON.Feature[], trackSources: boolean) => {
    if (!m.getSource(pointSourceId)) {
      m.addSource(pointSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pointFeatures,
        },
      })
      if (trackSources) createdSources.push(pointSourceId)
    }
  }

  const geoJsonEnsurePointLayer = (
    m: maplibregl.Map,
    setVisibility: boolean,
    trackLayers: boolean,
    usePhotoIcon: boolean,
  ) => {
    if (!m.getLayer(pointLayerId)) {
      m.addLayer(
        {
          id: pointLayerId,
          type: 'symbol',
          source: pointSourceId,
          layout: {
            'icon-image': usePhotoIcon ? iconNamePhoto : iconName,
            'icon-size': 1.5,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            visibility: visible ? 'visible' : 'none',
          },
        },
        layerIdConfig.customReferer,
      )
      if (trackLayers) createdLayers.push(pointLayerId)
    } else if (setVisibility) {
      m.setLayoutProperty(pointLayerId, 'visibility', visible ? 'visible' : 'none')
      if (trackLayers) createdLayers.push(pointLayerId)
    }
  }

  const geoJsonEnsureFillLayer = (
    m: maplibregl.Map,
    setVisibility: boolean,
    trackLayers: boolean,
    paint: Record<string, any>,
    minzoom?: number,
  ) => {
    if (!m.getLayer(fillLayerId)) {
      m.addLayer(
        {
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
          layout: { visibility: visible ? 'visible' : 'none' },
          paint,
          minzoom,
        },
        layerIdConfig.customReferer,
      )
      if (trackLayers) createdLayers.push(fillLayerId)
    } else if (setVisibility) {
      m.setLayoutProperty(fillLayerId, 'visibility', visible ? 'visible' : 'none')
      if (trackLayers) createdLayers.push(fillLayerId)
    }
  }

  const geoJsonEnsureLineLayer = (
    m: maplibregl.Map,
    setVisibility: boolean,
    trackLayers: boolean,
    minzoom?: number,
  ) => {
    if (!m.getLayer(lineLayerId)) {
      m.addLayer(
        {
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: { visibility: visible ? 'visible' : 'none' },
          paint: {
            'line-color': strokeColor,
            'line-width': 2,
          },
          filter: [
            'any',
            ['==', ['geometry-type'], 'LineString'],
            ['==', ['geometry-type'], 'MultiLineString'],
            ['==', ['geometry-type'], 'Polygon'],
            ['==', ['geometry-type'], 'MultiPolygon'],
          ],
          minzoom,
        },
        layerIdConfig.customReferer,
      )
      if (trackLayers) createdLayers.push(lineLayerId)
    } else if (setVisibility) {
      m.setLayoutProperty(lineLayerId, 'visibility', visible ? 'visible' : 'none')
      if (trackLayers) createdLayers.push(lineLayerId)
    }
  }

  // Add symbol layer for Point geometry (icon) - use separate source for Point only
  const pointFeatures = parsedData.features.filter(
    (f) => f.geometry && (f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint'),
  )
  if (pointFeatures.length > 0) {
    geoJsonEnsurePointIcons(map, map, false)
    geoJsonEnsurePointSource(map, pointFeatures, true)
    geoJsonEnsurePointLayer(map, true, true, type === MapType.itvPhoto)
  }

  const fillPaint = isItvVector
    ? {
        'fill-color': '#0E94FA',
        'fill-opacity': 0.3,
      }
    : {
        'fill-color': fillColor,
        'fill-opacity': 0.6,
        'fill-outline-color': strokeColor,
      }

  geoJsonEnsureFillLayer(map, true, true, fillPaint, isItvVector ? undefined : 10)
  geoJsonEnsureLineLayer(map, true, true, isItvVector ? undefined : 10)

  const removeHandlers: Array<() => void> = []

  if (getClickInfo) {
    const clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      const props = feature ? { ...(feature.properties as Record<string, unknown>), type: cfg.type } : null
      const lngLat: [number, number] | undefined = e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : undefined
      getClickInfo(lngLat, props)
    }

    const clickLayerIds = [pointFeatures.length > 0 ? `${id}-point` : '', fillLayerId, lineLayerId].filter(Boolean)
    for (const lid of clickLayerIds) {
      map.on('click', lid, clickHandler)
      removeHandlers.push(() => map.off('click', lid, clickHandler))
    }
  }

  try {
    const handlerId = `layer-reg-${id}`
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handler = (m: maplibregl.Map) => {
      try {
        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, {
            type: 'geojson',
            data: parsedData as any,
          })
        }
        // Restore point source/layer if needed
        const pointFeatures = parsedData.features.filter(
          (f) => f.geometry && (f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint'),
        )
        if (pointFeatures.length > 0) {
          geoJsonEnsurePointIcons(m, map, true)
          geoJsonEnsurePointSource(m, pointFeatures, false)
          geoJsonEnsurePointLayer(m, false, false, type === MapType.itvPhoto)
        }

        geoJsonEnsureFillLayer(m, false, false, fillPaint, isItvVector ? undefined : 10)
        geoJsonEnsureLineLayer(m, false, false, 10)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('geojson layer style-data handler error', e)
      }
    }
    register(map, handlerId, handler)
    removeHandlers.push(() => unregister(map, handlerId))
  } catch {}

  return {
    sourceIds: createdSources,
    layerIds: createdLayers,
    cleanup: buildCleanup(map, createdLayers, createdSources, removeHandlers),
  }
}

const createVectorLayers = (
  cfg: VectorLayerConfig,
  map: maplibregl.Map,
  visible: boolean,
  thresholds: Record<string, [number, number]>,
  getClickInfo?: (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => void,
): CreatedMapLibreLayers | null => {
  const { id, data, assetKey, color_code } = cfg
  if (!data) return null

  const createdSources: string[] = []
  const createdLayers: string[] = []
  const removeHandlers: Array<() => void> = []
  const sourceId = `${id}-source`

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'vector',
      tiles: Array.isArray(data) ? data : [data],
      minzoom: 10,
    })
    createdSources.push(sourceId)
  }

  const th = thresholds[id] ?? [0, 100]
  const [minTh, maxTh] = th
  const confExpr: maplibregl.ExpressionSpecification = [
    'coalesce',
    ['get', 'confidence'],
    ['get', 'confidence_mean'],
    1,
  ]
  const filter: maplibregl.ExpressionSpecification = [
    'all',
    ['>=', confExpr, minTh / 100],
    ['<=', confExpr, maxTh / 100],
  ]

  const baseColorArr = color_code
    ? hexToRGBAArray(color_code, true)
    : hexToRGBAArray(getColorByModelId(assetKey ?? ''), true)
  const lineColorArr = color_code ? hexToRGBAArray(color_code) : hexToRGBAArray(getColorByModelId(assetKey ?? ''))
  const fillColor = rgbaArrayToCss(baseColorArr, 'rgba(255,0,0,0.6)')
  const strokeColor = rgbaArrayToCss(lineColorArr, 'rgba(255,0,0,1)')
  if ( assetKey === SARBattleDamageKey ) {
    const { layerIds, handler } = createSarPolygonLayers(
      map,
      cfg,
      id,
      sourceId,
      filter,
      visible,
      fillColor,
      strokeColor,
      getClickInfo,
    )
    createdLayers.push(...layerIds)
    if (handler) removeHandlers.push(handler)
  } else if (assetKey === SARChangeDetectionKey) {
    const { layerId, handler } = createSARPointLayer(
      map,
      cfg,
      id,
      sourceId,
      filter,
      visible,
      fillColor,
      strokeColor,
      getClickInfo,
    )
    createdLayers.push(layerId)
    if (handler) removeHandlers.push(handler)
  } else {
    const { layerIds, handler } = createRegularVectorLayers(
      map,
      cfg,
      id,
      sourceId,
      filter,
      visible,
      fillColor,
      strokeColor,
      getClickInfo,
    )
    createdLayers.push(...layerIds)
    if (handler) removeHandlers.push(handler)
  }

  // register style-data handler to recreate vector source/layers after style reload
  try {
    const handlerId = `layer-reg-${id}`
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handler = (m: maplibregl.Map) => {
      try {
        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, {
            type: 'vector',
            tiles: Array.isArray(data) ? data : [data],
            minzoom: 10,
          })
        }
        if (assetKey === SARBattleDamageKey) {
          const fillLayerId = `${id}-fill`
          if (!m.getLayer(fillLayerId)) {
            m.addLayer(
              {
                id: fillLayerId,
                type: 'fill',
                source: sourceId,
                'source-layer': 'default',
                minzoom: 10,
                filter,
                layout: { visibility: 'visible' },
                paint: {
                  'fill-color': [
                    'match',
                    ['get', 'damage_level'], 
                    1, '#f44336',      
                    2, '#e53935',       
                    3, '#d32f2f',        
                    4, '#c62828',
                    5, '#b71c1c',
                    fillColor 
                  ],
                  'fill-outline-color': [
                    'match',
                    ['get', 'damage_level'], 
                    1, '#f44336',      
                    2, '#e53935',       
                    3, '#d32f2f',        
                    4, '#c62828',
                    5, '#b71c1c',
                    strokeColor 
                  ],
                  'fill-opacity': 0.8,
                },
              },
              layerIdConfig.customReferer,
            )
          }
          const lineLayerId = `${id}-line`
          if (!m.getLayer(lineLayerId)) {
            m.addLayer(
              {
                id: lineLayerId,
                type: 'line',
                source: sourceId,
                'source-layer': 'default',
                minzoom: 10,
                filter,
                layout: { visibility: 'visible' },
                paint: {
                  'line-color': [
                    'match',
                    ['get', 'damage_level'], 
                    1, '#f44336',      
                    2, '#e53935',       
                    3, '#d32f2f',        
                    4, '#c62828',
                    5, '#b71c1c',
                    strokeColor 
                  ],
                  'line-width': 1.2,
                },
              },
              layerIdConfig.customReferer,
            )
          }
        } else if (assetKey === SARChangeDetectionKey) {
          const pointLayerId = `${id}-point`
          if (!m.getLayer(pointLayerId)) {
            m.addLayer(
              {
                id: pointLayerId,
                type: 'circle',
                source: sourceId,
                'source-layer': 'default',
                minzoom: 10,
                filter,
                layout: { visibility: 'visible' },
                paint: {
                  'circle-color': [
                    'match',
                    ['get', 'damage_level'], 
                    1, '#ffebee',
                    2, '#ffcdd2',      
                    3, '#ef9a9a',       
                    4, '#e57373',        
                    5, '#ef5350',
                    fillColor
                  ],
                  'circle-stroke-color': [
                    'match',
                    ['get', 'damage_level'], 
                    1, '#ffebee',
                    2, '#ffcdd2',      
                    3, '#ef9a9a',       
                    4, '#e57373',        
                    5, '#ef5350',
                    strokeColor
                  ],
                  'circle-radius': 5,
                  'circle-stroke-width': 1,
                  'circle-opacity': 0.8,
                },
              },
              layerIdConfig.customReferer,
            )
          } else {
            // let hook handle filter via updateVectorLayerFilters
          }
        } else {
          const fillLayerId = `${id}-fill`
          if (!m.getLayer(fillLayerId)) {
            m.addLayer(
              {
                id: fillLayerId,
                type: 'fill',
                source: sourceId,
                'source-layer': 'default',
                minzoom: 10,
                filter,
                layout: { visibility: 'visible' },
                paint: {
                  'fill-color': fillColor,
                  'fill-opacity': 0.6,
                  'fill-outline-color': strokeColor,
                },
              },
              layerIdConfig.customReferer,
            )
          }
          const lineLayerId = `${id}-line`
          if (!m.getLayer(lineLayerId)) {
            m.addLayer(
              {
                id: lineLayerId,
                type: 'line',
                source: sourceId,
                'source-layer': 'default',
                minzoom: 10,
                filter,
                layout: { visibility: 'visible' },
                paint: {
                  'line-color': strokeColor,
                  'line-width': 1.2,
                },
              },
              layerIdConfig.customReferer,
            )
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('vector layer style-data handler error', e)
      }
    }
    register(map, handlerId, handler)
    removeHandlers.push(() => unregister(map, handlerId))
  } catch {}

  return {
    sourceIds: createdSources,
    layerIds: createdLayers,
    cleanup: buildCleanup(map, createdLayers, createdSources, removeHandlers),
  }
}

const createItvDrawLayers = (
  cfg: ItvLayerConfig,
  map: maplibregl.Map,
  visible: boolean,
): CreatedMapLibreLayers | null => {
  const { id, data, color_code } = cfg
  if (!data) return null

  const createdSources: string[] = []
  const createdLayers: string[] = []
  const sourceId = `${id}-source`

  let parsedData: GeoJSON.FeatureCollection
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data)
    } catch (e) {
      console.error(`Failed to parse GeoJSON data for layer ${id}:`, e)
      return null
    }
  } else {
    parsedData = data as GeoJSON.FeatureCollection
  }

  if (!parsedData) return null

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: parsedData as any,
    })
    createdSources.push(sourceId)
  }

  const fillColorArr = color_code ? hexToRGBAArray(color_code, true) : hexToRGBAArray(DefaultAoiColor, true)
  const strokeColorArr = color_code ? hexToRGBAArray(color_code) : hexToRGBAArray(DefaultAoiColor)
  const fillColor = rgbaArrayToCss(fillColorArr, `rgba(${DefaultAoiColor}aa)`)
  const strokeColor = rgbaArrayToCss(strokeColorArr, `rgba(${DefaultAoiColor}ff)`)

  const pointFeatures = parsedData.features.filter((f) => f.geometry && f.geometry.type === 'Point')
  const pointSourceId = `${id}-point-source`
  const pointLayerId = `${id}-point`
  const pointLabelLayerId = `${id}-point-label`
  const fillLayerId = `${id}-fill`
  const lineLayerId = `${id}-line`
  const iconName = 'custom-pin-icon-sdf-hq'

  const ensurePointSource = (m: maplibregl.Map) => {
    if (!m.getSource(pointSourceId)) {
      m.addSource(pointSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pointFeatures,
        },
      })
      createdSources.push(pointSourceId)
    }
  }

  const addOrUpdatePointLayer = (m: maplibregl.Map, setVisibility: boolean, trackLayers: boolean) => {
    if (!m.getLayer(pointLayerId)) {
      m.addLayer(
        {
          id: pointLayerId,
          type: 'circle',
          source: pointSourceId,
          filter: ['!=', ['get', 'drawType'], ItvDrawType.TEXT],
          layout: {
            visibility: visible ? 'visible' : 'none',
          },
          paint: {
            'circle-color': ['coalesce', ['get', 'drawFillColor'], '#00F0FF'],
            'circle-radius': ['coalesce', ['get', 'drawSize'], 6],
            'circle-stroke-color': ['coalesce', ['get', 'drawBorderColor'], '#ffffff'],
            'circle-stroke-width': ['coalesce', ['get', 'drawBorderSize'], 1],
            'circle-opacity': 1,
          },
        },
        layerIdConfig.customReferer,
      )
      if (trackLayers) createdLayers.push(pointLayerId)
    } else if (setVisibility) {
      m.setLayoutProperty(pointLayerId, 'visibility', visible ? 'visible' : 'none')
      if (trackLayers) createdLayers.push(pointLayerId)
    }
  }

  const addOrUpdatePointLabelLayer = (m: maplibregl.Map, setVisibility: boolean, trackLayers: boolean) => {
    if (!m.getLayer(pointLabelLayerId)) {
      m.addLayer(
        {
          id: pointLabelLayerId,
          type: 'symbol',
          source: pointSourceId,
          filter: ['==', ['get', 'drawType'], ItvDrawType.TEXT],
          layout: {
            'text-field': ['coalesce', ['get', 'drawText'], ''],
            'text-font': ['Noto Sans Regular'],
            'text-size': ['coalesce', ['get', 'drawSize'], 12],
            'text-letter-spacing': 0,
            'text-offset': [0, -1.2],
            'text-anchor': 'top',
            'text-allow-overlap': false,
            'symbol-placement': 'point',
            'text-rotate': ['coalesce', ['get', 'drawDegree'], 0],
            'text-rotation-alignment': 'viewport',
            'text-pitch-alignment': 'viewport',
            visibility: visible ? 'visible' : 'none',
          },
          paint: {
            'text-color': ['coalesce', ['get', 'drawTextColor'], '#222'],
            'text-halo-color': ['coalesce', ['get', 'drawTextHaloColor'], '#fff'],
            'text-halo-width': ['coalesce', ['get', 'drawTextHaloSize'], 1],
          },
        },
        layerIdConfig.customReferer,
      )
      if (trackLayers) createdLayers.push(pointLabelLayerId)
    } else if (setVisibility) {
      m.setLayoutProperty(pointLabelLayerId, 'visibility', visible ? 'visible' : 'none')
      if (trackLayers) createdLayers.push(pointLabelLayerId)
    }
  }

  const ensurePointLayers = (m: maplibregl.Map, setVisibility: boolean, trackLayers: boolean) => {
    if (pointFeatures.length === 0) return

    checkImage(map, iconName, 22, 25)
    ensurePointSource(m)
    addOrUpdatePointLayer(m, setVisibility, trackLayers)
    addOrUpdatePointLabelLayer(m, setVisibility, trackLayers)
  }

  const ensureFillLayer = (m: maplibregl.Map, setVisibility: boolean, trackLayers: boolean) => {
    if (!m.getLayer(fillLayerId)) {
      m.addLayer(
        {
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
          layout: { visibility: visible ? 'visible' : 'none' },
          paint: {
            'fill-color': ['coalesce', ['get', 'drawFillColor'], fillColor],
            'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.6],
          },
        },
        layerIdConfig.customReferer,
      )
      if (trackLayers) createdLayers.push(fillLayerId)
    } else if (setVisibility) {
      m.setLayoutProperty(fillLayerId, 'visibility', visible ? 'visible' : 'none')
      if (trackLayers) createdLayers.push(fillLayerId)
    }
  }

  const ensureLineLayer = (m: maplibregl.Map, setVisibility: boolean, trackLayers: boolean) => {
    if (!m.getLayer(lineLayerId)) {
      m.addLayer(
        {
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: { visibility: visible ? 'visible' : 'none' },
          paint: {
            'line-color': ['coalesce', ['get', 'drawBorderColor'], strokeColor],
            'line-width': ['coalesce', ['get', 'drawBorderSize'], 2],
          },
        },
        layerIdConfig.customReferer,
      )
      if (trackLayers) createdLayers.push(lineLayerId)
    } else if (setVisibility) {
      m.setLayoutProperty(lineLayerId, 'visibility', visible ? 'visible' : 'none')
      if (trackLayers) createdLayers.push(lineLayerId)
    }
  }

  ensurePointLayers(map, true, true)
  ensureFillLayer(map, true, true)
  ensureLineLayer(map, true, true)

  const removeHandlers: Array<() => void> = []
  try {
    const handlerId = `layer-reg-${id}`
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handler = (m: maplibregl.Map) => {
      try {
        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, {
            type: 'geojson',
            data: parsedData as any,
          })
        }
        ensurePointLayers(m, false, false)
        ensureFillLayer(m, false, false)
        ensureLineLayer(m, false, false)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('geojson layer style-data handler error', e)
      }
    }
    register(map, handlerId, handler)
    removeHandlers.push(() => unregister(map, handlerId))
  } catch {}

  return {
    sourceIds: createdSources,
    layerIds: createdLayers,
    cleanup: buildCleanup(map, createdLayers, createdSources, removeHandlers),
  }
}

const createItvRasterTileLayers = (
  cfg: ItvTileLayerConfig,
  map: maplibregl.Map,
  visible: boolean,
): CreatedMapLibreLayers | null => {
  // Fix from thaicom: if bands are specified, append them to the tile URL(s)
  let data = cfg.template ?? cfg.data ?? cfg.tiles
  if (cfg.bands && cfg.bands.length > 0 && data) {
    const appendBand = (url: string) => {
      try {
        const [base, search] = url.split('?')
        const params = new URLSearchParams(search)
        params.delete('bidx')
        params.delete('colormap')
        cfg.bands?.forEach((b) => {
          params.append('bidx', b.toString())
        })
        if (cfg.colormapName) {
          params.append('colormap', cfg.colormapName)
        }
        return `${base}?${params.toString()}`
      } catch (e) {
        return url
      }
    }
    if (Array.isArray(data)) {
      data = data.map(appendBand)
    } else {
      data = appendBand(data)
    }
  }

  if (!data) return null

  const createdSources: string[] = []
  const createdLayers: string[] = []
  const removeHandlers: Array<() => void> = []
  const sourceId = `${cfg.id}-source`

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'raster',
      tiles: Array.isArray(data) ? data : [data],
      tileSize: 256,
      minzoom: 8,
    })
    createdSources.push(sourceId)
  }

  const layerId = cfg.id
  if (!map.getLayer(layerId)) {
    map.addLayer(
      {
        id: layerId,
        type: 'raster',
        source: sourceId,
        layout: { visibility: visible ? 'visible' : 'none' },
        paint: { 'raster-opacity': 1 },
        minzoom: 8,
      },
      layerIdConfig.customReferer,
    )
    createdLayers.push(layerId)
  } else {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
    // even if the layer already existed, record it so callers can update visibility
    createdLayers.push(layerId)
  }

  // register style-data handler to re-create source/layer if style reload removed them
  try {
    const handlerId = `layer-reg-${cfg.id}`
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handler = (m: maplibregl.Map) => {
      try {
        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, {
            type: 'raster',
            tiles: Array.isArray(data) ? data : [data],
            tileSize: 256,
            minzoom: 8,
          })
        }
        if (!m.getLayer(layerId)) {
          m.addLayer(
            {
              id: layerId,
              type: 'raster',
              source: sourceId,
              layout: { visibility: 'visible' },
              paint: { 'raster-opacity': 1 },
              minzoom: 8,
            },
            layerIdConfig.customReferer,
          )
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('tile layer style-data handler error', e)
      }
    }
    // Unregister existing handler before registering new one to avoid duplicates
    try {
      unregister(map, handlerId)
    } catch {}
    register(map, handlerId, handler)
    removeHandlers.push(() => unregister(map, handlerId))
  } catch {}

  return {
    sourceIds: createdSources,
    layerIds: createdLayers,
    cleanup: buildCleanup(map, createdLayers, createdSources, removeHandlers),
  }
}

const inspectTile = async (url: string) => {
  try {
    // Handle template URLs (simple replacement for testing)
    const fetchUrl = url.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0')
    const res = await fetch(fetchUrl)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const tile = new VectorTile(new Pbf(arrayBuffer))
    const layers = Object.keys(tile.layers)
    // Return the first layer found, or default if none
    return layers.length > 0 ? layers[0] : null
  } catch (e) {
    console.error('Error inspecting tile:', e)
    return null
  }
}

const checkImage = (m: maplibregl.Map, iconName: string, imgWidth = 21, imgHeight = 29) => {
  if (!m.hasImage(iconName)) {
    const img = new window.Image(imgWidth, imgHeight)
    const url = '/map/pin.svg'
    img.onload = () => {
      try {
        safeAddImage(m, iconName, img, { pixelRatio: 2, sdf: true })
      } catch {}
    }
    img.src = url
  }
}

const createItvVectorTileLayers = (
  cfg: ItvVectorLayerConfig,
  map: maplibregl.Map,
  visible: boolean,
): CreatedMapLibreLayers | null => {
  const { id, data, color_code } = cfg
  if (!data) return null

  const createdSources: string[] = []
  const createdLayers: string[] = []
  const removeHandlers: Array<() => void> = []
  const sourceId = `${id}-source`
  const tiles = Array.isArray(data) ? data : [data]

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'vector',
      tiles,
      minzoom: 8,
    })
    createdSources.push(sourceId)
  }

  const fillColorArr = color_code ? hexToRGBAArray(color_code, true) : hexToRGBAArray(DefaultAoiColor, true)
  const strokeColorArr = color_code ? hexToRGBAArray(color_code) : hexToRGBAArray(DefaultAoiColor)
  const fillColor = rgbaArrayToCss(fillColorArr, `rgba(${DefaultAoiColor}aa)`)
  const strokeColor = rgbaArrayToCss(strokeColorArr, `rgba(${DefaultAoiColor}ff)`)

  // --- Layer Creation Helper ---
  const addLayers = (sourceLayer: string) => {
    // --- Point Layer ---
    const pointLayerId = `${id}-point`
    const iconName = 'custom-pin-icon-sdf'

    // Ensure SDF icon image exists
    checkImage(map, iconName)

    if (!map.getLayer(pointLayerId)) {
      map.addLayer(
        {
          id: pointLayerId,
          type: 'symbol',
          source: sourceId,
          'source-layer': sourceLayer,
          filter: ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']],
          layout: {
            'icon-image': iconName,
            'icon-size': 1.5,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            visibility: visible ? 'visible' : 'none',
          },
          minzoom: 8,
        },
        layerIdConfig.customReferer,
      )
      createdLayers.push(pointLayerId)
    } else {
      map.setLayoutProperty(pointLayerId, 'visibility', visible ? 'visible' : 'none')
      createdLayers.push(pointLayerId)
    }

    // --- Polygon (Fill) Layer ---
    const fillLayerId = `${id}-fill`
    if (!map.getLayer(fillLayerId)) {
      map.addLayer(
        {
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          'source-layer': sourceLayer,
          filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
          layout: { visibility: visible ? 'visible' : 'none' },
          paint: {
            'fill-color': fillColor,
            'fill-opacity': 0.6,
            'fill-outline-color': strokeColor,
          },
          minzoom: 8,
        },
        layerIdConfig.customReferer,
      )
      createdLayers.push(fillLayerId)
    } else {
      map.setLayoutProperty(fillLayerId, 'visibility', visible ? 'visible' : 'none')
      createdLayers.push(fillLayerId)
    }

    // --- Line Layer ---
    const lineLayerId = `${id}-line`
    if (!map.getLayer(lineLayerId)) {
      map.addLayer(
        {
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          'source-layer': sourceLayer,
          layout: { visibility: visible ? 'visible' : 'none' },
          paint: {
            'line-color': strokeColor,
            'line-width': 2,
          },
          minzoom: 8,
        },
        layerIdConfig.customReferer,
      )
      createdLayers.push(lineLayerId)
    } else {
      map.setLayoutProperty(lineLayerId, 'visibility', visible ? 'visible' : 'none')
      createdLayers.push(lineLayerId)
    }
  }

  // Inspect first tile to get source-layer
  if (tiles.length > 0) {
    inspectTile(tiles[0]).then((detectedLayer) => {
      // If the map or source was removed while fetching, abort
      if (!map.getSource(sourceId)) return
      const sourceLayer = detectedLayer || 'default'
      addLayers(sourceLayer)
    })
  } else {
    addLayers('default')
  }

  // Register style-data handler for basemap switches
  try {
    const handlerId = `layer-reg-${id}`
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handler = (m: maplibregl.Map) => {
      try {
        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, {
            type: 'vector',
            tiles,
            minzoom: 8,
          })
        }

        // For style reload, we might re-inspect or just use 'default' if we didn't store it.
        // Ideally we should cache the source-layer but for now let's re-trigger inspection or consistent default. Use same logic.
        if (tiles.length > 0) {
          inspectTile(tiles[0]).then((detectedLayer) => {
            if (!m.getSource(sourceId)) return
            const sl = detectedLayer || 'default'

            // Ensure SDF icon exists
            const iconName = 'custom-pin-icon-sdf'
            checkImage(m, iconName)

            const pointLayerId = `${id}-point`
            if (!m.getLayer(pointLayerId)) {
              m.addLayer(
                {
                  id: pointLayerId,
                  type: 'symbol',
                  source: sourceId,
                  'source-layer': sl,
                  filter: ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']],
                  layout: {
                    'icon-image': iconName,
                    'icon-size': 1.5,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    visibility: visible ? 'visible' : 'none',
                  },
                  minzoom: 8,
                },
                layerIdConfig.customReferer,
              )
            }

            const fillLayerId = `${id}-fill`
            if (!m.getLayer(fillLayerId)) {
              m.addLayer(
                {
                  id: fillLayerId,
                  type: 'fill',
                  source: sourceId,
                  'source-layer': sl,
                  filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
                  layout: { visibility: 'visible' },
                  paint: {
                    'fill-color': fillColor,
                    'fill-opacity': 0.6,
                    'fill-outline-color': strokeColor,
                  },
                  minzoom: 8,
                },
                layerIdConfig.customReferer,
              )
            }

            const lineLayerId = `${id}-line`
            if (!m.getLayer(lineLayerId)) {
              m.addLayer(
                {
                  id: lineLayerId,
                  type: 'line',
                  source: sourceId,
                  'source-layer': sl,
                  layout: { visibility: 'visible' },
                  paint: {
                    'line-color': strokeColor,
                    'line-width': 2,
                  },
                  minzoom: 8,
                },
                layerIdConfig.customReferer,
              )
            }
          })
        }
      } catch (e) {
        console.error('vector tile layer style-data handler error', e)
      }
    }
    register(map, handlerId, handler)
    removeHandlers.push(() => unregister(map, handlerId))
  } catch {}

  return {
    sourceIds: createdSources,
    layerIds: createdLayers,
    cleanup: buildCleanup(map, createdLayers, createdSources, removeHandlers),
  }
}
const createItvAnnotationLayers = (
  cfg: ItvAnnotationLayerConfig,
  map: maplibregl.Map,
  visible: boolean,
): CreatedMapLibreLayers | null => {
  const { id, features } = cfg
  if (!features || features.length === 0) return null

  const createdSources: string[] = []
  const createdLayers: string[] = []
  const pointSourceId = `${id}-point-source`
  const pointLayerId = `${id}-point`

  const getSymbolImageName = (sidc: string) => `mil-symbol-${sidc.replaceAll(/[^a-zA-Z0-9]/g, '_')}`

  const buildSymbolProperties = (annotationLabel?: AnnotationLabelItem, symbolSize?: number) => {
    const cleanProperties = Object.fromEntries(
      Object.entries(annotationLabel || {}).map(([key, value]) => [key, value ?? undefined]),
    )
    return { ...cleanProperties, size: symbolSize }
  }

  const addSvgImageToMap = (m: maplibregl.Map, imageName: string, svgString: string, width: number, height: number) => {
    const svg = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svg)
    const img = new window.Image(width, height)

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)

          const croppedCanvas = cropCanvasImage(canvas, false)
          const croppedCtx = croppedCanvas.getContext('2d')
          if (croppedCtx) {
            const croppedImageData = croppedCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height)
            safeAddImage(m, imageName, croppedImageData as any)
          }
        }
        URL.revokeObjectURL(url)
      } catch (e) {
        console.error(`Failed to add symbol image ${imageName}:`, e)
        URL.revokeObjectURL(url)
      }
    }

    img.onerror = () => {
      console.error(`Failed to load symbol image ${imageName}`)
      URL.revokeObjectURL(url)
    }

    img.src = url
  }

  const ensureSymbolImage = (
    m: maplibregl.Map,
    sidc: string,
    annotationLabel?: AnnotationLabelItem,
    symbolSize?: number,
    width?: number,
    height?: number,
  ) => {
    const properties = buildSymbolProperties(annotationLabel, symbolSize)
    const sym = new ms.Symbol(sidc, properties)
    const svgString = sym.asSVG()
    const size = sym.getSize()
    const imageName = getSymbolImageName(sidc)
    const finalWidth = width ?? size.width
    const finalHeight = height ?? size.height

    addSvgImageToMap(m, imageName, svgString, finalWidth, finalHeight)
    return { imageName, width: finalWidth, height: finalHeight }
  }

  // Create symbol images from features and store symbol metadata
  const symbolMap = new Map<
    string,
    { imageName: string; width: number; height: number; symbolSize: number; annotationLabel?: AnnotationLabelItem }
  >()

  features.forEach((f) => {
    const sidc = f.sidc || ''
    if (sidc && !symbolMap.has(sidc)) {
      try {
        const symbolSize = f.annotationSymbol?.symbolSize || 40
        const { imageName, width, height } = ensureSymbolImage(map, sidc, f.annotationLabel || {}, symbolSize)

        symbolMap.set(sidc, { imageName, width, height, symbolSize, annotationLabel: f.annotationLabel || {} })
      } catch (e) {
        console.error(`Failed to create symbol for SIDC ${sidc}:`, e)
      }
    }
  })

  // Create GeoJSON features directly from features array
  const enrichedFeatures = features
    .filter((f) => f.geometry && f.geometry.type === 'Point')
    .map((f) => {
      const symbolInfo = symbolMap.get(f.sidc || '')
      return {
        type: 'Feature' as const,
        geometry: f.geometry,
        properties: {
          id: f.id,
          sidc: f.sidc || '',
          symbolImageName: symbolInfo?.imageName || '',
          symbolWidth: symbolInfo?.width || 40,
          symbolHeight: symbolInfo?.height || 40,
        },
      }
    })

  if (enrichedFeatures.length === 0) return null

  // Remove old images to force update
  features.forEach((f) => {
    const sidc = f.sidc || ''
    if (sidc) {
      const imageName = getSymbolImageName(sidc)
      if (map.hasImage(imageName)) {
        map.removeImage(imageName)
      }
    }
  })

  // Add point source
  if (!map.getSource(pointSourceId)) {
    map.addSource(pointSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: enrichedFeatures,
      },
    })
    createdSources.push(pointSourceId)
  }

  // Point symbol layer using feature properties
  if (!map.getLayer(pointLayerId)) {
    map.addLayer(
      {
        id: pointLayerId,
        type: 'symbol',
        source: pointSourceId,
        layout: {
          'icon-image': ['get', 'symbolImageName'],
          'icon-size': 1,
          'icon-anchor': 'center',
          'icon-allow-overlap': true,
          visibility: visible ? 'visible' : 'none',
        },
      },
      layerIdConfig.customReferer,
    )
    createdLayers.push(pointLayerId)
  } else {
    map.setLayoutProperty(pointLayerId, 'visibility', visible ? 'visible' : 'none')
    createdLayers.push(pointLayerId)
  }

  const removeHandlers: Array<() => void> = []
  try {
    const handlerId = `layer-reg-${id}`
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handler = (m: maplibregl.Map) => {
      try {
        // Re-create symbol images on style reload
        symbolMap.forEach(({ imageName, width, height, symbolSize, annotationLabel }, sidc) => {
          if (!m.hasImage(imageName)) {
            try {
              ensureSymbolImage(m, sidc, annotationLabel, symbolSize, width, height)
            } catch (e) {
              console.error(`Failed to recreate symbol for SIDC ${sidc}:`, e)
            }
          }
        })
        if (!m.getSource(pointSourceId)) {
          m.addSource(pointSourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: enrichedFeatures,
            },
          })
        }
        if (!m.getLayer(pointLayerId)) {
          m.addLayer(
            {
              id: pointLayerId,
              type: 'symbol',
              source: pointSourceId,
              layout: {
                'icon-image': ['get', 'symbolImageName'],
                'icon-size': 1,
                'icon-anchor': 'center',
                'icon-allow-overlap': true,
                visibility: 'visible',
              },
            },
            layerIdConfig.customReferer,
          )
        }
      } catch (e) {
        console.error('annotation layer style-data handler error', e)
      }
    }
    register(map, handlerId, handler)
    removeHandlers.push(() => unregister(map, handlerId))
  } catch {}

  return {
    sourceIds: createdSources,
    layerIds: createdLayers,
    cleanup: buildCleanup(map, createdLayers, createdSources, removeHandlers),
  }
}

/**
 * Create MapLibre sources + layers from LayerConfig (tile/vector/geojson)
 * Performs side-effects on provided map instance. Returns created ids + cleanup function.
 */
export const createMapLibreLayersFromConfig = (
  cfg: LayerConfig,
  deps: MapLibreLayerDeps,
): CreatedMapLibreLayers | null => {
  if (!cfg || !('type' in cfg) || !deps?.map) return null
  const { map, thresholds = {}, layerVisibility, getClickInfo } = deps
  const visible = layerVisibility ? !!layerVisibility[cfg.id] : true

  if (cfg.type === MapType.tile) {
    return createTileLayers(cfg, map, visible)
  }

  if (cfg.type === MapType.geojson || cfg.type === MapType.itvVector || cfg.type === MapType.itvPhoto) {
    return createGeoJsonLayers(cfg, map, visible, getClickInfo)
  }

  if (cfg.type === MapType.vector) {
    return createVectorLayers(cfg, map, visible, thresholds, getClickInfo)
  }

  if (cfg.type === MapType.itvRasterTile || cfg.type === MapType.itvGallery) {
    return createItvRasterTileLayers(cfg as ItvTileLayerConfig, map, visible)
  }

  if (cfg.type === MapType.itvVectorTile) {
    return createItvVectorTileLayers(cfg, map, visible)
  }

  if (cfg.type === MapType.itvDraw) {
    return createItvDrawLayers(cfg, map, visible)
  }

  if (cfg.type === MapType.itvAnnotation) {
    return createItvAnnotationLayers(cfg, map, visible)
  }

  return null
}

export default createMapLibreLayersFromConfig
