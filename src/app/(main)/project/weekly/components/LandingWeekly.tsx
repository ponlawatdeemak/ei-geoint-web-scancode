'use client'

import React, { use, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import maplibregl, { LngLatBoundsLike } from 'maplibre-gl'
import { useQuery } from '@tanstack/react-query'
import { Box, useMediaQuery, Tooltip, IconButton } from '@mui/material'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'

import CloseIcon from '@mui/icons-material/Close'
import service from '@/api'
import { LayerConfig } from '@interfaces/index'
import theme from '@/styles/theme'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useMapStore } from '@/components/common/map/store/map'
import { MapView } from '@/components/common/map/MapView'
import LoadingScreen from '@/components/common/loading/LoadingScreen'
import Weekly from '@/components/shared/ProjectMapView/weekly'
import WeeklyPanelControls from '@/components/shared/ProjectMapView/WeeklyPanelControls'
import { useWeeklyMapStore } from '@/components/shared/ProjectMapView/weekly/store/useWeeklyMapStore'

/**
 * Converts a GeoJSON geometry to LngLatBoundsLike format
 * Supports bbox property, Point, and other geometry types
 */
const getGeometryBounds = (geometry: any): LngLatBoundsLike => {
  if (geometry.bbox && Array.isArray(geometry.bbox)) {
    const [minLng, minLat, maxLng, maxLat] = geometry.bbox
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ]
  }

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates
    return [
      [lng, lat],
      [lng, lat],
    ]
  }

  const getAllCoordinates = (coords: any[]): number[][] => {
    if (typeof coords[0] === 'number') {
      return [coords as number[]]
    }
    return coords.flatMap((c) => getAllCoordinates(c))
  }

  const allCoords = getAllCoordinates(geometry.coordinates)
  const lngs = allCoords.map((c) => c[0])
  const lats = allCoords.map((c) => c[1])

  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

