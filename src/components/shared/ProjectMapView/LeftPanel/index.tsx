import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import MobilePanelHeader from '../MobilePanelHeader'
import LayerPanelHeader, { ActiveViewLocal } from '../LayerPanelHeader'
import SarTaskActions from '../SarTaskActions'
import Weekly from '../weekly'
import SaveAnalysisResultDialog from '@/components/dialog/SaveAnalysisResultDialog'
import SelectDownloadFileTypeDialog from '@/components/dialog/SelectDownloadFileTypeDialog'
import LayerGroupList from '../layer/LayerGroupList'
import {
  Roles,
  ServiceConfig,
  TaskStatus,
  SARStatusText,
  type ProjectMapViewGroup,
  ProjectMapViewPageLevel,
  type GetModelAllDtoOut,
  type GetModelSubscriptionWeeklyDtoOut,
  ItvLayerType,
} from '@interfaces/index'
import { zoomToGeometries } from '@/utils/geometry'
import type { Geometry } from 'geojson'
import type maplibregl from 'maplibre-gl'
import { ItvLayer, Task } from '@interfaces/entities'
import { useWeeklyMapStore } from '../weekly/store/useWeeklyMapStore'
import ImportToVisualize from './ImportToVisualize'
import { ItvMenuItem, ItvMenuType, ItvMode } from '../utils/importToVisualize'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { DeleteItvLayerDtoIn } from '@interfaces/dto/import-to-visualize'
import importToVisualize from '@/api/import-to-visualize'
import { downloadFileItem } from '@/utils/download'
import ImageInfo from '@/components/common/images/DetailPanel/ImageInfo'
import { GetByItemIdImageDtoOut } from '@interfaces/dto/images'
import { ImagesMode } from '@/components/common/images/images'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import service from '@/api'

