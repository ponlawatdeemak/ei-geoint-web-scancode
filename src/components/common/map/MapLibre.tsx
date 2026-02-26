import 'maplibre-gl/dist/maplibre-gl.css'
import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Map as ReactMap } from 'react-map-gl/maplibre'
import useMapStore from './store/map'
import maplibregl, { MapLibreEvent, MapStyleDataEvent, StyleSpecification } from 'maplibre-gl'
import { googleProtocol } from './utils/google'
import { useSession } from 'next-auth/react'
import { layerIdConfig, thaiExtent } from './config/map'
import useResponsive from '@/hook/responsive'

interface MapLibreProps {
  mapId: string
  mapStyle: string | StyleSpecification
  isInteractive: boolean
  isHideAttributionControl?: boolean
  zoomStyle?: number
}

const MapLibre: FC<MapLibreProps> = ({
  mapId,
  mapStyle,
  isInteractive = true,
  isHideAttributionControl = false,
  zoomStyle,
}) => {
  const { setMapLibre } = useMapStore()
  const { data: session } = useSession()
  const { is2K } = useResponsive()

  const [resolvedStyle, setResolvedStyle] = useState<string | StyleSpecification>(mapStyle)

  // initial google basemap protocol
  useEffect(() => {
    maplibregl.addProtocol('google', googleProtocol)
  }, [])

  // remove map instance in context
  useEffect(() => {
    return () => {
      setMapLibre(mapId, null)
    }
  }, [setMapLibre, mapId])

  useEffect(() => {
    const transformStyle = (style: StyleSpecification): StyleSpecification => {
      const newStyle: StyleSpecification = {
        ...style,
        glyphs: '/maplibre-glyphs/{fontstack}/{range}.pbf',
      }

      if (newStyle.layers) {
        newStyle.layers = newStyle.layers.map((layer) => {
          if (layer.type === 'symbol' && layer.layout?.['text-font']) {
            return {
              ...layer,
              layout: {
                ...layer.layout,
                'text-font': ['Noto Sans Regular'],
              },
            }
          }
          return layer
        })
      }
      return newStyle
    }

    if (typeof mapStyle === 'string') {
      fetch(mapStyle)
        .then((res) => res.json())
        .then((style) => {
          setResolvedStyle(transformStyle(style))
        })
        .catch(() => {
          setResolvedStyle(mapStyle)
        })
    } else if (typeof mapStyle === 'object' && mapStyle !== null) {
      setResolvedStyle(transformStyle(mapStyle))
    } else {
      setResolvedStyle(mapStyle)
    }
  }, [mapStyle])

  const onLoad = useCallback(
    (event: MapLibreEvent) => {
      const map = event.target
      setMapLibre(mapId, map)

      const attributionControl = new maplibregl.AttributionControl({
        compact: true,
        customAttribution: `<a href="https://maplibre.org" target="_blank"><span> MapLibre </span></a>`,
      })
      map.addControl(attributionControl, 'bottom-left')
      if (isHideAttributionControl) {
        ;(attributionControl as any)._updateCompactMinimize()
      }

      // const scaleControl = new maplibregl.ScaleControl()
      // map.addControl(scaleControl, 'bottom-right')
    },
    [setMapLibre, mapId, isHideAttributionControl],
  )

  const onStyleData = (event: MapStyleDataEvent) => {
    const map = event.target

    const refSource = map.getSource('custom-referer-source')
    if (!refSource) {
      map.addSource('custom-referer-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
    }
    const refLayer = map.getLayer(layerIdConfig.customReferer)
    if (!refLayer) {
      map.addLayer({
        id: layerIdConfig.customReferer,
        type: 'symbol',
        source: 'custom-referer-source',
        layout: { visibility: 'none' },
      })
    }

    const basicToolsSource = map.getSource('basic-tools-source')
    if (!basicToolsSource) {
      map.addSource('basic-tools-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
    }

    const basicToolsLayer = map.getLayer(layerIdConfig.basicTools)
    if (!basicToolsLayer) {
      map.addLayer({
        id: layerIdConfig.basicTools,
        type: 'symbol',
        source: 'basic-tools-source',
        layout: { visibility: 'none' },
      })
    }
    // call registered handlers so other components can recreate their sources/layers
    try {
      useMapStore.getState().callStyleDataHandlers(map)
    } catch (e) {
      console.error('callStyleDataHandlers failed', e)
    }
  }

  const viewState = useMemo(() => {
    return { bounds: thaiExtent, fitBoundsOptions: { padding: 100 } }
  }, [])

  return (
    <ReactMap
      style={zoomStyle ? { zoom: zoomStyle } : undefined}
      pixelRatio={is2K ? 2 : 1}
      initialViewState={viewState}
      mapStyle={resolvedStyle}
      onLoad={onLoad}
      onStyleData={onStyleData}
      interactive={isInteractive}
      touchZoomRotate={true}
      touchPitch={false}
      dragRotate={true}
      maxPitch={0}
      minPitch={0}
      attributionControl={false}
      canvasContextAttributes={{
        preserveDrawingBuffer: true,
      }}
      //   interactiveLayerIds={[]}
    >
      {/* <ScaleControl position='bottom-right' /> */}
    </ReactMap>
  )
}

export default memo(MapLibre)
