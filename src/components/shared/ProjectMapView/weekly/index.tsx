import {
  GetModelSubscriptionWeeklyDtoOut,
  LayerConfig,
  MapType,
  TaskLayer,
  VectorLayerConfig,
  ProjectMapViewGroup,
  GetModelAllDtoOut,
} from '@interfaces/index'

import { useWeeklyMapStore } from './store/useWeeklyMapStore'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import SearchContainer from './SearchContainer'
import dayjs from 'dayjs'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import useMapStore from '@/components/common/map/store/map'
import createMapLibreLayersFromConfig, { CreatedMapLibreLayers } from '../utils/maplibreLayerCreator'
import maplibregl from 'maplibre-gl'
import LayerControls from '../layer/LayerControls'
import { Box, useMediaQuery } from '@mui/material'
import theme from '@/styles/theme'
import { FloatingPanel } from '@/components/common/map/FloatingPanel'
import { useQuery } from '@tanstack/react-query'
import service from '@/api'
import { useTranslation } from 'react-i18next'
import { formatDate, isDateString } from '@/utils/formatDate'
import { useSettings } from '@/hook/useSettings'
import type { Root } from 'react-dom/client'
import {
  buildDisplayModelName,
  extractConfidenceNum,
  extractCoordinatesFromObject,
  extractPropertiesFromObject,
} from '../utils/helpers'
import { zoomToGeometries } from '@/utils/geometry'
import { processWeeklyLayers } from '../utils/weeklyLayerProcess'
import { createHeatmap } from '../utils/heatmapCreator'
import DateRangeIcon from '@mui/icons-material/DateRange'
import useResponsive from '@/hook/responsive'

type WeeklyProps = {
  onSelected?: (data: TaskLayer[]) => void
  weeklySubscriptionModel: GetModelSubscriptionWeeklyDtoOut[]
  mapId: string
  onRenderOverlay?: (node: ReactNode | null) => void
  isPanelOpen: boolean
  setIsPanelOpen: (value: boolean) => void
}

