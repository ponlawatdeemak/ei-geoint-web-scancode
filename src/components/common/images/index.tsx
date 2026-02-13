'use client'

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import SearchPanel from './SearchPanel'
import DetailPanel from './DetailPanel'
import ResultPanel from './ResultPanel'
import {
  GetByItemIdImageDtoOut,
  SearchImagesDtoIn,
  SearchImagesDtoOut,
  SearchImagesResultItem,
} from '@interfaces/dto/images'
import ResultSwitch from './ResultSwitch'
import service from '@/api'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { addImageToMap, ImageAction, imageMapId, ImagesMode } from './images'
import { Box, Divider, IconButton, Tooltip } from '@mui/material'
import { useImages } from './use-images'
import useResponsive from '@/hook/responsive'
import useMapStore from '../map/store/map'
import MapView from '../map/MapView'
import { useSearchParams } from 'next/navigation'
import { ImageStatus, Roles, ServiceConfig } from '@interfaces/config'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'
import ProcessTask from './Action/ProcessTask'
import UpdateImage from './Action/UpdateImage'
import SharedImage from './Action/SharedImage'
import { downloadFileItem } from '@/utils/download'
import TaskCreator from './Action/TaskCreator'
import { useProfileStore } from '@/hook/useProfileStore'
import InfoIcon from '@mui/icons-material/Info'

const sourceId = 'image-tiles-source'
const layerId = 'image-tiles-layer'

type Props = {
  mode: ImagesMode
  onSelect?: (image: GetByItemIdImageDtoOut) => void
  serviceId?: ServiceConfig
  modelList?: string[]
  projectId?: string
  externalOrgId?: string
  pageUse: 'gallery' | 'task' | 'itv'
}

