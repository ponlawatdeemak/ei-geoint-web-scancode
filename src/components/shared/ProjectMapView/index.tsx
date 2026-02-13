'use client'

import { useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import theme from '@/styles/theme'
import { Box, useMediaQuery } from '@mui/material'
import type { Geometry } from 'geojson'
import maplibregl, { LngLatBoundsLike } from 'maplibre-gl'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import {
  GetModelAllDtoOut,
  ServiceConfig,
  RootModelConfig,
  ProjectMapViewPageLevel,
  ProjectMapViewGroup,
  LayerConfig,
  GetModelSubscriptionWeeklyDtoOut,
  PostSearchLayersTasksDtoOut,
  TaskStatus,
  ItvLayerType,
  GetProjectDtoOut,
} from '@interfaces/index'

// common
import LayerControls from '@/components/shared/ProjectMapView/layer/LayerControls'
import { MapView } from '@/components/common/map/MapView'
import { FloatingPanel, PanelSection } from '@/components/common/map/FloatingPanel'
import useMapStore from '@/components/common/map/store/map'

// Component
import { ItvLayer, Task } from '@interfaces/entities'
import { useWeeklyMapStore } from './weekly/store/useWeeklyMapStore'
import LeftSidebarButtons from './LeftSidebarButtons'
import LeftPanel from './LeftPanel'
import WeeklyPanelControls from './WeeklyPanelControls'
import GroupCompareButtons from './GroupCompareButtons'
import { findModelByKeyOrName as findModelByKeyOrNameUtil } from './utils/model'
import {
  processMapLayers as processMapLayersUtil,
  processGeoJsonLayers as processGeoJsonLayersUtil,
  processTileLayers as processTileLayersUtil,
  processItvLayer as processItvLayerUtil,
} from './utils/layers'

// Hook Project
import { useProfileStore } from '@/hook/useProfileStore'
// Hook component
import { useMapLibreLayers } from './hooks/useMapLibreLayers'
import { useCreateMapThumbnail } from './hooks/useCreateMapThumbnail'
import { useFitGeometries } from './hooks/useFitGeometries'
import { useViewSwitch } from './hooks/useViewSwitch'
import { useDownloads } from './hooks/useDownloads'
import { useFeaturePopup } from './hooks/useFeaturePopup'
import ServiceIcon from './layer/LayerIcon/ServiceIcon'
import RootModelIcon from './layer/LayerIcon/RootModelIcon'

type ProjectMapViewProps = {
  task?: Task // only in pageLevel task
  project: GetProjectDtoOut | null
  featureLayers: PostSearchLayersTasksDtoOut
  mapId: string
  onRefresh?: () => void
  pageLevel: ProjectMapViewPageLevel
  weeklySubscriptionModel?: GetModelSubscriptionWeeklyDtoOut[]
  setLoading?: (loading: boolean) => void
  itvLayers?: ItvLayer[]
}

export enum ActiveView {
  layer = 0,
  weekly = 1,
}

export type ProjectMapViewRef = {
  setActiveView: (view: ActiveView) => void
}

const ProjectMapView = forwardRef<ProjectMapViewRef, ProjectMapViewProps>(
  (
    {
      task: propTask,
      project,
      mapId: propMapId,
      featureLayers,
      pageLevel,
      onRefresh,
      weeklySubscriptionModel,
      setLoading,
      itvLayers,
    },
    ref,
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Project Map View
  ) => {
    const mapId = propMapId

    const task = propTask
    const profile = useProfileStore((state) => state.profile)
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const { t, i18n } = useTranslation('common')
    const { showAlert } = useGlobalUI()
    const { loading } = useWeeklyMapStore()
    const { mapLibre } = useMapStore()
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [isWeeklyPanelOpen, setIsWeeklyPanelOpen] = useState(false)
    const [isPanelMinimized, setIsPanelMinimized] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<ProjectMapViewGroup | null>(null)
    const [showPanelLeft, setShowPanelLeft] = useState(!isMobile)
    const [weeklyOverlay, setWeeklyOverlay] = useState<ReactNode>(null)
    const [mapCompareDialogConfig, setMapCompareDialogConfig] = useState({
      open: false,
      layerConfigs: [] as LayerConfig[],
      defaultMode: 'ChangeDetection' as 'ChangeDetection' | 'Compare',
    })
    const [weeklyCompareDialogConfig, setWeeklyCompareDialogConfig] = useState({
      open: false,
      layerConfigs: [] as LayerConfig[],
      defaultMode: 'ChangeDetection' as 'ChangeDetection' | 'Compare',
    })
    const [activeView, setActiveView] = useState<ActiveView>(ActiveView.layer)
    const [allItvLayers, setAllItvLayers] = useState<ItvLayer[]>([])
    const [homeExtent, setHomeExtent] = useState<LngLatBoundsLike | null>(null)
    const [currentMapExtent, setCurrentMapExtent] = useState<LngLatBoundsLike | null>(null)

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      setActiveView,
    }))

    // Extract all layers from featureLayers
    const allLayers = useMemo(() => {
      if (!featureLayers?.features?.[0]?.layer) return []
      return featureLayers.features[0].layer
    }, [featureLayers])

    // Helper: get image title from taskImages by itemId
    const getImageTitle = useCallback((task: Record<string, unknown> | undefined, itemId: string): string => {
      if (!task) return itemId
      const taskImages = Array.isArray(task.taskImages) ? task.taskImages : []
      for (const ti of taskImages) {
        const img = ti?.image
        if (img.itemId === itemId) {
          return img.name ?? itemId
        }
      }
      return itemId
    }, [])

    // Helper: initialize tile layer visibility
    const initializeTileLayerVisibility = useCallback(
      (result: Record<string, boolean>, groupId: string, tileLayers: unknown[]) => {
        let index = 1
        for (const tile of tileLayers) {
          const tileId = `${groupId}-${(tile as Record<string, unknown>).id}-${index}-tile`
          result[tileId] = true
          index++
        }
      },
      [],
    )

    // Helper: initialize GeoJSON layer visibility
    const initializeGeoJsonLayerVisibility = useCallback(
      (result: Record<string, boolean>, groupId: string, geoJsonLayers: unknown[]) => {
        for (const geojsonLayer of geoJsonLayers) {
          const geojsonLayerId = `${groupId}-${(geojsonLayer as Record<string, unknown>).id}`
          result[geojsonLayerId] = true
        }
      },
      [],
    )

    // Helper: initialize map layer visibility
    const initializeMapLayerVisibility = useCallback(
      (result: Record<string, boolean>, groupId: string, mapLayers: unknown[]) => {
        for (const mapLayer of mapLayers) {
          const mapLayerId = `${groupId}-${(mapLayer as Record<string, unknown>).model_id}`
          result[mapLayerId] = true
        }
      },
      [],
    )

    // สร้าง default layerVisibility ให้ทุก layer id เป็น true
    const defaultLayerVisibility = useMemo(() => {
      const result: Record<string, boolean> = {}
      for (const layer of allLayers) {
        const props = layer.properties ?? {}
        const task = (props.task ?? {}) as Record<string, unknown>
        const groupId = `${task.id}-${task.thaicomTaskId}`

        if (layer.tileLayers) {
          initializeTileLayerVisibility(result, groupId, layer.tileLayers)
        }

        if (layer.geoJsonLayers) {
          initializeGeoJsonLayerVisibility(result, groupId, layer.geoJsonLayers)
        }

        if (layer.mapLayers) {
          initializeMapLayerVisibility(result, groupId, layer.mapLayers)
        }
      }

      for (const itvLayer of allItvLayers) {
        const itvLayerId = `${itvLayer.id}`
        result[itvLayerId] = true
      }

      return result
    }, [
      allLayers,
      allItvLayers,
      initializeTileLayerVisibility,
      initializeGeoJsonLayerVisibility,
      initializeMapLayerVisibility,
    ])
    const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>(defaultLayerVisibility)

    // Sync layerVisibility with defaultLayerVisibility when it changes (e.g. data load)
    useEffect(() => {
      setLayerVisibility((prev) => {
        return { ...prev, ...defaultLayerVisibility }
      })
    }, [defaultLayerVisibility])
    const [showSaveAnalysisResultDialog, setShowSaveAnalysisResultDialog] = useState(false)
    const [showDownloadFileTypeDialog, setShowDownloadFileTypeDialog] = useState(false)
    const [downloadGroupId, setDownloadGroupId] = useState<string>('')

    const { data: modelAll } = useQuery({
      queryKey: ['model-all'],
      queryFn: async () => {
        setLoading?.(true)
        const models = await service.lookup.getModelAll()
        setLoading?.(false)
        return models
      },
    })

    // confidence thresholds per sub-layer id as range [min,max] (0-100)
    const [thresholds, setThresholds] = useState<Record<string, [number, number]>>(() => {
      const result: Record<string, [number, number]> = {}
      for (const layer of allLayers) {
        if (layer.mapLayers) {
          const props = layer.properties ?? {}
          const task = (props.task ?? {}) as Record<string, unknown>
          const groupId = `${task.id}-${task.thaicomTaskId}`

          for (const mapLayer of layer.mapLayers) {
            const id = `${groupId}-${mapLayer.model_id}`
            result[id] = [0, 100]
          }
        }
      }
      return result
    })

    const handleThresholdChange = (id: string, value: number | number[]) => {
      const v: [number, number] = Array.isArray(value)
        ? [Number(value[0]), Number(value[1])]
        : [Number(value), Number(value)]

      setThresholds((prev) => ({ ...prev, [id]: v }))
    }

    const [layerConfigOverrides, setLayerConfigOverrides] = useState<Record<string, Partial<LayerConfig>>>({})

    const handleLayerConfigChange = useCallback((id: string, config: Partial<LayerConfig>) => {
      setLayerConfigOverrides((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...config },
      } as Record<string, Partial<LayerConfig>>))
    }, [])

    // สร้างข้อมูล layerList จาก featureLayers
    const layerList = useMemo(() => {
      const groups: Record<string, ProjectMapViewGroup> = {}

      for (const layer of allLayers) {
        const props = layer.properties ?? {}
        const task = (props.task ?? {}) as Record<string, unknown>
        const groupName = (task.name as string) || (props.task_id as string) || layer.id
        const groupId = `${task.id}-${task.thaicomTaskId}`

        // Initialize group if not exists
        if (!groups[groupId]) {
          groups[groupId] = {
            groupId,
            groupName,
            projectId: (task.projectId as string) ?? (props.project_id as string) ?? '',
            serviceId: (task.serviceId as ServiceConfig) ?? ServiceConfig.optical,
            rootModelId: (task.rootModelId as RootModelConfig) ?? RootModelConfig.objectDetection,
            taskId: (task.id as string) ?? (props.task_id as string) ?? '',
            rootModelName: '',
            statusId: (task.statusId as number) ?? (props.status_id as number) ?? 0,
            layers: [],
            layerConfigs: [],
            download: layer.downloads,
            layerType: ItvLayerType.TASK,
            order: task.order as number | 0,
            itvLayerInfo: undefined,
          }
        }

        processMapLayersUtil(layer, groups)
        processGeoJsonLayersUtil(layer, groups)
        processTileLayersUtil(layer, groups, getImageTitle)
      }
      let groupLayer = Object.values(groups)
      if (allItvLayers && allItvLayers.length > 0) {
        for (const layer of allItvLayers) {
          processItvLayerUtil(layer, groups)
        }
        // recompute to include ITV groups added to `groups`
        groupLayer = Object.values(groups)
      }

      for (const group of groupLayer) {
        if (group.layerConfigs) {
          group.layerConfigs = group.layerConfigs.map((cfg) => {
            const override = layerConfigOverrides[cfg.id]
            if (override) {
              return { ...cfg, ...override } as any as LayerConfig
            }
            return cfg
          })
        }
      }

      return groupLayer.sort((a, b) => b.order - a.order)
    }, [allLayers, getImageTitle, allItvLayers, layerConfigOverrides])

    // If this page is at task level there will be a single group - open its controls automatically
    useEffect(() => {
      if (pageLevel === ProjectMapViewPageLevel.task && layerList && layerList.length > 0) {
        const first = layerList[0]

        // กรณี SAR ที่ยังไม่ completed ไม่แสดง panel
        if (first.serviceId === ServiceConfig.sar && first.statusId !== TaskStatus.completed) {
          return
        }

        if (first?.groupId) {
          setSelectedGroup(first)
          if (!isMobile) setIsPanelOpen(true)
        }
      }
    }, [pageLevel, layerList, isMobile])

    // ฟังก์ชัน toggle layer visibility
    const handleLayerToggle = useCallback((id: string, isVisible: boolean) => {
      setLayerVisibility((prev) => ({ ...prev, [id]: isVisible }))
    }, [])

    const { downloadGroup, downloadAnalysisData, hasVisibleLayerForGroup, hasVisibleVectorLayerForGroup } =
      useDownloads({
        layerList,
        layerVisibility,
        showAlert,
        t,
      })

    const handleExtentChange = useCallback((extent: [number, number, number, number] | null) => {
      if (!extent) {
        setHomeExtent(null)
        return
      }

      const [minX, minY, maxX, maxY] = extent
      setHomeExtent([
        [minX, minY],
        [maxX, maxY],
      ])
    }, [])

    const fitGeometryOptions = useMemo(() => ({ onExtent: handleExtentChange }), [handleExtentChange])

    useFitGeometries(
      mapId,
      mapLibre as Record<string, maplibregl.Map>,
      allLayers as { geometry?: Geometry }[],
      fitGeometryOptions,
    )

    // Track current map extent when map moves
    useEffect(() => {
      const map = (mapLibre as Record<string, maplibregl.Map>)?.[mapId]
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

      // Set initial extent
      handleMoveEnd()

      return () => {
        map.off('moveend', handleMoveEnd)
      }
    }, [mapLibre, mapId])

    // Helper: build model name with parent hierarchy
    // ค้นหาโมเดลจาก modelAll: ก่อนอื่นลองหา key ตรงกัน ถ้าไม่พบให้หาโดย modelName
    const findModelByKeyOrName = useCallback(
      (key: string): GetModelAllDtoOut | undefined => {
        return findModelByKeyOrNameUtil(modelAll, key)
      },
      [modelAll],
    )

    const { handleFeatureClick, closeActivePopup, popupRef } = useFeaturePopup({
      mapLibre: mapLibre as Record<string, maplibregl.Map>,
      mapId,
      modelAll,
      language: i18n.language,
      layerList,
      isMobile,
      setIsPanelOpen,
      setSelectedGroup,
    })

    useEffect(() => {
      if (itvLayers) {
        if (popupRef.current) popupRef.current.remove()
        setAllItvLayers(itvLayers)
      }
    }, [itvLayers, popupRef])

    useEffect(() => {
      if (allItvLayers && popupRef.current) popupRef.current.remove()
    }, [allItvLayers, popupRef])

    // helper: normalized feature-like shape
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

    // Manage maplibre layers via hook (creates/updates/cleans based on configs/state)
    useMapLibreLayers({
      mapId,
      mapLibre: mapLibre as Record<string, maplibregl.Map>,
      layerList,
      thresholds,
      layerVisibility,
      getFeatureConfidence,
      handleFeatureClick,
    })

    useCreateMapThumbnail({
      mapId,
      mapLibre: mapLibre as Record<string, maplibregl.Map>,
      pageLevel,
      id: pageLevel === ProjectMapViewPageLevel.task && task ? task.id : task?.projectId || '',
    })

    // Cleanup popup on unmount only (layer cleanup handled by hook)
    useEffect(() => {
      return () => {
        closeActivePopup()
      }
    }, [closeActivePopup])

    useViewSwitch({
      activeView,
      pageLevel,
      mapId,
      mapLibre: mapLibre as Record<string, maplibregl.Map>,
      setWeeklyOverlay,
      setIsPanelOpen,
      setSelectedGroup,
    })

    const icon = useMemo(() => {
      if (!selectedGroup) return <></>

      return (
        <>
          {selectedGroup.serviceId && (
            <ServiceIcon
              serviceId={selectedGroup.serviceId}
              baseClass='inline-flex h-[14px] min-h-[14px] w-[14px] min-w-[14px] items-center justify-center rounded-[3px] align-middle text-(--color-text-icon)'
            ></ServiceIcon>
          )}
          {selectedGroup.rootModelId && (
            <RootModelIcon
              rootModelId={selectedGroup.rootModelId}
              baseClass='inline-flex h-[14px] min-h-[14px] w-[14px] min-w-[14px] items-center justify-center rounded-[3px] align-middle text-(--color-text-icon)'
            ></RootModelIcon>
          )}
        </>
      )
    }, [selectedGroup])

    return (
      <Box className='flex h-full w-full grow'>
        {!isMobile && (
          <Box
            className='flex h-full flex-col items-center gap-2 border-x border-r-(--color-gray-border) bg-(--color-background-dark) transition-all duration-300'
            sx={{
              width: showPanelLeft ? '60px' : '0',
              minWidth: showPanelLeft ? '60px' : '0',
              padding: showPanelLeft ? '1rem' : '0',
              opacity: showPanelLeft ? 1 : 0,
            }}
          >
            <LeftSidebarButtons
              activeView={activeView}
              setActiveView={setActiveView}
              weeklySubscriptionModel={weeklySubscriptionModel}
            />
          </Box>
        )}
        <Box className='relative flex min-h-0 w-full flex-row overflow-hidden'>
          <Box
            className={`all 300ms bg-white transition-all duration-300 ${isMobile ? 'flex h-full w-full flex-col' : 'flex-none overflow-visible'
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
            <LeftPanel
              isMobile={isMobile}
              showPanelLeft={showPanelLeft}
              setShowPanelLeft={setShowPanelLeft}
              activeView={activeView}
              setActiveView={(v) => setActiveView(v as ActiveView)}
              pageLevel={pageLevel}
              weeklySubscriptionModel={weeklySubscriptionModel}
              t={t}
              task={task}
              profile={profile}
              onRefresh={onRefresh}
              showSaveAnalysisResultDialog={showSaveAnalysisResultDialog}
              setShowSaveAnalysisResultDialog={setShowSaveAnalysisResultDialog}
              downloadAnalysisData={downloadAnalysisData}
              showDownloadFileTypeDialog={showDownloadFileTypeDialog}
              setShowDownloadFileTypeDialog={setShowDownloadFileTypeDialog}
              onConfirmDownloadTypes={async (selectedFileTypes) => {
                if (downloadGroupId) await downloadGroup(downloadGroupId, selectedFileTypes)
                setDownloadGroupId('')
              }}
              isWeeklyPanelOpen={isWeeklyPanelOpen}
              setIsWeeklyPanelOpen={setIsWeeklyPanelOpen}
              setWeeklyOverlay={setWeeklyOverlay}
              layerList={layerList}
              layerVisibility={layerVisibility}
              onToggleLayer={handleLayerToggle}
              onDownloadGroup={async (groupId: string) => {
                const hasVisible = hasVisibleLayerForGroup(groupId)
                if (!hasVisible) {
                  showAlert({ status: 'error', content: t('map.pleaseSelectDataToDownload') })
                  return
                }
                const hasVector = hasVisibleVectorLayerForGroup(groupId)
                if (groupId) {
                  if (!hasVector) {
                    await downloadGroup(groupId, [])
                  } else {
                    setDownloadGroupId(groupId)
                    setShowDownloadFileTypeDialog(true)
                  }
                }
              }}
              isPanelOpen={isPanelOpen}
              setIsPanelOpen={setIsPanelOpen}
              setSelectedGroup={setSelectedGroup}
              findModelByKeyOrName={findModelByKeyOrName}
              mapId={mapId}
              mapLibre={mapLibre}
              onUpdateItvLayers={setAllItvLayers}
            />
          </Box>

          <Box className='relative h-full min-w-0 flex-1'>
            <MapView
              mapId={mapId}
              homeExtent={homeExtent}
              printDetails={{
                displayDialogTitle: project ? project.name : '',
                organization: {
                  th: project?.organization?.name ?? '',
                  en: project?.organization?.nameEn ?? '',
                },
              }}
              isShowOpenBtn={!showPanelLeft}
              isShowLayerDetailsBtn={
                (isMobile && selectedGroup !== null && activeView === ActiveView.layer) ||
                (activeView === ActiveView.weekly && isMobile)
              }
              onPanelOpen={() => {
                setShowPanelLeft(true)

                if (activeView === ActiveView.weekly && isMobile) {
                  setIsWeeklyPanelOpen(false)
                }
              }}
              onShowLayerDetails={() => {
                if (activeView === ActiveView.weekly) {
                  setIsWeeklyPanelOpen(true)
                } else if (selectedGroup && activeView === ActiveView.layer) {
                  setIsPanelOpen(true)
                }
              }}
              floatingPanel={
                <Box className='fixed bottom-8 left-1/2 z-35 w-[90%] -translate-x-1/2 pr-[8%] sm:pr-[6%] md:relative md:bottom-auto md:left-auto md:w-[450px] md:-translate-x-0 md:pr-0 md:max-h-full md:flex md:flex-col'>
                  {activeView === ActiveView.weekly && weeklyOverlay}
                  <FloatingPanel
                    title={selectedGroup ? selectedGroup.groupName : ''}
                    isOpen={isPanelOpen}
                    isMinimized={isPanelMinimized}
                    icon={icon}
                    onClose={() => {
                      setIsPanelOpen(false)
                      // setSelectedGroup(null)
                    }}
                    onToggleMinimize={() => setIsPanelMinimized(!isPanelMinimized)}
                  >
                    {selectedGroup ? (
                      <LayerControls
                        selectedGroup={selectedGroup.groupId}
                        group={layerList.find((g) => g.groupId === selectedGroup.groupId)}
                        findModelByKeyOrName={findModelByKeyOrName}
                        thresholds={thresholds}
                        handleThresholdChange={handleThresholdChange}
                        handleLayerConfigChange={handleLayerConfigChange}
                      />
                    ) : (
                      <Box>
                        <PanelSection label='Info' value='Click a group name to open sub-layer controls' />
                      </Box>
                    )}
                  </FloatingPanel>
                </Box>
              }
            ></MapView>

            {activeView === ActiveView.weekly && !loading && (
              <WeeklyPanelControls
                currentMapExtent={currentMapExtent}
                t={t}
                weeklyCompareDialogConfig={weeklyCompareDialogConfig}
                setWeeklyCompareDialogConfig={setWeeklyCompareDialogConfig}
              />
            )}

            {/* Floating action buttons shown when a group is opened */}
            {selectedGroup?.rootModelId === RootModelConfig.changeDetection && selectedGroup && (
              <GroupCompareButtons
                selectedGroup={selectedGroup}
                currentMapExtent={currentMapExtent}
                isMobile={isMobile}
                isPanelOpen={isPanelOpen}
                t={t}
                mapCompareDialogConfig={mapCompareDialogConfig}
                setMapCompareDialogConfig={setMapCompareDialogConfig}
                layerVisibility={layerVisibility}
              />
            )}
          </Box>
        </Box>
      </Box>
    )
  },
)

ProjectMapView.displayName = 'ProjectMapView'

export default ProjectMapView