export type LeftPanelProps = {
  isMobile: boolean
  showPanelLeft: boolean
  setShowPanelLeft: (v: boolean) => void
  activeView: number
  setActiveView: (v: number) => void
  pageLevel: ProjectMapViewPageLevel
  weeklySubscriptionModel?: GetModelSubscriptionWeeklyDtoOut[]
  t: (k: string) => string
  task?: Task
  profile: { roleId: number } | null
  onRefresh?: () => void

  // SAR actions
  showSaveAnalysisResultDialog: boolean
  setShowSaveAnalysisResultDialog: (v: boolean) => void
  downloadAnalysisData: () => void

  // File-type dialog
  showDownloadFileTypeDialog: boolean
  setShowDownloadFileTypeDialog: (v: boolean) => void
  onConfirmDownloadTypes: (fileTypes: string[]) => void

  // Weekly panel state
  isWeeklyPanelOpen: boolean
  setIsWeeklyPanelOpen: (v: boolean) => void
  setWeeklyOverlay: (node: React.ReactNode) => void

  // Layer list props
  layerList: ProjectMapViewGroup[]
  layerVisibility: Record<string, boolean>
  onToggleLayer: (id: string, visible: boolean) => void
  onDownloadGroup: (groupId: string) => void
  isPanelOpen: boolean
  setIsPanelOpen: (v: boolean) => void
  setSelectedGroup: (g: ProjectMapViewGroup | null) => void
  findModelByKeyOrName: (key: string) => GetModelAllDtoOut | undefined
  mapId: string
  mapLibre: Record<string, maplibregl.Map | null>
  onUpdateItvLayers: Dispatch<SetStateAction<ItvLayer[]>>
  onEditingItvChange?: (isEditing: boolean) => void
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  isMobile,
  showPanelLeft,
  setShowPanelLeft,
  activeView,
  setActiveView,
  pageLevel,
  weeklySubscriptionModel,
  t,
  task,
  profile,
  onRefresh,
  showSaveAnalysisResultDialog,
  setShowSaveAnalysisResultDialog,
  downloadAnalysisData,
  showDownloadFileTypeDialog,
  setShowDownloadFileTypeDialog,
  onConfirmDownloadTypes,
  isWeeklyPanelOpen,
  setIsWeeklyPanelOpen,
  setWeeklyOverlay,
  layerList,
  layerVisibility,
  onToggleLayer,
  onDownloadGroup,
  isPanelOpen,
  setIsPanelOpen,
  setSelectedGroup,
  findModelByKeyOrName,
  mapId,
  mapLibre,
  onUpdateItvLayers,
  onEditingItvChange,
}) => {
  const { showAlert, showLoading, hideLoading } = useGlobalUI()
  const { isOpenWeeklyGroupPanel, setIsOpenWeeklyGroupPanel, selectedModels } = useWeeklyMapStore()
  const [currentItv, setCurrentItv] = useState<ItvLayerType | null>(null)
  const [itvMode, setItvMode] = useState<ItvMode | null>(null)

  // Calculate isEditingItv from itvMode and currentItv
  const isEditingItv = useMemo(() => {
    return itvMode !== null && currentItv !== null
  }, [itvMode, currentItv])

  // Notify parent when editing status changes
  useEffect(() => {
    onEditingItvChange?.(isEditingItv)
  }, [isEditingItv, onEditingItvChange])
  const [layerInfo, setLayerInfo] = useState<ItvLayer | undefined>(undefined)
  const [showGalleryInfo, setShowGalleryInfo] = useState(false)

  // Reordering state
  const [isReordering, setIsReordering] = useState(false)
  const [localOrderedGroups, setLocalOrderedGroups] = useState<ProjectMapViewGroup[]>([])
  const [hasOrderChanged, setHasOrderChanged] = useState(false)

  // Sync localOrderedGroups with layerList when not reordering
  useEffect(() => {
    if (!isReordering) {
      setLocalOrderedGroups(layerList)
    }
  }, [layerList, isReordering])

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return

      const items = Array.from(localOrderedGroups)
      const [reorderedItem] = items.splice(result.source.index, 1)
      items.splice(result.destination.index, 0, reorderedItem)

      setLocalOrderedGroups(items)
      setHasOrderChanged(true)
    },
    [localOrderedGroups],
  )

  const handleToggleReorder = useCallback(
    (v: boolean) => {
      setIsReordering(v)
      if (v) {
        setLocalOrderedGroups(layerList)
        setHasOrderChanged(false)
      }
    },
    [layerList],
  )

  const handleCancelReorder = useCallback(() => {
    setIsReordering(false)
    setLocalOrderedGroups(layerList)
    setHasOrderChanged(false)
  }, [layerList])

  const handleSaveReorder = useCallback(() => {
    showAlert({
      status: 'confirm-save',
      title: t('alert.confirmSaveTitle'),
      content: t('alert.confirmSaveContent'),
      showCancel: true,
      async onConfirm() {
        showLoading()
        try {
          // Prepare payload
          const payload = localOrderedGroups.map((g, index) => ({
            id: g.taskId || g.groupId.replace('itv-', ''),
            isItv: g.layerType !== ItvLayerType.TASK,
            order: localOrderedGroups.length - index,
          }))

          let projectId = task?.projectId
          if (!projectId && layerList.length > 0) {
            projectId = layerList[0].projectId
          }

          if (projectId) {
            await service.projects.updateLayerOrder({
              id: projectId,
              layerOrder: payload,
            })
            setIsReordering(false)
            setHasOrderChanged(false)
            onRefresh?.()
            showAlert({ status: 'success', title: t('alert.saveSuccess') })
          }
        } catch (err: any) {
          console.error(err)
          showAlert({
            status: 'error',
            errorCode: err?.message,
          })
        } finally {
          hideLoading()
        }
      },
    })
  }, [localOrderedGroups, task, layerList, showAlert, showLoading, hideLoading, t, onRefresh])

  const isShowWeekly = useMemo(() => {
    return activeView === ActiveViewLocal.weekly
  }, [activeView])

  const onAddLayer = useCallback((layerType: ItvLayerType) => {
    setItvMode(ItvMode.Add)
    setCurrentItv(layerType)
  }, [])

  const onEditLayer = useCallback((layerType: ItvLayerType, group: ProjectMapViewGroup) => {
    setItvMode(ItvMode.Edit)
    setCurrentItv(layerType)
    setLayerInfo(group.itvLayerInfo as ItvLayer)
  }, [])

  const onItvMenuSelect = useCallback(
    (item: ItvMenuItem, group: ProjectMapViewGroup) => {
      if (item.value === ItvMenuType.info) {
        setShowGalleryInfo(true)
        setLayerInfo(group.itvLayerInfo as ItvLayer)
      } else if (item.value === ItvMenuType.edit) {
        onEditLayer(group.layerType, group)
      } else if (item.value === ItvMenuType.delete) {
        showAlert({
          status: 'confirm-delete',
          showCancel: true,
          onConfirm: async () => {
            showLoading()
            try {
              const id = group.groupId.replace('itv-', '')
              const param: DeleteItvLayerDtoIn = {
                projectId: group.projectId as string,
                id,
              }
              await importToVisualize.deleteLayer(param)
              showAlert({ status: 'success', title: t('alert.deleteSuccess') })
              onRefresh?.()
            } catch (err: any) {
              showAlert({
                status: 'error',
                errorCode: err?.message,
              })
            } finally {
              hideLoading()
            }
          },
        })
      } else if (item.value === ItvMenuType.download) {
        const url = group.itvLayerInfo?.url
        downloadFileItem(url || '')
      }
    },
    [showAlert, showLoading, hideLoading, onRefresh, t, onEditLayer],
  )

  const onBack = useCallback(() => {
    setItvMode(null)
    setCurrentItv(null)
    setLayerInfo(undefined)
    onRefresh?.()
  }, [onRefresh])

  // Extracted helpers to reduce cognitive complexity
  const zoomToGroupGeometries = useCallback(
    (geoms: (Geometry | number[])[]) => {
      if (!geoms || geoms.length === 0) return

      if (geoms.length === 1) {
        const only: any = geoms[0]

        // Case A: bbox array [minX, minY, maxX, maxY]
        if (Array.isArray(only) && only.length >= 4 && typeof only[0] === 'number') {
          const [minX, minY, maxX, maxY] = only as number[]
          if (mapLibre[mapId]) {
            mapLibre[mapId]?.fitBounds(
              [
                [minX, minY], // southwest
                [maxX, maxY], // northeast
              ],
              { padding: 80, maxZoom: 18, duration: 800 },
            )
            return
          }
          // fallback to geometry-based zoom if map not available
          zoomToGeometries(geoms as Geometry[], mapLibre[mapId])
          return
        }

        // Case B: GeoJSON Point
        if (only && only.type === 'Point') {
          const point = only as GeoJSON.Point
          const coords = point.coordinates
          if (coords && coords.length >= 2 && mapLibre[mapId]) {
            mapLibre[mapId]?.flyTo({
              center: [coords[0], coords[1]] as [number, number],
              zoom: 18,
              duration: 800,
            })
            return
          }
          zoomToGeometries(geoms as Geometry[], mapLibre[mapId])
          return
        }

        // fallback for any other single geometry
        zoomToGeometries(geoms as Geometry[], mapLibre[mapId])
        return
      }

      // multiple geometries fallback
      zoomToGeometries(geoms as Geometry[], mapLibre[mapId])
    },
    [mapId, mapLibre],
  )

  const handleOpenGroup = useCallback(
    (g: ProjectMapViewGroup) => {
      // Extract geometries based on layer type
      const extractGeometries = (group: ProjectMapViewGroup): (Geometry | number[])[] => {
        if (group.layerType === ItvLayerType.TASK) {
          return (group.layerConfigs ?? []).map((c) => c.geometry ?? null).filter(Boolean) as (Geometry | number[])[]
        }
        return (group.itvLayerInfo?.features ?? []).map((c) => c.geometry ?? null).filter(Boolean) as (
          | Geometry
          | number[]
        )[]
      }

      if (g.layerType === ItvLayerType.TASK) {
        if (g.serviceId === ServiceConfig.sar && g.statusId !== TaskStatus.completed) {
          setSelectedGroup(null)
          setIsPanelOpen(false)
          return
        }

        setSelectedGroup(g)
        setIsPanelOpen(true)

        if (isMobile) {
          setShowPanelLeft(false)
          setIsPanelOpen(true)
        }
      }

      // Extract and zoom to geometries
      const geoms = extractGeometries(g)
      zoomToGroupGeometries(geoms)
    },
    [isMobile, setSelectedGroup, setIsPanelOpen, setShowPanelLeft, zoomToGroupGeometries],
  )

  const showLayerList = useMemo(() => {
    // แสดงแค่ตอน เพิ่มแก้ไข GALLERY,RASTER_TILE,VECTOR_TILE
    // ถ้าไม่มี currentItv แสดงทุกอย่าง
    const isShowType =
      currentItv === ItvLayerType.GALLERY ||
      currentItv === ItvLayerType.RASTER_TILE ||
      currentItv === ItvLayerType.VECTOR_TILE
    return isShowType || (!isShowType && itvMode === ItvMode.Add) || itvMode === null || currentItv === null
  }, [currentItv, itvMode])

  const onSaveComplete = useCallback(
    (value?: ItvLayer) => {
      if (
        currentItv === ItvLayerType.GALLERY ||
        currentItv === ItvLayerType.RASTER_TILE ||
        currentItv === ItvLayerType.VECTOR_TILE
      ) {
        onBack()
      } else {
        setItvMode(ItvMode.Edit)
        if (value) {
          setLayerInfo(value)
        }
      }
    },
    [onBack, currentItv],
  )

  const onCloseGalleryInfo = useCallback(() => {
    setShowGalleryInfo(false)
    setLayerInfo(undefined)
  }, [])

  return (
    <>
      {isMobile && (
        <MobilePanelHeader
          weeklySubscriptionModel={weeklySubscriptionModel}
          showPanelLeft={showPanelLeft}
          setShowPanelLeft={setShowPanelLeft}
          activeView={activeView}
          setActiveView={setActiveView}
          pageLevel={pageLevel}
          isEditingItv={isEditingItv}
        />
      )}

      <Box
        className={
          isMobile
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-4 pt-2 pb-6'
            : 'flex h-full min-h-0 flex-col bg-white p-4 pt-2 pb-2 md:pt-4'
        }
      >
        {task?.id &&
          task.serviceId === ServiceConfig.sar &&
          task.statusId !== TaskStatus.draft &&
          profile &&
          [Roles.superAdmin, Roles.admin].includes(profile.roleId) && (
            <>
              <div className='mb-2'>
                <span className='text-(--color-text-secondary)'> {t('form.searchProject.card.status')}: </span>
                {task.status && (
                  <span
                    className=''
                    style={{
                      color:
                        Number(task.status.id) === TaskStatus.draft ||
                        Number(task.status.id) === TaskStatus.waitingForResults
                          ? 'var(--mui-palette-primary-main)'
                          : Number(task.status.id) === TaskStatus.inProgress
                            ? 'var(--mui-palette-warning-main)'
                            : Number(task.status.id) === TaskStatus.completed
                              ? 'var(--mui-palette-success-main)'
                              : 'var(--mui-palette-error-main)',
                    }}
                  >
                    {t(`sarStatus.${SARStatusText[task.status.id as keyof typeof SARStatusText]}`)}
                  </span>
                )}
              </div>
              <SarTaskActions
                statusId={task.statusId || TaskStatus.draft}
                onDownloadAnalysisData={downloadAnalysisData}
                onOpenSaveDialog={() => setShowSaveAnalysisResultDialog(true)}
              />
              <SaveAnalysisResultDialog
                taskId={task?.id}
                taskStatusId={task?.statusId || TaskStatus.draft}
                open={showSaveAnalysisResultDialog}
                onClose={() => setShowSaveAnalysisResultDialog(false)}
                onSaved={() => {
                  setShowSaveAnalysisResultDialog(false)
                  if (typeof onRefresh === 'function') onRefresh()
                }}
              />
            </>
          )}

        <SelectDownloadFileTypeDialog
          open={showDownloadFileTypeDialog}
          onClose={() => setShowDownloadFileTypeDialog(false)}
          onConfirm={onConfirmDownloadTypes}
        />

        <LayerPanelHeader
          activeView={activeView}
          pageLevel={pageLevel}
          isMobile={isMobile}
          onClosePanel={() => setShowPanelLeft(false)}
          onSelectItv={onAddLayer}
          showAddButton={showLayerList}
          isReordering={isReordering}
          hasOrderChanged={hasOrderChanged}
          onToggleReorder={handleToggleReorder}
          onSaveReorder={handleSaveReorder}
          onCancelReorder={handleCancelReorder}
        />

        <div className='min-h-0 flex-1 overflow-y-auto'>
          <ImportToVisualize
            onBack={onBack}
            projectId={task?.projectId || ''}
            layerType={currentItv}
            onSaveComplete={onSaveComplete}
            layerInfo={layerInfo}
            setLayerInfo={setLayerInfo}
            itvMode={itvMode}
            currentItv={currentItv}
            mapId={mapId}
            onToggleLayer={onToggleLayer}
            onUpdateItvLayers={onUpdateItvLayers}
          />

          {showLayerList && isShowWeekly && (
            <Weekly
              weeklySubscriptionModel={weeklySubscriptionModel || []}
              mapId={mapId}
              onSelected={(data) => {
                setIsPanelOpen(false)
                setSelectedGroup(null)

                if (selectedModels.length === 0) {
                  setIsWeeklyPanelOpen(false)
                } else {
                  setIsWeeklyPanelOpen(true)
                }

                if (isOpenWeeklyGroupPanel) {
                  setIsOpenWeeklyGroupPanel(false)

                  if (isMobile) {
                    setShowPanelLeft(false)
                  }
                }
              }}
              onRenderOverlay={setWeeklyOverlay}
              isPanelOpen={isWeeklyPanelOpen}
              setIsPanelOpen={setIsWeeklyPanelOpen}
            />
          )}
          {showLayerList && !isShowWeekly && (
            <DragDropContext onDragEnd={onDragEnd}>
              <LayerGroupList
                groups={isReordering ? localOrderedGroups : layerList}
                layerVisibility={layerVisibility}
                onToggle={onToggleLayer}
                onOpenGroup={handleOpenGroup}
                onDownloadGroup={onDownloadGroup}
                isPanelOpen={isPanelOpen}
                findModelByKeyOrName={findModelByKeyOrName}
                pageLevel={pageLevel}
                onMenuSelect={onItvMenuSelect}
                isReordering={isReordering}
              />
            </DragDropContext>
          )}
        </div>

        <Dialog open={showGalleryInfo} fullWidth maxWidth='sm'>
          <DialogTitle noWrap>{t('itv.label.image')}</DialogTitle>
          <DialogContent>
            {showGalleryInfo && (
              <ImageInfo
                selectedImage={layerInfo?.image as GetByItemIdImageDtoOut}
                pageUse='itv'
                mode={ImagesMode.Selector}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onCloseGalleryInfo} color='inherit'>
              {t('button.close')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  )
}

export default LeftPanel