const LandingWeekly: React.FC = () => {
  // Hooks
  const { t } = useTranslation('common')
  const { showLoading, hideLoading } = useGlobalUI()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { mapLibre } = useMapStore()

  // Constants
  const mapId = 'weekly-map'

  // State
  const [showPanelLeft, setShowPanelLeft] = useState(!isMobile)
  const [isWeeklyPanelOpen, setIsWeeklyPanelOpen] = useState(false)
  const [weeklyOverlay, setWeeklyOverlay] = useState<ReactNode>(null)
  const [currentMapExtent, setCurrentMapExtent] = useState<LngLatBoundsLike | null>(null)
  const [homeExtent, setHomeExtent] = useState<LngLatBoundsLike | null>(null)
  const [weeklyCompareDialogConfig, setWeeklyCompareDialogConfig] = useState({
    open: false,
    layerConfigs: [] as LayerConfig[],
    defaultMode: 'ChangeDetection' as 'ChangeDetection' | 'Compare',
  })

  const { loading } = useWeeklyMapStore()

  // Queries
  const { data: weeklySubscriptionModel, isLoading: isLoadingWeeklySubscriptionModel } = useQuery({
    queryKey: ['weekly-subscription-model'],
    queryFn: async () => {
      try {
        return await service.weekly.getSubscriptionModel()
      } catch (error) {
        hideLoading()
        throw error
      }
    },
    retry: false,
  })

  // Map instance
  const map = mapLibre[mapId] as maplibregl.Map

  // Effects
  useEffect(() => {
    if (!map) return

    const handleMoveEnd = () => {
      const bounds = map.getBounds()
      const extent: LngLatBoundsLike = [
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getEast(), bounds.getNorth()],
      ]
      setCurrentMapExtent(extent)
    }

    map.on('moveend', handleMoveEnd)
    handleMoveEnd()

    return () => {
      map.off('moveend', handleMoveEnd)
    }
  }, [map])

  useEffect(() => {
    if (loading && isMobile) {
      showLoading()
    } else {
      hideLoading()
    }
  }, [loading, hideLoading, showLoading, isMobile])

  return (
    <Box className='flex h-full w-full grow'>
      {isLoadingWeeklySubscriptionModel ? (
        <div className='flex h-full flex-col items-center justify-center'>
          <LoadingScreen />
        </div>
      ) : (
        <Box className='relative flex min-h-0 w-full flex-row overflow-hidden'>
          <Box
            className={`all 300ms bg-white transition-all duration-300 ${
              isMobile ? 'flex h-full w-full flex-col' : 'flex-none overflow-visible'
            }`}
            sx={{
              position: isMobile ? 'absolute' : 'relative',
              zIndex: isMobile ? (showPanelLeft ? 40 : -1) : 20,
              width: isMobile ? (showPanelLeft ? '100%' : '0') : showPanelLeft ? '30%' : '0',
              maxWidth: isMobile ? 'auto' : showPanelLeft ? '480px' : '0',
              minWidth: isMobile ? '0' : showPanelLeft ? '384px' : '0',
              opacity: showPanelLeft ? 1 : 0,
              pointerEvents: showPanelLeft ? 'auto' : 'none',
            }}
          >
            {isMobile && (
              <Box className='flex flex-col'>
                <Box className='flex justify-end p-2 pb-0'>
                  <IconButton onClick={() => setShowPanelLeft(false)} size='small'>
                    <CloseIcon fontSize='small' />
                  </IconButton>
                </Box>{' '}
              </Box>
            )}

            <Box
              className={
                isMobile
                  ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-4 pt-2 pb-6'
                  : 'flex h-full min-h-0 flex-col bg-white p-4 pt-2 pb-2 md:pt-4'
              }
            >
              <div className={`flex w-full flex-col`}>
                <div className='flex w-full items-center justify-between'>
                  <span className='font-bold text-(--color-text-primary)'>{t('map.weekly')}</span>
                  {!isMobile && (
                    <Box className='flex h-10 w-10 items-center justify-center rounded-lg! bg-(--color-background-light)!'>
                      <Tooltip title={t('button.closePanel')} placement='left' arrow>
                        <IconButton onClick={() => setShowPanelLeft(false)} className='h-8! w-8! p-0!'>
                          <KeyboardArrowLeftIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </div>
              </div>

              <div className='min-h-0 flex-1 overflow-y-auto'>
                <Weekly
                  weeklySubscriptionModel={weeklySubscriptionModel ?? []}
                  mapId={mapId}
                  onSelected={(data) => {
                    setIsWeeklyPanelOpen(true)

                    if (data.length > 0 && data[0].geometry) {
                      const g = data[0].geometry

                      setHomeExtent(getGeometryBounds(g))
                    }
                  }}
                  onRenderOverlay={setWeeklyOverlay}
                  isPanelOpen={isWeeklyPanelOpen}
                  setIsPanelOpen={setIsWeeklyPanelOpen}
                />
              </div>
            </Box>
          </Box>

          <Box className='relative h-full min-w-0 flex-1'>
            <MapView
              mapId={mapId}
              homeExtent={homeExtent}
              printDetails={{
                displayDialogTitle: null,
                organization: null,
              }}
              isShowOpenBtn={!showPanelLeft}
              isShowLayerDetailsBtn={isMobile}
              onPanelOpen={() => {
                setShowPanelLeft(true)

                if (isMobile) {
                  setIsWeeklyPanelOpen(false)
                }
              }}
              onShowLayerDetails={() => {
                setIsWeeklyPanelOpen(true)
              }}
              floatingPanel={
                <Box className='fixed bottom-8 left-1/2 z-35 w-[90%] -translate-x-1/2 pr-[8%] sm:pr-[6%] md:relative md:bottom-auto md:left-auto md:w-[450px] md:translate-x-0 md:pr-0'>
                  {weeklyOverlay}
                </Box>
              }
            ></MapView>

            <WeeklyPanelControls
              currentMapExtent={currentMapExtent}
              t={t}
              weeklyCompareDialogConfig={weeklyCompareDialogConfig}
              setWeeklyCompareDialogConfig={setWeeklyCompareDialogConfig}
            />
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default LandingWeekly
