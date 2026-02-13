import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import useMapStore from '@/components/common/map/store/map'

interface MapContainerProps {
  style?: React.CSSProperties
  className?: string
  onMapLoad?: (map: maplibregl.Map) => void
  children?: React.ReactNode | ((map: maplibregl.Map) => React.ReactNode)
}

const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const MapContainer: React.FC<MapContainerProps> = ({ style, className, onMapLoad, children }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: '/maplibre-glyphs/{fontstack}/{range}.pbf',
        sources: {
          'osm-base': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19,
          },
          // 'maptiler-terrain': {
          //   type: 'raster-dem',
          //   tiles: [`https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${MAPTILER_API_KEY}`],
          //   tileSize: 256,
          //   attribution: '© <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a>',
          //   maxzoom: 15,
          // },
          // 'google-2d': {
          //   type: 'raster',
          //   tiles: [`https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_API_KEY}`],
          //   tileSize: 256,
          //   attribution: '© Google',
          //   maxzoom: 19,
          // },
        },
        layers: [
          {
            id: 'osm-base',
            type: 'raster',
            source: 'osm-base',
            minzoom: 0,
            maxzoom: 19,
          },
          // {
          //   id: 'google-2d',
          //   type: 'raster',
          //   source: 'google-2d',
          //   minzoom: 0,
          //   maxzoom: 19,
          // },
        ],
      },
      maxPitch: 85,
      center: [100.5018, 13.7563],
      zoom: 6,
      // pitch: 60,
      // bearing: -20,
    })

    map.on('load', () => {
      // map.setTerrain({ source: 'maptiler-terrain', exaggeration: 1.5 })

      // Sample polygon for demonstration
      map.addSource('sample-polygon', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [100.5, 13.75],
                [100.52, 13.75],
                [100.52, 13.77],
                [100.5, 13.77],
                [100.5, 13.75],
              ],
            ],
          },
          properties: {},
        },
      })

      map.addLayer({
        id: 'sample-polygon-fill',
        type: 'fill',
        source: 'sample-polygon',
        paint: {
          'fill-color': '#ff0000',
          'fill-opacity': 0.4,
        },
      })

      map.addLayer({
        id: 'sample-polygon-outline',
        type: 'line',
        source: 'sample-polygon',
        paint: {
          'line-color': '#ff0000',
          'line-width': 2,
        },
      })

      if (onMapLoad) onMapLoad(map)
      setMap(map)
    })

    // invoke global style-data handlers when the style changes
    const callHandlers = useMapStore.getState().callStyleDataHandlers
    map.on('styledata', () => callHandlers(map))

    mapRef.current = map

    return () => {
      map.remove()
    }
  }, [onMapLoad])

  return (
    <div ref={mapContainer} style={style ?? { width: '100%', height: '100%' }} className={className}>
      {map && (typeof children === 'function' ? children(map) : children)}
    </div>
  )
}

export default MapContainer
