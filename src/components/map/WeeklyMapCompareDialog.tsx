'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MapCompare, { CompareType } from '@/components/map/MapCompare'
import SyncedMaps from '@/components/map/SyncedMaps'
import { AppBar, Box, Button, Dialog, DialogProps, IconButton, Toolbar, useMediaQuery } from '@mui/material'
import theme from '@/styles/theme'
import CloseIcon from '@mui/icons-material/Close'
import createMapLibreLayersFromConfig from '@/components/shared/ProjectMapView/utils/maplibreLayerCreator'
import maplibregl, { LngLatBoundsLike } from 'maplibre-gl'
import type { Geometry } from 'geojson'
import {
  extractCoordinatesFromObject,
  extractPropertiesFromObject,
} from '@/components/shared/ProjectMapView/utils/helpers'
import { zoomToGeometries, zoomToThaiExtent } from '@/utils/geometry'
import FlipIcon from '@mui/icons-material/Flip'
import MultipleStopIcon from '@mui/icons-material/MultipleStop'
import { LayerConfig, MapType, VectorLayerConfig } from '@interfaces/config'
import { formatDate } from '@/utils/formatDate'
import PinnedDateChip from '../shared/ProjectMapView/weekly/PinnedDateChip'
import WeeklyMapCompareList from '../shared/ProjectMapView/weekly/WeeklyMapCompareList'
import { TaskFeature } from '@interfaces/index'
import { createHeatmap } from '@/components/shared/ProjectMapView/utils/heatmapCreator'
import { processWeeklyLayers } from '../shared/ProjectMapView/utils/weeklyLayerProcess'
import { useWeeklyMapStore, type ModelItem } from '../shared/ProjectMapView/weekly/store/useWeeklyMapStore'
import { useSettings } from '@/hook/useSettings'
import { layerIdConfig } from '../common/map/config/map'
import useResponsive from '@/hook/responsive'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export type WeeklyMapCompareDialogProps = DialogProps & {
  layerConfigs: LayerConfig[]
  /**
   * Controlled mode. When provided, the dialog will reflect this mode.
   * 'ChangeDetection' renders MapCompare, 'Compare' renders SyncedMaps.
   */
  mode?: 'ChangeDetection' | 'Compare'
  /**
   * Uncontrolled default mode if `mode` is not provided.
   */
  defaultMode?: 'ChangeDetection' | 'Compare'
  /**
   * Called when the mode changes due to internal button click.
   */
  onModeChange?: (mode: 'ChangeDetection' | 'Compare') => void
  /**
   * Initial extent to zoom the map to on load
   */
  initialExtent?: LngLatBoundsLike | null
}

type Mode = 'ChangeDetection' | 'Compare'

const getLeftPanelClassName = (isMobile: boolean, isLeftPanelOpen: boolean) => {
  if (isMobile && isLeftPanelOpen) {
    return 'absolute z-40 h-full w-full p-4 opacity-100'
  }
  if (isMobile && !isLeftPanelOpen) {
    return 'hidden w-0 min-w-0 overflow-hidden p-0 opacity-0'
  }
  return 'w-[30%] min-w-[384px] max-w-120 p-4 opacity-100'
}

type WeeklyCompareMapContentProps = {
  currentMode: Mode
  googleMapStyle: maplibregl.StyleSpecification
  selectedDate1: TaskFeature | null
  selectedDate2: TaskFeature | null
  language: string
  isMobile: boolean
  onLeftMapLoad: (map: maplibregl.Map) => void
  onRightMapLoad: (map: maplibregl.Map) => void
  onLeftMapStyleData: (event: maplibregl.MapStyleDataEvent) => void
  onRightMapStyleData: (event: maplibregl.MapStyleDataEvent) => void
  onDelete: (compareType: CompareType) => void
  onOpenLeftPanel: () => void
  onOpenRightPanel: () => void
}

