import React, { useCallback, useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import { Box, IconButton, ButtonGroup, Tooltip } from '@mui/material'
import { MapZoomInIcon, MapZoomOutIcon } from '../svg/MenuIcon'
import { type BasemapType, layerIdConfig, thaiExtent } from '../config/map'
import useMapStore from '../store/map'
import AlertSnackbar, { type AlertInfoType } from '@/components/common/snackbar/AlertSnackbar'
import { useTranslation } from 'react-i18next'
import InfoIcon from '@mui/icons-material/Info'
import { useImages } from '../../images/use-images'
import useResponsive from '@/hook/responsive'
import Measurement from '@/components/map/Measurement'
import * as turf from '@turf/turf'
import { MeasurementIcon, SearchCoordinateIcon, CurrentLocationIcon, ThreeDIconMap } from '@/icons'
import PinPlacer from '@/components/map/PinPlacer'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import type maplibregl from 'maplibre-gl'
import type { GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl'
import CursorCoordinate from '@/components/map/CursorCoordinate'
import LayersIcon from '@mui/icons-material/Layers'
import BasemapSelector from '@/components/map/BasemapSelector'

import PrintIcon from '@mui/icons-material/Print'
import PrintMapExportMain, { type EndBoundsType } from '@/components/map/PrintMap'
import HomeFilledIcon from '@mui/icons-material/HomeFilled'

const CURRENT_LOCATION_RESULT_SOURCE = 'current-location-result-source'
const CURRENT_LOCATION_RESULT_LAYER = 'current-location-result-layer'
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
const DEM_URL = process.env.NEXT_PUBLIC_MAPTILER_DEM_URL

interface MapToolsProps {
  mapId: string
  homeExtent?: LngLatBoundsLike | null
  printDetails?: {
    displayDialogTitle?: string | null
    organization?: {
      th: string
      en: string
    } | null
  } | null
  onBasemapChanged?: (selectedBasemap: BasemapType) => void
  currentBaseMap: BasemapType
  onGetLocation?: (coords: GeolocationCoordinates) => void
}

const MapTools: React.FC<MapToolsProps> = ({
  mapId,
  homeExtent,
  printDetails,
  onBasemapChanged,
  currentBaseMap,
  onGetLocation,
}) => {
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const { mapLibre } = useMapStore()
  const { selectedImage, setShowImageDialog } = useImages()
  const { isLg, is2K } = useResponsive()

  const [showMeasurement, setShowMeasurement] = useState(false)
  const [showSearchCoordinate, setShowSearchCoordinate] = useState(false)
  const [showCurrentLocation, setShowCurrentLocation] = useState(false)
  const [showBasemapSelector, setShowBasemapSelector] = useState(false)
  const currentLocationFeaturesRef = React.useRef<GeoJSON.FeatureCollection | null>(null)
  const [is3D, setIs3D] = useState(false)
  const [showPrintMap, setShowPrintMap] = useState(false)
  const [exportBounds, setExportBounds] = useState<EndBoundsType | null>(null)
  const [exportGeometry, setExportGeometry] = useState<LngLatBoundsLike | null>(null)

  const [alertLocationInfo, setAlertLocationInfo] = useState<AlertInfoType>({
    open: false,
    severity: 'success',
    message: '',
  })

  const map = useMemo(() => mapLibre[mapId], [mapLibre, mapId])

  const registerStyleDataHandler = useMapStore((s) => s.registerStyleDataHandler)
  const unregisterStyleDataHandler = useMapStore((s) => s.unregisterStyleDataHandler)

  const handleZoomIn = useCallback(() => {
    if (map) {
      map.zoomIn({ duration: 200 })
    }
  }, [map])

  const handleZoomOut = useCallback(() => {
    if (map) {
      map.zoomOut({ duration: 200 })
    }
  }, [map])

  const handleBasemapChanged = useCallback(
    (selectedBasemap: BasemapType) => {
      if (selectedBasemap !== null) {
        onBasemapChanged?.(selectedBasemap)
      }
    },
    [onBasemapChanged],
  )

  const handleShowImage = useCallback(() => {
    // Implement logic to show image
    if (selectedImage) {
      setShowImageDialog(true)
    }
  }, [selectedImage, setShowImageDialog])

  const toggleCurrentLocation = useCallback(() => {
    setShowCurrentLocation((prev) => {
      if (map) {
        const source = map.getSource(CURRENT_LOCATION_RESULT_SOURCE) as GeoJSONSource
        const emptyData = {
          type: 'FeatureCollection' as const,
          features: [],
        }
        source?.setData(emptyData)
        const _showCurrentLocation = !prev
        if (_showCurrentLocation) {
          if (!navigator.geolocation) {
            showAlert({
              status: 'error',
              title: t('tools.currentLocationErrorTitle'),
              content: t('tools.locationServicesDisabled'),
            })
            return false
          }
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude, accuracy } = position.coords
              const point = turf.point([longitude, latitude])
              const circle = turf.circle(point, accuracy, {
                steps: 64,
                units: 'meters',
              })
              const locationData = {
                type: 'FeatureCollection' as const,
                features: [point, circle],
              }
              currentLocationFeaturesRef.current = locationData
              source?.setData(locationData)
              map.easeTo({ center: [longitude, latitude], zoom: 14 })
              onGetLocation?.(position.coords)
            },
            () => {
              showAlert({
                status: 'error',
                title: t('tools.currentLocationErrorTitle'),
                content: t('tools.cannotGetLocation'),
              })
              setShowCurrentLocation(false)
            },
            {
              timeout: 10000,
            },
          )
        } else {
          currentLocationFeaturesRef.current = null
        }
        return _showCurrentLocation
      } else {
        return false
      }
    })
  }, [t, showAlert, map, onGetLocation])

  useEffect(() => {
    if (!map) return

    // Initialize current location source
    if (!map.getSource(CURRENT_LOCATION_RESULT_SOURCE)) {
      map.addSource(CURRENT_LOCATION_RESULT_SOURCE, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })
      map.addLayer(
        {
          id: `${CURRENT_LOCATION_RESULT_LAYER}-radius`,
          type: 'fill',
          source: CURRENT_LOCATION_RESULT_SOURCE,
          paint: {
            'fill-color': '#0E94FA',
            'fill-opacity': 0.3,
          },
        },
        layerIdConfig.basicTools,
      )
      map.addLayer(
        {
          id: `${CURRENT_LOCATION_RESULT_LAYER}-circle`,
          type: 'circle',
          source: CURRENT_LOCATION_RESULT_SOURCE,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': 4,
            'circle-color': '#0E94FA',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        },
        layerIdConfig.basicTools,
      )
    }

    // register a handler so layers/sources are recreated when style reloads
    const handlerId = `map-tools-${mapId}`
    const handler = (m: maplibregl.Map) => {
      if (!m.getSource(CURRENT_LOCATION_RESULT_SOURCE)) {
        const initialData = currentLocationFeaturesRef.current ?? {
          type: 'FeatureCollection' as const,
          features: [],
        }
        m.addSource(CURRENT_LOCATION_RESULT_SOURCE, {
          type: 'geojson',
          data: initialData,
        })
      }
      if (!m.getLayer(`${CURRENT_LOCATION_RESULT_LAYER}-radius`)) {
        m.addLayer(
          {
            id: `${CURRENT_LOCATION_RESULT_LAYER}-radius`,
            type: 'fill',
            source: CURRENT_LOCATION_RESULT_SOURCE,
            paint: {
              'fill-color': '#0E94FA',
              'fill-opacity': 0.3,
            },
          },
          layerIdConfig.basicTools,
        )
      }
      if (!m.getLayer(`${CURRENT_LOCATION_RESULT_LAYER}-circle`)) {
        m.addLayer(
          {
            id: `${CURRENT_LOCATION_RESULT_LAYER}-circle`,
            type: 'circle',
            source: CURRENT_LOCATION_RESULT_SOURCE,
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
              'circle-radius': 4,
              'circle-color': '#0E94FA',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            },
          },
          layerIdConfig.basicTools,
        )
      }
    }

    registerStyleDataHandler(map, handlerId, handler)

    return () => {
      if (map.getLayer(`${CURRENT_LOCATION_RESULT_LAYER}-radius`))
        map.removeLayer(`${CURRENT_LOCATION_RESULT_LAYER}-radius`)
      if (map.getLayer(`${CURRENT_LOCATION_RESULT_LAYER}-circle`))
        map.removeLayer(`${CURRENT_LOCATION_RESULT_LAYER}-circle`)
      if (map.getSource(CURRENT_LOCATION_RESULT_SOURCE)) map.removeSource(CURRENT_LOCATION_RESULT_SOURCE)
      unregisterStyleDataHandler(map, `map-tools-${mapId}`)
    }
  }, [map, registerStyleDataHandler, unregisterStyleDataHandler, mapId])

  const closeTools = useCallback(() => {
    setShowMeasurement(false)
    setShowSearchCoordinate(false)
    setShowBasemapSelector(false)
  }, [])

  const enable3D = useCallback((m: maplibregl.Map) => {
    const DEM_SOURCE_ID = 'dem-source'
    if (!m.isStyleLoaded()) {
      m.once('style.load', () => enable3D(m))
      return
    }
    const demUrl = `${DEM_URL}?key=${MAPTILER_API_KEY}`
    if (!m.getSource(DEM_SOURCE_ID)) {
      m.addSource(DEM_SOURCE_ID, {
        type: 'raster-dem',
        url: demUrl,
        tileSize: 256,
        maxzoom: 15,
      })
    }

    m.setTerrain({
      source: DEM_SOURCE_ID,
      exaggeration: 1.5,
    })

    m.dragRotate.enable()
    m.touchZoomRotate.enableRotation()

    m.setMaxPitch(75)
    m.setMinPitch(20)

    m.easeTo({
      pitch: 70,
      bearing: -15,
      zoom: 13,
    })

    m.setLight({
      anchor: 'viewport',
      position: [1.5, 90, 80],
      intensity: 0.5,
    })
  }, [])

  const disable3D = useCallback((m: maplibregl.Map) => {
    m.dragRotate.disable()
    m.touchZoomRotate.disableRotation()

    m.setTerrain(null)

    m.setMinPitch(0)
    m.setMaxPitch(60)

    m.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 600,
    })
  }, [])

  const handleOpenPrintMap = useCallback(() => {
    if (!map) return

    const bounds = map.getBounds()
    setExportBounds({
      xmin: bounds.getWest(),
      xmax: bounds.getEast(),
      ymin: bounds.getSouth(),
      ymax: bounds.getNorth(),
    })
    setExportGeometry([
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()],
    ] as LngLatBoundsLike)
    setShowPrintMap(true)
    closeTools()
  }, [map, closeTools])

  return (
    <>
      {/* Tools Controls */}
      <Box className="map-tools [&_button]:bg-white''] pointer-events-none absolute right-0 bottom-0 left-0 z-10 flex flex-col items-end gap-2 px-4">
        <div className='absolute right-0 bottom-0 left-0 -z-1 h-20 bg-linear-to-b from-black/0 to-black/50' />
        <div className='pointer-events-auto flex flex-col gap-2 rounded-xl bg-[#003F7F] p-2 backdrop-blur-sm'>
          <div className='mobile-landscape-hidden flex flex-col gap-2'>
            {!isLg && selectedImage && (
              <Tooltip
                className='pointer-events-auto'
                title={t('tools.image')}
                slotProps={{
                  tooltip: { className: '!bg-white !text-xs !font-normal !text-black !px-3 !py-1.5' },
                  arrow: { className: '!text-white' },
                }}
                placement='left'
                arrow
              >
                <Box className='group !h-8 !w-8 !rounded-[3px] !bg-white !shadow-sm flex overflow-hidden transition-colors hover:bg-background-dark-blue'>
                  <IconButton className='!h-8 !w-8 !rounded-none !p-1.5 !bg-transparent grow' onClick={handleShowImage}>
                    <InfoIcon
                      sx={{ width: 20, height: 20, color: 'var(--color-text-icon-primary)' }}
                      className='group-hover:!text-white'
                    />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
            {homeExtent && (
              <Tooltip className='pointer-events-auto' title={t('tools.home')} placement='left' arrow>
                <div className='group rounded-[3px] bg-white shadow-sm transition-colors hover:bg-background-dark-blue'>
                  <IconButton
                    className='!p-1.5 !bg-transparent h-8 w-8'
                    onClick={() => {
                      if (!map) return

                      map.fitBounds(homeExtent, {
                        padding: 20,
                        duration: 1000,
                      })
                    }}
                  >
                    <HomeFilledIcon
                      sx={{ width: '1rem', height: '1rem', color: 'var(--color-text-icon-primary)' }}
                      className={'group-hover:!text-white'}
                    />
                  </IconButton>
                </div>
              </Tooltip>
            )}
            {printDetails && (
              <>
                <Tooltip className='pointer-events-auto' title={t('tools.export')} placement='left' arrow>
                  <div
                    className={classNames(
                      'group rounded-[3px] shadow-sm transition-colors hover:bg-background-dark-blue',
                      {
                        'bg-background-dark-blue': showPrintMap,
                        'bg-white': !showPrintMap,
                      },
                    )}
                  >
                    <IconButton
                      className='!p-1.5 !bg-transparent h-8 w-8'
                      onClick={() => {
                        handleOpenPrintMap()
                      }}
                    >
                      <PrintIcon
                        sx={{ width: '1rem', height: '1rem', color: 'var(--color-text-icon-primary)' }}
                        className={classNames('group-hover:!text-white', {
                          '!text-white': showPrintMap,
                        })}
                      />
                    </IconButton>
                  </div>
                </Tooltip>
                <PrintMapExportMain
                  id='print'
                  printDetails={printDetails}
                  defaultMapEndBounds={{
                    xmin: exportBounds?.xmin ?? (thaiExtent as number[])[0],
                    xmax: exportBounds?.xmax ?? (thaiExtent as number[])[2],
                    ymin: exportBounds?.ymin ?? (thaiExtent as number[])[1],
                    ymax: exportBounds?.ymax ?? (thaiExtent as number[])[3],
                  }}
                  defaultMiniMapExtent={thaiExtent}
                  mapGeometry={exportGeometry ?? thaiExtent}
                  isOpen={showPrintMap}
                  onOpenChange={setShowPrintMap}
                  sourceMapId={mapId}
                />
              </>
            )}

            <Tooltip className='pointer-events-auto' title={t('tools.measurement')} placement='left' arrow>
              <div
                className={classNames('group rounded-[3px] shadow-sm transition-colors hover:bg-background-dark-blue', {
                  'bg-background-dark-blue': showMeasurement,
                  'bg-white': !showMeasurement,
                })}
              >
                <IconButton
                  className='!p-1.5 !bg-transparent h-8 w-8'
                  onClick={() => {
                    setShowMeasurement((prev) => !prev)
                    if (showMeasurement) {
                      setShowMeasurement(false)
                    } else {
                      setShowSearchCoordinate(false)
                      setShowBasemapSelector(false)
                    }
                  }}
                >
                  <MeasurementIcon
                    className={classNames('group-hover:!text-white', {
                      '!text-white': showMeasurement,
                    })}
                    sx={{ width: 18, height: 18, color: 'var(--color-text-icon-primary)' }}
                  />
                </IconButton>
              </div>
            </Tooltip>
            <Tooltip className='pointer-events-auto' title={t('tools.searchCoordinate')} placement='left' arrow>
              <div
                className={classNames('group rounded-[3px] shadow-sm transition-colors hover:bg-background-dark-blue', {
                  'bg-background-dark-blue': showSearchCoordinate,
                  'bg-white': !showSearchCoordinate,
                })}
              >
                <IconButton
                  className='!p-1.5 !bg-transparent h-8 w-8'
                  onClick={() => {
                    setShowSearchCoordinate((prev) => !prev)
                    if (showSearchCoordinate) {
                      setShowSearchCoordinate(false)
                    } else {
                      setShowMeasurement(false)
                      setShowBasemapSelector(false)
                    }
                  }}
                >
                  <SearchCoordinateIcon
                    className={classNames('group-hover:!text-white', {
                      '!text-white': showSearchCoordinate,
                    })}
                    sx={{ width: 22, height: 22, color: 'var(--color-text-icon-primary)' }}
                  />
                </IconButton>
              </div>
            </Tooltip>
            <Tooltip className='pointer-events-auto' title={t('tools.currentLocation')} placement='left' arrow>
              <div
                className={classNames('group rounded-[3px] shadow-sm transition-colors hover:bg-background-dark-blue', {
                  'bg-background-dark-blue': showCurrentLocation,
                  'bg-white': !showCurrentLocation,
                })}
              >
                <IconButton
                  className='!h-8 !w-8 !rounded-none !p-1.5 !bg-transparent grow'
                  onClick={toggleCurrentLocation}
                >
                  <CurrentLocationIcon
                    className={classNames('group-hover:!text-white', {
                      '!text-white': showCurrentLocation,
                    })}
                    sx={{ width: 22, height: 22, color: 'var(--color-text-icon-primary)' }}
                  />
                </IconButton>
              </div>
            </Tooltip>

            <Tooltip className='pointer-events-auto' title={t('tools.3d')} placement='left' arrow>
              <div
                className={classNames('group rounded-[3px] shadow-sm transition-colors hover:bg-background-dark-blue', {
                  'bg-background-dark-blue': is3D,
                  'bg-white': !is3D,
                })}
              >
                <IconButton
                  className='!p-1.5 !bg-transparent h-8 w-8'
                  onClick={() => {
                    if (!map) return
                    setIs3D((prev) => {
                      const next = !prev
                      if (next) {
                        enable3D(map)
                      } else {
                        disable3D(map)
                      }
                      return next
                    })
                  }}
                >
                  <ThreeDIconMap
                    sx={{ width: 22, height: 22, color: 'var(--color-text-icon-primary)' }}
                    className={classNames('group-hover:!text-white', {
                      '!text-white': is3D,
                    })}
                  />
                </IconButton>
              </div>
            </Tooltip>

            <Tooltip className='pointer-events-auto' title={t('tools.basemap')} placement='left' arrow>
              <div
                className={classNames('group rounded-[3px] shadow-sm transition-colors hover:bg-background-dark-blue', {
                  'bg-background-dark-blue': showBasemapSelector,
                  'bg-white': !showBasemapSelector,
                })}
              >
                <IconButton
                  className='!p-1.5 !bg-transparent h-8 w-8'
                  onClick={() => {
                    setShowBasemapSelector((prev) => !prev)
                    if (showBasemapSelector) {
                      setShowBasemapSelector(false)
                    } else {
                      setShowMeasurement(false)
                      setShowSearchCoordinate(false)
                    }
                  }}
                >
                  <LayersIcon
                    className={classNames('group-hover:!text-white', {
                      '!text-white': showBasemapSelector,
                    })}
                    sx={{ width: '1rem', height: '1rem', color: 'var(--color-text-icon-primary)' }}
                  />
                </IconButton>
              </div>
            </Tooltip>
          </div>
          <Tooltip className='pointer-events-auto' title={t('tools.zoom')} placement='left' arrow>
            <ButtonGroup
              orientation='vertical'
              className='!h-16 !w-8 !rounded-[3px] !bg-white !shadow-sm flex items-center divide-y divide-solid divide-gray overflow-hidden'
            >
              <IconButton
                className='!h-8 !w-8 !rounded-none !p-1.5 !bg-white hover:!bg-background-dark-blue hover:!text-white grow transition-colors'
                onClick={handleZoomIn}
                sx={{ color: 'var(--color-text-icon-primary)' }}
              >
                <MapZoomInIcon width={is2K ? 16 : 12} height={is2K ? 16 : 12} />
              </IconButton>
              <IconButton
                className='!h-8 !w-8 !rounded-none !p-1.5 !bg-white hover:!bg-background-dark-blue hover:!text-white grow transition-colors'
                onClick={handleZoomOut}
                sx={{ color: 'var(--color-text-icon-primary)' }}
              >
                <MapZoomOutIcon width={is2K ? 16 : 12} height={is2K ? 16 : 12} />
              </IconButton>
            </ButtonGroup>
          </Tooltip>
        </div>
        <div className='pointer-events-auto pb-1'>{map && <CursorCoordinate map={map} />}</div>

        <div
          className={`absolute right-4 bottom-10 left-4 md:right-16 md:left-auto ${showMeasurement ? 'pointer-events-auto' : 'hidden'}`}
        >
          {map && <Measurement map={map} disabled={!showMeasurement} onMapClick={closeTools} onClose={closeTools} />}
        </div>
        <div
          className={`absolute right-4 bottom-10 left-4 md:right-16 md:left-auto ${showSearchCoordinate ? 'pointer-events-auto' : 'hidden'}`}
        >
          {map && <PinPlacer map={map} disabled={!showSearchCoordinate} onMapClick={closeTools} onClose={closeTools} />}
        </div>
        <div
          className={`absolute right-4 bottom-10 left-4 md:right-16 md:left-auto ${showBasemapSelector ? 'pointer-events-auto' : 'hidden'}`}
        >
          {map && (
            <BasemapSelector
              map={map}
              disabled={!showBasemapSelector}
              currentBasemap={currentBaseMap}
              onBasemapChanged={handleBasemapChanged}
              onMapClick={closeTools}
              onClose={closeTools}
            />
          )}
        </div>
      </Box>

      <AlertSnackbar
        alertInfo={alertLocationInfo}
        onClose={() => setAlertLocationInfo({ ...alertLocationInfo, open: false })}
      />
    </>
  )
}

export default MapTools