const ImagesSelector: FC<Props> = ({
  mode = ImagesMode.Editor,
  onSelect,
  serviceId,
  modelList,
  projectId,
  externalOrgId,
  pageUse,
}: Props) => {
  const [searchValue, setSearchValue] = useState<SearchImagesDtoIn>({})

  const {
    selectSearchItem,
    setSelectSearchItem,
    setSelectedImage,
    setUploadStep,
    imageSort,
    action,
    uploadStep,
    imageProcessData,
    setImageProcessData,
    setAction,
    setImageMode,
    imagesMode,
    setSearchImage,
    viewType,
    setViewType,
    selectedImage,
    currentPage,
    setCurrentPage,
    resetPagination,
    pageSize,
    setShowImageDialog,
  } = useImages()
  const { isLg } = useResponsive()
  const { t } = useTranslation('common')
  const { mapLibre } = useMapStore()
  const searchParams = useSearchParams()
  const { showAlert, showLoading, hideLoading } = useGlobalUI()
  const [showProcessTask, setShowProcessTask] = useState(false)
  const [showUpdateImage, setShowUpdateImage] = useState(false)
  const [showSharedImage, setShowSharedImage] = useState(false)

  const profile = useProfileStore((state) => state.profile)

  useEffect(() => {
    if (mode) {
      setImageMode(mode)
    }
  }, [mode, setImageMode])

  const orgId = useMemo(() => {
    if (profile?.roleId === Roles.superAdmin || profile?.roleId === Roles.admin) {
      if (externalOrgId) {
        return externalOrgId
      } else {
        const orgId = searchParams.get('orgId')
        return typeof orgId === 'string' ? orgId : ''
      }
    } else {
      return ''
    }
  }, [searchParams, profile, externalOrgId])

  const searchPayload: SearchImagesDtoIn = useMemo(() => {
    return {
      startAt: searchValue.startAt ? (new Date(searchValue.startAt).toISOString() as any) : undefined,
      endAt: searchValue.endAt ? (new Date(searchValue.endAt).toISOString() as any) : undefined,
      keyword: searchValue.keyword ? searchValue.keyword.trim() : '',
      tag: searchValue.tag ? searchValue.tag.trim() : '',
      serviceId: searchValue.serviceId || (serviceId as string | undefined),
      modelList: modelList ? modelList.join(',') : '',
      projectId: projectId ?? '',
      orgId,
      sortField: imageSort.orderBy,
      sortOrder: imageSort.order,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    }
  }, [searchValue, serviceId, modelList, projectId, orgId, imageSort, currentPage, pageSize])

  const {
    data,
    isFetching,
    refetch: refetchSearch,
  }: UseQueryResult<SearchImagesDtoOut | undefined, Error> = useQuery({
    queryKey: ['search-images', searchPayload],
    queryFn: ({ signal }) => {
      return service.image.search(searchPayload, { signal })
    },
  })

  useEffect(() => {
    if (data) {
      setSelectSearchItem(null)
      setSelectedImage(null)
    }
  }, [data, setSelectSearchItem, setSelectedImage])

  // keep search image function to zustand
  useEffect(() => {
    setSearchImage(refetchSearch)
  }, [setSearchImage, refetchSearch])

  const onDelete = useCallback(
    (image: { itemId: string | null; imageId: string | null }) => {
      showAlert({
        status: 'confirm-delete',
        showCancel: true,
        title: t('gallery.alert.deleteTitle'),
        content: t('gallery.alert.deleteContent'),
        onConfirm: async () => {
          showLoading()
          try {
            await service.image.delete({ id: image.imageId as string })
            showAlert({
              status: 'success',
              title: t('alert.deleteSuccess'),
            })
            setImageProcessData(undefined)
            refetchSearch()
            setAction(null)
            setSelectedImage(null)
            setUploadStep(null)
            setSelectSearchItem(null)
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
    },
    [
      refetchSearch,
      showAlert,
      showLoading,
      hideLoading,
      setImageProcessData,
      setAction,
      setSelectedImage,
      setUploadStep,
      t,
      setSelectSearchItem,
    ],
  )

  const onDownload = useCallback(
    (href: string) => {
      if (href) {
        downloadFileItem(href)
        setAction(null)
      }
    },
    [setAction],
  )

  useEffect(() => {
    if (action) {
      if (action.action === ImageAction.Delete) {
        onDelete(action.image)
      } else if (action.action === ImageAction.Show) {
        setShowProcessTask(true)
      } else if (action.action === ImageAction.Edit) {
        setShowUpdateImage(true)
      } else if (action.action === ImageAction.Share) {
        setShowSharedImage(true)
      } else if (action.action === ImageAction.Download) {
        onDownload(action.image?.originalFileUrl || '')
      }
    }
  }, [action, onDelete, onDownload])

  const searchResult = useMemo(() => {
    if (data) {
      // add in-process item
      const isInProcess = imageProcessData && uploadStep !== null && imagesMode === ImagesMode.Editor
      if (isInProcess) {
        const temp: SearchImagesResultItem = {
          id: imageProcessData.itemId || '',
          thumbnailUrl: null,
          fileName: imageProcessData.name || '',
          uploadDate: null,
          userBy: null,
          imagingDate: null,
          tags: [],
          metadata: null,
          geometry: null,
          tileUrl: null,
          isProcessed: false,
          statusId: Number(imageProcessData.statusId),
          imageId: null,
          originalFileUrl: null,
          canDelete: false,
          hashtags: [],
          createdByUser: null,
          serviceId: Number(imageProcessData.serviceId),
          organizationId: imageProcessData.organizationId,
        }

        return {
          data: [temp, ...data.data],
          total: data.total + 1,
        }
      } else if (imagesMode === ImagesMode.Selector) {
        return {
          data: data.data.filter(
            (item) => item.statusId !== ImageStatus.aborted && item.statusId !== ImageStatus.failed,
          ),
          total: data.total,
        }
      } else {
        return data
      }
    }
  }, [data, imageProcessData, imagesMode, uploadStep])

  const { data: imageData }: UseQueryResult<GetByItemIdImageDtoOut, Error> = useQuery({
    queryKey: ['get-images', selectSearchItem],
    queryFn: ({ signal }) => service.image.get(selectSearchItem?.id as string, { signal }),
    enabled: !!selectSearchItem?.id,
  })

  useEffect(() => {
    if (imageData) {
      onSelect?.(imageData)
      setSelectedImage(imageData)
    }
  }, [onSelect, imageData, setSelectedImage])

  const mapImage = useMemo(() => {
    return mapLibre[imageMapId]
  }, [mapLibre])

  const removeLayerAndSource = useCallback(() => {
    if (!mapImage || !mapImage.isStyleLoaded()) return
    if (mapImage?.getLayer(layerId)) {
      mapImage.removeLayer(layerId)
    }
    if (mapImage?.getSource(sourceId)) {
      mapImage.removeSource(sourceId)
    }
  }, [mapImage])

  useEffect(() => {
    if (!mapImage) return
    removeLayerAndSource()
    if (selectSearchItem?.tileUrl) {
      addImageToMap(mapImage, {
        sourceId,
        layerId,
        tileUrl: selectSearchItem.tileUrl,
        geometry: selectSearchItem?.geometry,
      })
    }
    return removeLayerAndSource
  }, [selectSearchItem, mapImage, removeLayerAndSource])

  const onCloseProcessTask = useCallback(() => {
    setShowProcessTask(false)
    setAction(null)
  }, [setAction])

  const onCloseUpdateImage = useCallback(() => {
    setShowUpdateImage(false)
    setAction(null)
  }, [setAction])

  const onEditSuccess = useCallback(
    (editData: any) => {
      setShowUpdateImage(false)
      setAction(null)
      setSelectSearchItem({
        ...selectSearchItem,
        fileName: editData.name,
        imagingDate: editData.imagingDate,
        tags: editData.hashtags?.split(',') || [],
      } as any)
      setSelectedImage({
        ...selectedImage,
        name: editData.name,
        imagingDate: editData.imagingDate,
        hashtags: editData.hashtags?.split(',')?.map((item: string) => ({ name: item })) || [],
      } as any)
      refetchSearch()
    },
    [setAction, refetchSearch, selectSearchItem, selectedImage, setSelectSearchItem, setSelectedImage],
  )

  const onCloseSharedImage = useCallback(() => {
    setShowSharedImage(false)
    setAction(null)
  }, [setAction])

  const onShareSuccess = useCallback(() => {
    setShowSharedImage(false)
    setAction(null)
  }, [setAction])

  const onCloseActionDialog = useCallback(() => {
    setAction(null)
  }, [setAction])

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
    },
    [setCurrentPage],
  )

  // Reset pagination when search params change (except token)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger
  useEffect(() => {
    resetPagination()
  }, [searchValue, serviceId, modelList, projectId, orgId, imageSort.orderBy, imageSort.order, resetPagination])

  return (
    <div className='flex min-h-[600px] flex-col gap-2 p-0 lg:h-full lg:flex-row lg:p-6'>
      <div className='h-full bg-white p-0 lg:w-[50%] lg:px-6 lg:pt-6 lg:pb-0'>
        <SearchPanel onChange={setSearchValue} loading={isFetching}>
          <ResultSwitch value={viewType} onChange={setViewType} />
        </SearchPanel>
        <Divider className='!mt-4' />
        {!isLg && (
          <div>
            <div className='relative h-[260px] min-h-0 w-full flex-1'>
              <MapView mapId={imageMapId} isShowBasicTools={false} />
              {selectedImage && (
                <div className='absolute right-0 bottom-6 left-0 z-10 flex flex-col items-end gap-2 px-4'>
                  <div className='pointer-events-auto flex flex-col gap-2 rounded-xl p-2 backdrop-blur-sm'>
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
                        <IconButton
                          className='!h-8 !w-8 !rounded-none !p-1.5 !bg-transparent grow'
                          onClick={() => setShowImageDialog(true)}
                        >
                          <InfoIcon
                            sx={{ width: 20, height: 20, color: 'var(--color-text-icon-secondary)' }}
                            className='group-hover:!text-white'
                          />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
            <Divider />
          </div>
        )}
        <ResultPanel
          mode={mode}
          viewType={viewType}
          data={searchResult}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          pageUse={pageUse}
        />
      </div>

      <DetailPanel />
      {action?.action === ImageAction.Show && (
        <ProcessTask
          visible={showProcessTask}
          setVisible={onCloseProcessTask}
          imageId={action?.image?.imageId || null}
          fileName={action?.image?.fileName || null}
        />
      )}
      {action?.action === ImageAction.Edit && (
        <UpdateImage
          visible={showUpdateImage}
          setVisible={onCloseUpdateImage}
          imageId={action?.image?.imageId || null}
          imageData={action?.image || null}
          onSuccess={onEditSuccess}
        />
      )}
      {action?.action === ImageAction.Share && (
        <SharedImage
          visible={showSharedImage}
          setVisible={onCloseSharedImage}
          imageId={action?.image?.imageId || null}
          imageData={action?.image || null}
          onSuccess={onShareSuccess}
        />
      )}
      {action?.action === ImageAction.CreateTask && (
        <TaskCreator onClose={onCloseActionDialog} imageData={action?.image || null} />
      )}
    </div>
  )
}

export default ImagesSelector