const WeeklyCompareMapContent = ({
  currentMode,
  googleMapStyle,
  selectedDate1,
  selectedDate2,
  language,
  isMobile,
  onLeftMapLoad,
  onRightMapLoad,
  onLeftMapStyleData,
  onRightMapStyleData,
  onDelete,
  onOpenLeftPanel,
  onOpenRightPanel,
}: WeeklyCompareMapContentProps) => {
  const leftMapLabel = selectedDate2 ? `${formatDate(selectedDate2.date ?? '', language, true)}` : undefined
  const rightMapLabel = selectedDate1 ? `${formatDate(selectedDate1.date ?? '', language, true)}` : undefined

  if (currentMode === 'ChangeDetection') {
    return (
      <MapCompare
        leftMapStyle={googleMapStyle}
        rightMapStyle={googleMapStyle}
        leftMapLabel={leftMapLabel}
        rightMapLabel={rightMapLabel}
        onLeftMapLoad={onLeftMapLoad}
        onRightMapLoad={onRightMapLoad}
        onLeftMapStyleData={onLeftMapStyleData}
        onRightMapStyleData={onRightMapStyleData}
        isPinned={true}
        isMobile={isMobile}
        onSelectLeftMap={onOpenLeftPanel}
        onSelectRightMap={onOpenRightPanel}
        onDelete={onDelete}
      />
    )
  }

  return (
    <SyncedMaps
      leftMapStyle={googleMapStyle}
      rightMapStyle={googleMapStyle}
      leftMapLabel={leftMapLabel}
      rightMapLabel={rightMapLabel}
      onLeftMapLoad={onLeftMapLoad}
      onRightMapLoad={onRightMapLoad}
      onLeftMapStyleData={onLeftMapStyleData}
      onRightMapStyleData={onRightMapStyleData}
      isPinned={true}
      isMobile={isMobile}
      onSelectLeftMap={onOpenLeftPanel}
      onSelectRightMap={onOpenRightPanel}
      onDelete={onDelete}
    />
  )
}