const Weekly: React.FC<WeeklyProps> = ({
  onSelected,
  weeklySubscriptionModel,
  mapId,
  onRenderOverlay,
  isPanelOpen,
  setIsPanelOpen,
}) => {
  const {
    initialize,
    setStartDate,
    setEndDate,
    search,
    selectedAreas,
    selectedModels,
    data,
    isZoom,
    isOpenWeeklyGroupPanel,
    setIsZoom,
  } = useWeeklyMapStore()
  const { mapLibre } = useMapStore()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const { t, i18n } = useTranslation('common')
  const didInitialSearch = useRef(false)
  const { is2K } = useResponsive()

  const [layerList, setLayerList] = useState<ProjectMapViewGroup[]>([])
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({})
  const [thresholds, setThresholds] = useState<Record<string, [number, number]>>({})
  const [selectedGroup, setSelectedGroup] = useState<ProjectMapViewGroup | null>(null)
  const [isPanelMinimized, setIsPanelMinimized] = useState(false)
  // const [layerConfig, setLayerConfig] = useState<LayerConfig[] | null>(null)
  const { language } = useSettings()
  const activePopupRef = useRef<maplibregl.Popup | null>(null)
  const activePopupRootRef = useRef<Root | null>(null)
  const createdLayersRef = useRef<Map<string, CreatedMapLibreLayers>>(new Map())
  const heatmapCleanupRef = useRef<Map<string, () => void>>(new Map())
  const thresholdsRef = useRef<Record<string, [number, number]>>(thresholds)
  const visibilityRef = useRef<Record<string, boolean>>(layerVisibility)
  const { data: modelAll } = useQuery({
    queryKey: ['model-all'],
    queryFn: async () => {
      const models = await service.lookup.getModelAll()
      return models
    },
  })
  // map instance
  const map = useMemo(() => mapLibre[mapId], [mapLibre, mapId])

  const findModelByKeyOrName = useCallback(
    (key: string): GetModelAllDtoOut | undefined => {
      if (!Array.isArray(modelAll) || modelAll.length === 0 || !key) return undefined
      return modelAll.find((m) => m.key === key || m.modelName === key)
    },
    [modelAll],
  )

  // Remove layer and source from map by layer ID
  const removeLayerFromMap = useCallback(
    (layerId: string) => {
      if (!map) return

      try {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId)
        }
      } catch (e) {
        // Layer might not exist
      }

      try {
        if (map.getSource(layerId)) {
          map.removeSource(layerId)
        }
      } catch (e) {
        // Source might not exist
      }
    },
    [map],
  )

  // Clear all created layers and heatmap layers from map
  const clearAllCreatedLayers = useCallback(() => {
    const prevCreated = createdLayersRef.current
    const heatmapCleanup = heatmapCleanupRef.current

    // Remove heatmaps (unregister handler + remove layer/source)
    if (heatmapCleanup && heatmapCleanup.size > 0) {
      for (const [, cleanup] of heatmapCleanup) {
        try {
          cleanup()
        } catch (e) {
          // ignore cleanup errors
        }
      }
      heatmapCleanup.clear()
    }

    // Remove created layers
    if (prevCreated && prevCreated.size > 0) {
      for (const [layerId, created] of prevCreated) {
        try {
          removeLayerFromMap(layerId)
          created.cleanup()
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('weekly: cleanup previous created layers failed', e)
        }
      }
      prevCreated.clear()
    }

    // Remove heatmap layers/sources created via createHeatmap (ids like `${id}-heat` / `${id}-src`)
    if (map) {
      const styleLayers = map.getStyle()?.layers ?? []
      styleLayers
        .filter((l) => l.type === 'heatmap' && l.id.endsWith('-heat'))
        .forEach((l) => {
          try {
            map.removeLayer(l.id)
          } catch {
            // ignore missing
          }
          const srcId = l.id.replace(/-heat$/, '-src')
          try {
            if (map.getSource(srcId)) map.removeSource(srcId)
          } catch {
            // ignore missing
          }
        })
    }
  }, [removeLayerFromMap, map])
  // Clear all weekly data and layers
  const clearWeeklyData = useCallback(() => {
    setSelectedGroup(null)
    setIsPanelOpen(false)
    clearAllCreatedLayers()
  }, [clearAllCreatedLayers, setIsPanelOpen])

  useEffect(() => {
    initialize(weeklySubscriptionModel)
  }, [weeklySubscriptionModel, initialize])

  useEffect(() => {
    if (!data || data.length === 0) {
      clearWeeklyData()
    }
  }, [data, clearWeeklyData])

  // Effect for setting initial dates and running the first search
  useEffect(() => {
    // This runs when selectedAreas changes, or on mount
    if (selectedAreas.length > 0 && !didInitialSearch.current) {
      // Check if dates are already initialized in the store (e.g. from a previous mount)
      // This prevents re-triggering search when navigating back/remounting while keeping state
      const { startDate, endDate } = useWeeklyMapStore.getState()

      // Removed data check to be safer - if dates are set, we assume initialized.
      if (startDate && endDate) {
        didInitialSearch.current = true
        return
      }

      didInitialSearch.current = true

      // // TODO: set for test
      const initialStartDate = dayjs().subtract(2, 'month').startOf('month')
      setStartDate(initialStartDate)
      // setEndDate(dayjs().endOf('month'))

      // setStartDate(dayjs().startOf('month'))
      setEndDate(dayjs())
      search()
    }
  }, [selectedAreas, setStartDate, setEndDate, search])

  // Helper: render popup with React component
  const renderPopup = useCallback(
    (coord: [number, number], data: Record<string, unknown>, map: maplibregl.Map) => {
      const node = document.createElement('div')
      const displayModelName = buildDisplayModelName(data, modelAll, i18n.language)
      const confidenceNum = extractConfidenceNum(data)
      const areaValue = typeof data.area !== 'undefined' ? ((data.area as number) ?? 0) : undefined

      Promise.all([
        import('react-dom/client'),
        import('@mui/material/styles'),
        import('@/styles/theme'),
        import('react-i18next'),
        import('@/i18n/i18next'),
        import('@/components/common/map/utils/Tooltip'),
      ])
        .then(([{ createRoot }, { ThemeProvider }, themeModule, { I18nextProvider }, i18nModule, TooltipModule]) => {
          node.style.minWidth = '240px'

          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 40,
          })
            .setLngLat(coord)
            .setDOMContent(node)
            .addTo(map)

          const root = createRoot(node)
          const theme = themeModule.default
          const i18nInst = i18nModule.default

          const task = (data.task ?? {}) as Record<string, unknown> | undefined
          const hoverInfo = {
            x: 0,
            y: 0,
            modelName: displayModelName,
            taskName: typeof task?.name === 'string' ? (task.name as string) : '',
            confidence: confidenceNum,
            area: areaValue,
            aoiName: typeof data?.aoi_name === 'string' ? (data.aoi_name as string) : null,
          }

          root.render(
            <ThemeProvider theme={theme}>
              <I18nextProvider i18n={i18nInst}>
                <TooltipModule.default
                  hoverInfo={hoverInfo}
                  onClose={() => {
                    try {
                      popup.remove()
                    } catch (e) {
                      // log but continue
                      // eslint-disable-next-line no-console
                      console.warn('popup.remove failed', e)
                    }
                    try {
                      root.unmount()
                    } catch (e) {
                      // eslint-disable-next-line no-console
                      console.warn('root.unmount failed', e)
                    }
                    activePopupRef.current = null
                    activePopupRootRef.current = null
                  }}
                />
              </I18nextProvider>
            </ThemeProvider>,
          )

          activePopupRef.current = popup
          activePopupRootRef.current = root

          try {
            const popupAny = popup as unknown as { on?: (event: string, cb: () => void) => void }
            if (typeof popupAny.on === 'function') popupAny.on('close', () => root.unmount())
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('attach popup close handler failed', e)
          }
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('Failed to render React tooltip in popup, falling back to HTML', err)
        })
    },
    [modelAll, i18n.language],
  )

  const closeActivePopup = useCallback(() => {
    try {
      if (activePopupRootRef.current && typeof activePopupRootRef.current.unmount === 'function') {
        activePopupRootRef.current.unmount()
      }
    } catch {
      // ignore
    }
    try {
      if (activePopupRef.current) {
        activePopupRef.current.remove()
      }
    } catch {
      // ignore
    }
    activePopupRef.current = null
    activePopupRootRef.current = null
  }, [])

  const handleThresholdChange = useCallback((id: string, value: number | number[]) => {
    const range: [number, number] = Array.isArray(value) && value.length >= 2 ? [value[0], value[1]] : [0, 100]
    setThresholds((prev) => ({ ...prev, [id]: range }))
  }, [])

  useEffect(() => {
    thresholdsRef.current = thresholds
  }, [thresholds])

  useEffect(() => {
    visibilityRef.current = layerVisibility
  }, [layerVisibility])

  // Render overlay JSX
  const overlayContent = useMemo(() => {
    if (!selectedGroup || !isPanelOpen) {
      return null
    }

    return (
      <Box className='absolute bottom-0 left-1/2 z-[105] w-[90%] -translate-x-1/2 sm:w-[95%] md:top-0 md:bottom-auto md:left-auto md:w-112.5 md:-translate-x-0'>
        <FloatingPanel
          icon={
            <span
              className={
                'inline-flex h-3.5 min-h-3.5 w-3.5 min-w-3.5 items-center justify-center rounded-[3px] align-middle text-(--color-text-icon)'
              }
            >
              <DateRangeIcon fontSize='small' />
            </span>
          }
          title={
            isDateString(selectedGroup.groupName)
              ? formatDate(selectedGroup.groupName, language, true)
              : selectedGroup.groupName
          }
          isOpen={isPanelOpen}
          isMinimized={isPanelMinimized}
          isMobile={isMobile}
          onClose={() => {
            setIsPanelOpen(false)
            // setSelectedGroup(null)
          }}
          onToggleMinimize={() => setIsPanelMinimized(!isPanelMinimized)}
        >
          <LayerControls
            selectedGroup={selectedGroup.groupId}
            group={layerList.find((g) => g.groupId === selectedGroup.groupId)}
            findModelByKeyOrName={findModelByKeyOrName}
            thresholds={thresholds}
            handleThresholdChange={handleThresholdChange}
          />
        </FloatingPanel>
      </Box>
    )
  }, [
    selectedGroup,
    isPanelOpen,
    isPanelMinimized,
    layerList,
    language,
    findModelByKeyOrName,
    thresholds,
    handleThresholdChange,
    setIsPanelOpen,
    isMobile,
  ])

  useEffect(() => {
    onRenderOverlay?.(overlayContent)
  }, [overlayContent, onRenderOverlay])

  useEffect(() => {
    return () => {
      onRenderOverlay?.(null)
    }
  }, [onRenderOverlay])

  // Cleanup all Weekly-created layers and popups when this page unmounts
  useEffect(() => {
    return () => {
      try {
        clearAllCreatedLayers()
      } catch {}
      try {
        closeActivePopup()
      } catch {}
    }
  }, [clearAllCreatedLayers, closeActivePopup])

  // click handler: show MapLibre popup at lng/lat
  const handleFeatureClick = useCallback(
    (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => {
      closeActivePopup()

      if (!map) return

      let coord = lngLat
      if (coord?.length !== 2) {
        coord = extractCoordinatesFromObject(object)
      }

      if (coord?.length !== 2) return

      try {
        const data = extractPropertiesFromObject(object)
        // autoOpenGroupPanel(data)
        renderPopup(coord, data, map)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to show popup', e)
      }
    },
    [closeActivePopup, renderPopup, map],
  )

  type FeatureLike = { properties?: Record<string, unknown> }

  // Extract helper: get feature confidence (stable - no dependencies)
  const getFeatureConfidence = useCallback((feature: FeatureLike | null): number => {
    if (!feature) return 100
    const props: Record<string, unknown> = feature.properties ?? {}
    const rawValue = props.confidence ?? props.confidence_mean ?? props.condidence ?? 1
    let conf = typeof rawValue === 'number' ? rawValue : Number.parseFloat(String(rawValue))
    if (Number.isNaN(conf)) conf = 1
    if (conf <= 1) conf = conf * 100
    return typeof conf === 'number' && !Number.isNaN(conf) ? conf : 100
  }, [])

  const createLayersFromConfigs = useCallback(
    (configs: LayerConfig[]) => {
      if (!map) return []

      const createdConfigs: LayerConfig[] = []
      for (const cfg of configs) {
        const created = createMapLibreLayersFromConfig(
          cfg,
          {
            map,
            thresholds,
            layerVisibility,
            getFeatureConfidence,
            getClickInfo: handleFeatureClick,
          },
          is2K,
        )
        if (created) {
          createdLayersRef.current.set(cfg.id, created)
          createdConfigs.push(cfg)
        }
      }
      return createdConfigs
    },
    [thresholds, layerVisibility, getFeatureConfidence, handleFeatureClick, map, is2K],
  )

  // Handler when user selects new layers from search
  const handleOnSelected = (data: TaskLayer[]) => {
    try {
      showLoading()

      // Cleanup all previous layers before rendering new selection
      clearAllCreatedLayers()
      closeActivePopup()

      // Call Service weekly.postSearchLayers(data)
      // const layerData = await weekly.postSearchLayers(data)
      const keyModelSelect = selectedModels.flatMap((m) => m.keys)
      const { allLayerConfigs, geometries, groups, initialVisibility, initialThresholds } = processWeeklyLayers(
        {
          features: [
            {
              layer: data,
            },
          ],
        },
        keyModelSelect,
      )

      if (map) {
        // Set layer list and initial states
        const groupList = Object.values(groups)
        setLayerList(groupList)
        setLayerVisibility(initialVisibility)
        setThresholds(initialThresholds)

        // Automatically select first group to show controls (no list UI in Weekly view)
        if (groupList.length > 0) {
          setSelectedGroup(groupList[0])

          if (isOpenWeeklyGroupPanel) {
            setIsPanelOpen(true)
          }
        }

        // Split configs: centroid_tile -> MapLibre heatmap, others -> deck.gl
        const tileConfigs = allLayerConfigs.filter((c) => c.type === MapType.tile)
        const vectorConfigs = allLayerConfigs.filter((c) => c.type === MapType.vector)
        const centroidHeatConfigs = allLayerConfigs.filter((c) => c.type === MapType.heatmap)

        // setLayerConfig(allLayerConfigs)

        if (isZoom) {
          zoomToGeometries(geometries, map)
          setIsZoom(false)
        }

        // Create layers in order: tile (bottom) -> vector -> heatmap (top)
        createLayersFromConfigs(tileConfigs)
        createLayersFromConfigs(vectorConfigs)

        // Add/update MapLibre heatmap for centroid tiles (added last to sit on top)
        for (const cfg of centroidHeatConfigs) {
          const heatMapData = cfg as VectorLayerConfig
          const href = heatMapData.data
          const color = heatMapData?.color_code
          if (typeof href === 'string') {
            const prevCleanup = heatmapCleanupRef.current.get(cfg.id)
            if (prevCleanup) {
              try {
                prevCleanup()
              } catch {
                // ignore
              }
            }

            const cleanup = createHeatmap(map as maplibregl.Map, cfg.id, href, color)
            heatmapCleanupRef.current.set(cfg.id, cleanup)
          }
        }
      }

      onSelected?.(data)

      hideLoading()
    } catch (error) {
      console.error('Error fetching weekly layers:', error)
      hideLoading()
      showAlert({
        status: 'error',
        content: t('error.failedToLoadLayers'),
      })
    }
  }

  // Helper: find config ID and type for a given layer ID
  const findConfigForLayerId = useCallback(
    (layerId: string): { configId: string; configType: MapType | '' } => {
      let configId = ''
      let configType: MapType | '' = ''
      for (const g of layerList) {
        const cfg = (g.layerConfigs ?? []).find((c) => layerId.startsWith(c.id))
        if (cfg) {
          configId = cfg.id
          configType = cfg.type
          break
        }
      }
      return { configId, configType }
    },
    [layerList],
  )

  // Helper: apply threshold filter to a single layer
  const applyThresholdFilter = useCallback((map: maplibregl.Map, layerId: string, minTh: number, maxTh: number) => {
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

    if (layerId.includes('fill') || layerId.includes('line') || layerId.includes('point')) {
      try {
        map.setFilter(layerId, filter)
      } catch {
        // ignore if layer missing
      }
    }
  }, [])

  // Effect: update layer filters when thresholds change (without recreating layers)
  useEffect(() => {
    if (!map) return

    // Update filters for vector layers based on thresholds
    for (const created of createdLayersRef.current.values()) {
      const firstLayerId = created.layerIds?.[0]
      if (!firstLayerId) continue

      const { configId, configType } = findConfigForLayerId(firstLayerId)

      if (!configId || configType !== MapType.vector) continue

      const th = thresholds[configId] ?? [0, 100]
      const [minTh, maxTh] = th

      // Apply filter to fill/line layers belonging to this config
      for (const lid of created.layerIds ?? []) {
        applyThresholdFilter(map, lid, minTh, maxTh)
      }
    }
  }, [map, thresholds, findConfigForLayerId, applyThresholdFilter])

  // Re-apply visibility and threshold filters after style reload (basemap change)
  useEffect(() => {
    if (!map) return

    const handlerId = `weekly-apply-layer-state-${mapId}`
    const registerHandler = useMapStore.getState().registerStyleDataHandler
    const unregisterHandler = useMapStore.getState().unregisterStyleDataHandler

    const handler = (m: maplibregl.Map) => {
      for (const created of createdLayersRef.current.values()) {
        const firstLayerId = created.layerIds?.[0]
        if (!firstLayerId) continue

        const { configId, configType } = findConfigForLayerId(firstLayerId)
        if (!configId) continue

        const isVisible = visibilityRef.current[configId] ?? true
        for (const lid of created.layerIds ?? []) {
          if (m.getLayer(lid)) {
            try {
              m.setLayoutProperty(lid, 'visibility', isVisible ? 'visible' : 'none')
            } catch {
              // ignore
            }
          }
        }

        if (configType === MapType.vector) {
          const [minTh, maxTh] = thresholdsRef.current[configId] ?? [0, 100]
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
          for (const lid of created.layerIds ?? []) {
            if (lid.includes('fill') || lid.includes('line') || lid.includes('point')) {
              try {
                m.setFilter(lid, filter)
              } catch {
                // ignore
              }
            }
          }
        }
      }
    }

    registerHandler(map, handlerId, handler)
    return () => unregisterHandler(map, handlerId)
  }, [map, findConfigForLayerId, mapId])

  return (
    <Box className='flex h-full w-full flex-col'>
      <Box className='mb-2 flex min-h-0 flex-1 flex-col'>
        <SearchContainer onSelected={handleOnSelected} />
      </Box>
    </Box>
  )
}

export default Weekly
