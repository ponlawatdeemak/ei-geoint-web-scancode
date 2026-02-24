import { memo, PropsWithChildren, ReactNode, useCallback, useMemo } from 'react'
import classNames from 'classnames'
import { BasemapType, layerIdConfig } from './config/map'
import MapLibre from './MapLibre'
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material'
import useMapStore from './store/map'
import { BASEMAP } from '@deck.gl/carto'
import MapTools from './tools'
import Image from 'next/image'
import { createGoogleStyle } from './utils/google'
import { useTranslation } from 'react-i18next'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import TuneIcon from '@mui/icons-material/Tune'
import GoogleMapsPlacesSearch from '@/components/map/GoogleMapsPlaces'
import { GetProjectDtoOut } from '@interfaces/index'
import { LngLatBoundsLike } from 'maplibre-gl'

const CURRENT_LOCATION_ZOOM = 14

export interface MapViewProps extends PropsWithChildren {
  mapId: string
  printDetails?: {
    displayDialogTitle?: string | null
    organization?: {
      th: string
      en: string
    } | null
  } | null
  homeExtent?: LngLatBoundsLike | null
  loading?: boolean
  isShowBasicTools?: boolean
  isInteractive?: boolean
  isPaddingGoogle?: boolean
  isHideAttributionControl?: boolean
  floatingPanel?: ReactNode
  isShowOpenBtn?: boolean
  onPanelOpen?: () => void
  isShowLayerDetailsBtn?: boolean
  onShowLayerDetails?: () => void
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

export function MapView({
  children,
  mapId,
  printDetails,
  homeExtent,
  loading,
  isShowBasicTools = true,
  isInteractive = true,
  isPaddingGoogle = false,
  isHideAttributionControl = false,
  floatingPanel,
  isShowOpenBtn = false,
  onPanelOpen,
  isShowLayerDetailsBtn = false,
  onShowLayerDetails,
}: Readonly<MapViewProps>) {
  const { mapLibre, basemap, setBasemap } = useMapStore()

  const { t } = useTranslation('common')

  const mapStyle = useMemo(() => {
    if (basemap === BasemapType.CartoLight) {
      return BASEMAP.VOYAGER
    } else if (basemap === BasemapType.CartoDark) {
      return BASEMAP.DARK_MATTER
    } else if (basemap === BasemapType.GoogleSatellite) {
      return createGoogleStyle('google-satellite', 'satellite', GOOGLE_MAPS_API_KEY)
    } else if (basemap === BasemapType.GoogleHybrid) {
      return createGoogleStyle('google-hybrid', 'hybrid', GOOGLE_MAPS_API_KEY)
    } else {
      return BASEMAP.VOYAGER
    }
  }, [basemap])

  const onBasemapChanged = useCallback(
    (selectedBasemap: BasemapType) => {
      setBasemap(selectedBasemap)
    },
    [setBasemap],
  )

  const onGetLocation = useCallback(
    (coords: GeolocationCoordinates) => {
      const map = mapLibre[mapId]
      if (!map) return

      const sourceId = `${layerIdConfig.toolCurrentLocation}-source`
      const layerId = layerIdConfig.toolCurrentLocation

      // toggle off if already visible
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId)
      }

      const { latitude, longitude } = coords
      const point: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [longitude, latitude] },
            properties: {},
          },
        ],
      }

      map.addSource(sourceId, {
        type: 'geojson',
        data: point,
      })

      const ensurePinImage = () => {
        if (map.hasImage('current-pin')) return Promise.resolve()
        return new Promise<void>((resolve, reject) => {
          const img = document.createElement('img') as HTMLImageElement
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              if (!map.hasImage('current-pin')) {
                map.addImage('current-pin', img)
              }
              resolve()
            } catch (e) {
              reject(e as Error)
            }
          }
          img.onerror = () => {
            console.warn('Failed to load pin icon')
            reject(new Error('Failed to load pin icon'))
          }
          img.src = '/map/current.svg'
        })
      }

      ensurePinImage()
        .then(() => {
          if (!map.getLayer(layerId)) {
            map.addLayer(
              {
                id: layerId,
                type: 'symbol',
                source: sourceId,
                layout: {
                  'icon-image': 'current-pin',
                  'icon-size': 1,
                  'icon-allow-overlap': true,
                  'icon-anchor': 'bottom',
                },
              },
              layerIdConfig.basicTools,
            )
          }
        })
        .catch(() => null)

      map.flyTo({ center: [longitude, latitude], zoom: CURRENT_LOCATION_ZOOM, duration: 3000 })
    },
    [mapLibre, mapId],
  )

  return (
    <div className={classNames('relative flex h-full flex-1 overflow-hidden')}>
      {loading && (
        <CircularProgress
          size={16}
          className={classNames('absolute top-[145px] right-[50px] z-20 md:top-3 md:right-16', {
            '!text-[#fff]': basemap !== BasemapType.CartoLight,
          })}
        />
      )}

      {isShowBasicTools && (
        <Box className='z-30'>
          <MapTools
            homeExtent={homeExtent}
            mapId={mapId}
            printDetails={printDetails}
            onBasemapChanged={onBasemapChanged}
            onGetLocation={onGetLocation}
            currentBaseMap={basemap}
          />
        </Box>
      )}

      <Box className='pointer-events-none absolute top-4 right-4 left-4 z-20 flex items-center gap-2'>
        {isShowOpenBtn && (
          <Box className='!rounded-lg !bg-white !shadow-sm flex h-10 w-10 items-center justify-center border border-(--color-gray-border)'>
            <Tooltip title={t('button.openPanel')} arrow>
              <IconButton className='!h-8 !w-8 !p-0 pointer-events-auto' onClick={onPanelOpen}>
                <KeyboardArrowRightIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        {mapLibre[mapId] && isShowBasicTools && (
          <Box className='pointer-events-auto w-full rounded-lg md:max-w-80'>
            <GoogleMapsPlacesSearch map={mapLibre[mapId]} />
          </Box>
        )}
        {isShowLayerDetailsBtn && (
          <Box className='!rounded-lg !bg-white !shadow-sm flex h-10 w-10 items-center justify-center border border-(--color-gray-border)'>
            <Tooltip title={t('button.details')} arrow>
              <IconButton className='!h-8 !w-8 !p-0 pointer-events-auto' onClick={onShowLayerDetails}>
                <TuneIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {[BasemapType.GoogleSatellite, BasemapType.GoogleHybrid].includes(basemap) && (
        <Image
          src={'/images/map/google_on_non_white_hdpi.png'}
          width={59}
          height={18}
          className={classNames(
            `absolute z-[9] md:bottom-3 ${isPaddingGoogle ? 'left-[calc(50%+38px)]' : 'left-[calc(50%-29.5px)]'} ${isHideAttributionControl ? 'bottom-2' : 'bottom-[52px]'}`,
          )}
          alt={`Google Logo`}
        />
      )}
      <MapLibre
        mapId={mapId}
        mapStyle={mapStyle}
        isInteractive={isInteractive}
        isHideAttributionControl={isHideAttributionControl}
      />

      {floatingPanel && (
        <div className='pointer-events-none absolute inset-0 z-[110]'>
          <div className='absolute top-4 right-4 bottom-4 flex flex-col justify-start pointer-events-none'>
            <div className='pointer-events-auto max-h-full flex flex-col w-auto'>{floatingPanel}</div>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}

export default memo(MapView)