const processMapLayers = (
  selectedDate: TaskFeature | null,
  selectedModels: ModelItem[],
  map: maplibregl.Map,
  handleFeatureClick: (
    map: maplibregl.Map,
  ) => (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => void,
  is2K?: boolean,
) => {
  const keyModelSelect = selectedModels.flatMap((m) => m.keys)
  const { allLayerConfigs, geometries } = processWeeklyLayers(
    {
      features: [
        {
          layer: selectedDate?.layer ?? [],
        },
      ],
    },
    keyModelSelect,
  )

  const tileConfigs = allLayerConfigs.filter((cfg) => cfg.type === MapType.tile)
  const vectorConfigs = allLayerConfigs.filter((cfg) => cfg.type === MapType.vector)
  const centroidHeatConfigs = allLayerConfigs.filter((c) => c.type === MapType.heatmap)

  for (const cfg of tileConfigs) {
    createMapLibreLayersFromConfig(cfg, { map, getClickInfo: handleFeatureClick(map) }, is2K)
  }

  for (const cfg of vectorConfigs) {
    createMapLibreLayersFromConfig(cfg, { map, getClickInfo: handleFeatureClick(map) }, is2K)
  }

  for (const cfg of centroidHeatConfigs) {
    const heatMapData = cfg as VectorLayerConfig
    const href = heatMapData.data
    const color = heatMapData?.color_code
    if (typeof href === 'string') {
      createHeatmap(map, cfg.id, href, color)
    }
  }

  return geometries
}

const zoomMapToExtent = (
  map: maplibregl.Map,
  storedExtent: LngLatBoundsLike | null,
  initialExtent: LngLatBoundsLike | null | undefined,
  geometries: Geometry[],
) => {
  // console.log('zooming to extent with storedExtent:', storedExtent, 'initialExtent:', initialExtent)
  const extentToUse = storedExtent ?? initialExtent ?? null
  if (extentToUse) {
    map.fitBounds(extentToUse, { padding: 20, animate: false })
  } else {
    const zoomResult = zoomToGeometries(geometries, map)
    if (!zoomResult.success) {
      zoomToThaiExtent(map)
    }
  }
}

const WeeklyMapCompareDialog: React.FC<WeeklyMapCompareDialogProps> = ({
  // layerConfigs,
  onClose,
  fullScreen = true,
  mode,
  defaultMode,
  onModeChange,
  open,
  initialExtent,
  ...dialogProps
}) => {
  const { t } = useTranslation('common')

  const [currentMode, setCurrentMode] = useState<Mode>((mode as Mode) ?? (defaultMode as Mode) ?? 'ChangeDetection')
  const [selectedDate1, setSelectedDate1] = useState<TaskFeature | null>(null)
  const [selectedDate2, setSelectedDate2] = useState<TaskFeature | null>(null)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(!isMobile)
  const leftMapRef = useRef<maplibregl.Map | null>(null)
  const rightMapRef = useRef<maplibregl.Map | null>(null)
  const storedExtentRef = useRef<LngLatBoundsLike | null>(null)
  const extentHandlerAttached = useRef(new WeakSet<maplibregl.Map>())
  const leftMoveEndHandlerRef = useRef<(() => void) | null>(null)
  const rightMoveEndHandlerRef = useRef<(() => void) | null>(null)

  const { language } = useSettings()
  const { selectedModels, selectedData } = useWeeklyMapStore()
  const { is2K } = useResponsive()

  // Sync when controlled `mode` prop changes
  useEffect(() => {
    if (mode !== undefined) {
      setCurrentMode(mode as Mode)
    }
  }, [mode])

  // Clear refs and remove handlers when dialog closes/unmounts
  useEffect(() => {
    if (open) return

    if (leftMapRef.current && leftMoveEndHandlerRef.current) {
      leftMapRef.current.off('moveend', leftMoveEndHandlerRef.current)
    }
    if (rightMapRef.current && rightMoveEndHandlerRef.current) {
      rightMapRef.current.off('moveend', rightMoveEndHandlerRef.current)
    }

    leftMoveEndHandlerRef.current = null
    rightMoveEndHandlerRef.current = null
    leftMapRef.current = null
    rightMapRef.current = null
    storedExtentRef.current = null
  }, [open])

  // When uncontrolled (no `mode` prop), reset to `defaultMode` whenever
  // the dialog is opened or the defaultMode changes. This ensures that
  // reopening the dialog reflects the latest intended default.
  useEffect(() => {
    if (mode === undefined && open) {
      setCurrentMode((defaultMode as Mode) ?? 'ChangeDetection')
    }
  }, [open, defaultMode, mode])

  useEffect(() => {
    if (selectedData && open) {
      setSelectedDate1(selectedData)
      setSelectedDate2(null)
    }
  }, [selectedData, open])

  const handleDeleteCompare = (compareType: CompareType) => {
    if (compareType === CompareType.left) {
      // Clear selectedDate2 regardless of selectedDate1
      setSelectedDate2(null)
    }
    if (compareType === CompareType.right) {
      if (selectedDate2) {
        // If both dates exist, move selectedDate2 to selectedDate1 and clear selectedDate2
        setSelectedDate1(selectedDate2)
        setSelectedDate2(null)
      } else {
        // If only selectedDate1 exists, clear everything
        setSelectedDate1(null)
      }
    }
  }

  const handleDateSelect = (data: TaskFeature) => {
    if (selectedDate1?.date === data.date) {
      setSelectedDate1(selectedDate2)
      setSelectedDate2(null)
    } else if (selectedDate2?.date === data.date) {
      setSelectedDate2(null)
    } else if (!selectedDate1) {
      setSelectedDate1(data)
    } else if (!selectedDate2) {
      setSelectedDate2(data)
    }

    if (isMobile) {
      setIsLeftPanelOpen(false)
    }
  }

  const handleOnStyleData = useCallback((event: maplibregl.MapStyleDataEvent) => {
    // add reference layer for all deck.gl layer under this layer and display draw layer to top
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
  }, [])

  const handleFeatureClick = useCallback(
    (map: maplibregl.Map) => (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => {
      let coord = lngLat
      if (coord?.length !== 2) {
        coord = extractCoordinatesFromObject(object)
      }
      const props = extractPropertiesFromObject(object)
      if (props && coord) {
        const lines = Object.entries(props)
          .map(([k, v]) => `<div><strong>${k}:</strong> ${String(v)}</div>`)
          .join('')
        new maplibregl.Popup({
          closeButton: false,
          offset: 10,
          className: 'min-w-40 z-10 w-auto! max-w-sm! break-words',
        })
          .setLngLat(coord)
          .setHTML(`<div>${lines}</div>`)
          .addTo(map)
      }
    },
    [],
  )

  const storeExtentFromMap = useCallback((map: maplibregl.Map) => {
    const bounds = map.getBounds()
    storedExtentRef.current = [
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()],
    ]
  }, [])

  const handleOnLeftMapLoad = useCallback(
    (map: maplibregl.Map) => {
      leftMapRef.current = map
      // console.log('Left map loaded zooming')
      if (!extentHandlerAttached.current.has(map)) {
        // console.log('Left map loaded zooming extentHandlerAttached', extentHandlerAttached)
        const handler = () => storeExtentFromMap(map)
        leftMoveEndHandlerRef.current = handler
        map.on('moveend', handler)
        extentHandlerAttached.current.add(map)
      }

      const geometries = processMapLayers(selectedDate2, selectedModels, map, handleFeatureClick, is2K)

      const timeout = isMobile ? 1000 : 0
      setTimeout(() => {
        // console.log('Left map zooming to extent')
        zoomMapToExtent(map, storedExtentRef.current, initialExtent, geometries)
      }, timeout)
    },
    [isMobile, selectedDate2, selectedModels, handleFeatureClick, initialExtent, storeExtentFromMap, is2K],
  )

  const handleOnRightMapLoad = useCallback(
    (map: maplibregl.Map) => {
      rightMapRef.current = map
      // console.log('Right map loaded zooming')
      if (!extentHandlerAttached.current.has(map)) {
        // console.log('Right map loaded zooming extentHandlerAttached', extentHandlerAttached)
        const handler = () => storeExtentFromMap(map)
        rightMoveEndHandlerRef.current = handler
        map.on('moveend', handler)
        extentHandlerAttached.current.add(map)
      }

      const geometries = processMapLayers(selectedDate1, selectedModels, map, handleFeatureClick, is2K)

      const timeout = isMobile ? 1000 : 0
      setTimeout(() => {
        // console.log('Right map zooming to extent')
        zoomMapToExtent(map, storedExtentRef.current, initialExtent, geometries)
      }, timeout)
    },
    [isMobile, selectedDate1, selectedModels, handleFeatureClick, initialExtent, storeExtentFromMap, is2K],
  )

  const googleMapStyle = useMemo<maplibregl.StyleSpecification>(
    () => ({
      version: 8,
      glyphs: '/maplibre-glyphs/{fontstack}/{range}.pbf',
      sources: {
        'google-2d': {
          type: 'raster',
          tiles: [`https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_API_KEY}`],
          tileSize: 256,
          attribution: '© Google',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'google-2d',
          type: 'raster',
          source: 'google-2d',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    }),
    [],
  )
  const handleModeChange = (m: Mode) => {
    if (mode === undefined) {
      // uncontrolled, update internal state
      setCurrentMode(m)
    }
    // notify parent in either controlled or uncontrolled modes
    onModeChange?.(m)
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} {...dialogProps}>
      <AppBar position='relative'>
        <Toolbar variant='dense'>
          <IconButton edge='start' color='inherit' onClick={(e) => onClose?.(e as unknown as object, 'escapeKeyDown')}>
            <CloseIcon />
          </IconButton>
          <div className='px-4'>{t('dialog.mapCompare.title')}</div>
        </Toolbar>
      </AppBar>
      <div className='flex h-full w-full overflow-y-hidden'>
        <Box
          className={`all 300ms bg-white transition-all duration-300 ease-in-out ${getLeftPanelClassName(isMobile, isLeftPanelOpen)}`}
        >
          {isMobile && (
            <Box className='flex flex-col'>
              <Box className='flex justify-end p-2 pb-0'>
                <IconButton size='small' onClick={() => setIsLeftPanelOpen(false)}>
                  <CloseIcon fontSize='small' />
                </IconButton>
              </Box>
            </Box>
          )}

          <div className='mb-2 flex w-full items-center justify-between'>
            <span className='font-bold text-(--color-text-primary)'> {t('dialog.weeklyMapCompare.selectDate')}</span>
          </div>
          {/* <Box sx={{ display: 'flex', gap: 1, mb: 2 }}> */}
          <Box sx={{ display: 'none', gap: 1, mb: 2 }}>
            {selectedDate2 && (
              <PinnedDateChip
                date={selectedDate2.date || ''}
                onDelete={() => {
                  setSelectedDate2(null)
                }}
              />
            )}
            {selectedDate1 && (
              <PinnedDateChip
                date={selectedDate1.date || ''}
                onDelete={() => {
                  if (selectedDate2) {
                    // If both dates exist, move selectedDate2 to selectedDate1 and clear selectedDate2
                    setSelectedDate1(selectedDate2)
                    setSelectedDate2(null)
                  } else {
                    // If only selectedDate1 exists, clear everything
                    setSelectedDate1(null)
                  }
                }}
              />
            )}
          </Box>
          <div className='h-full overflow-y-auto pb-8'>
            <WeeklyMapCompareList
              onDateSelect={handleDateSelect}
              selectedDate1={selectedDate1}
              selectedDate2={selectedDate2}
            />
          </div>
        </Box>
        <div className='flex h-full min-h-0 w-full flex-col'>
          <div className='flex shrink-0 gap-2 p-2 pl-6'>
            <Button
              variant={currentMode === 'ChangeDetection' ? 'contained' : 'outlined'}
              className='border-(--color-gray-border)!'
              startIcon={<FlipIcon />}
              onClick={() => handleModeChange('ChangeDetection')}
            >
              {t('dialog.mapCompare.changeDetectionButton')}
            </Button>
            <Button
              variant={currentMode === 'Compare' ? 'contained' : 'outlined'}
              className='border-(--color-gray-border)!'
              startIcon={<MultipleStopIcon />}
              onClick={() => handleModeChange('Compare')}
            >
              {t('dialog.mapCompare.compareButton')}
            </Button>
          </div>

          <div className='min-h-0 flex-1'>
            <WeeklyCompareMapContent
              currentMode={currentMode}
              googleMapStyle={googleMapStyle}
              selectedDate1={selectedDate1}
              selectedDate2={selectedDate2}
              language={language}
              isMobile={isMobile}
              onLeftMapLoad={handleOnLeftMapLoad}
              onRightMapLoad={handleOnRightMapLoad}
              onLeftMapStyleData={handleOnStyleData}
              onRightMapStyleData={handleOnStyleData}
              onDelete={handleDeleteCompare}
              onOpenLeftPanel={() => setIsLeftPanelOpen(true)}
              onOpenRightPanel={() => setIsLeftPanelOpen(true)}
            />
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default WeeklyMapCompareDialog
