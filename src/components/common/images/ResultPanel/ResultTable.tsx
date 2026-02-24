import { ImageStatus, Roles, SortType } from '@interfaces/config'
import { SearchImagesDtoOut, SearchImagesResultItem } from '@interfaces/dto/images'
import { FC, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { checkIsInProgress, ImageAction, ImageSortBy, ImagesMode } from '../images'
import { useImages } from '../use-images'
import MuiTableHOC, { MuiTableColumn } from '../../display/MuiTableHOC'
import { useSettings } from '@/hook/useSettings'
import { formatDateTime } from '@/utils/formatDate'
import { useProfileStore } from '@/hook/useProfileStore'
import { Tooltip, IconButton } from '@mui/material'
import { AutoAwesome, GroupAdd, Edit, FileDownload, Delete, FormatListBulletedAdd } from '@mui/icons-material'
import { ImgExampleIcon } from '@/icons'

type Props = {
  data: SearchImagesDtoOut
  currentPage?: number
  onPageChange?: (page: number) => void
  totalLabel?: string
  pageUse: 'gallery' | 'task' | 'itv'
}

const ResultTable: FC<Props> = ({
  data,
  currentPage = 1,
  onPageChange,
  totalLabel = 'table.totalSearchResult',
  pageUse,
}: Props) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const {
    imageSort,
    setImageSort,
    selectSearchItem,
    setSelectSearchItem,
    setAction,
    imagesMode,
    pageSize,
    setPageSize,
  } = useImages()
  const profile = useProfileStore((state) => state.profile)

  const isEditor = useMemo(() => imagesMode === ImagesMode.Editor, [imagesMode])

  const canEdit = useMemo(() => {
    if (!profile) return false
    return (
      profile.roleId === Roles.superAdmin ||
      profile.roleId === Roles.admin ||
      profile.roleId === Roles.customerAdmin ||
      profile.roleId === Roles.user
    )
  }, [profile])

  const checkCanDelete = useCallback(
    (item: SearchImagesResultItem) => {
      if (profile && item) {
        const isRoleAllowed = profile.roleId === Roles.superAdmin || profile.roleId === Roles.admin
        return isRoleAllowed && item.canDelete
      }
      return false
    },
    [profile],
  )

  const isViewer = useMemo(() => {
    if (!profile) return false
    return profile.roleId === Roles.viewer
  }, [profile])

  const onActionClick = useCallback(
    (action: ImageAction, item: SearchImagesResultItem) => {
      setAction({
        action,
        image: {
          imageId: item.imageId,
          itemId: item.id,
          fileName: item.fileName,
          imagingDate: item.imagingDate,
          hashtags: item.hashtags?.map((t) => t.name).join(','),
          originalFileUrl: item.originalFileUrl,
          serviceId: item.serviceId,
          isProcessed: item.isProcessed,
          organizationId: item.organizationId,
        },
      })
    },
    [setAction],
  )

  const columns: MuiTableColumn<SearchImagesResultItem>[] = useMemo(() => {
    const result = [
      {
        id: 'fileName',
        label: t('itv.popup.name'),
        sortable: true,
        // กำหนดความกว้างของ Column นี้ให้คงที่ (เช่น 300px)
        width: 300,
        render: (row: SearchImagesResultItem) => (
          <div className='flex items-center gap-2'>
            {/* ส่วน Icon ล็อกขนาดไว้ */}
            <div className='relative flex h-[40px] w-[50px] shrink-0 items-center justify-center overflow-hidden'>
              <ImgExampleIcon width={24} height={24} />
            </div>
            <div
              className='max-w-60 truncate font-medium text-sm'
              title={row.fileName || ''} // เอาเมาส์วางแล้วยังเห็นชื่อเต็มได้
            >
              {row.fileName}
            </div>
          </div>
        ),
      },
      {
        id: 'imagingDate',
        label: t('gallery.imagesSelector.detail.imagingDate'), // 'Imaging Date'
        // ปรับความกว้างให้ยาวขึ้นเล็กน้อยเพื่อให้วันที่ไม่เบียดกัน
        width: 160,
        render: (row: SearchImagesResultItem) => (
          <div className='whitespace-nowrap px-2 text-sm'>
            {row.imagingDate ? formatDateTime(row.imagingDate, language) : '-'}
          </div>
        ),
      },
      {
        id: 'userBy',
        label: t('gallery.imagesSelector.detail.createdBy'), // 'Created By'
        // กำหนดความกว้างคงที่เพื่อให้ truncate ทำงาน
        width: 180,
        render: (row: SearchImagesResultItem) => {
          const user = row.createdByUser
          const fullName = user?.firstName && user?.lastName ? `${user?.firstName} ${user?.lastName}` : '-'

          return (
            <div className='max-w-32 truncate text-sm' title={fullName !== '-' ? fullName : ''}>
              {fullName}
            </div>
          )
        },
      },
    ]
    if (pageUse === 'gallery' && isEditor) {
      result.push({
        id: 'actions',
        label: t('table.actions'), // 'Actions'
        align: 'right',
        render: (row: SearchImagesResultItem) => {
          const isInProgress = checkIsInProgress(Number(row.statusId))
          const isAbortOrFail = [ImageStatus.aborted, ImageStatus.failed].includes(Number(row.statusId))
          const isShowAction = !isInProgress && !isAbortOrFail

          return (
            <div className='flex items-center justify-end gap-1'>
              {isShowAction && (
                <>
                  <Tooltip title={t('gallery.imagesSelector.contextMenu.show')} arrow>
                    <IconButton
                      size='small'
                      color='primary'
                      onClick={(e) => {
                        e.stopPropagation()
                        onActionClick(ImageAction.Show, row)
                      }}
                    >
                      <AutoAwesome fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  {!isViewer && (
                    <Tooltip title={t('gallery.imagesSelector.contextMenu.shared')} arrow>
                      <IconButton
                        size='small'
                        color='primary'
                        onClick={(e) => {
                          e.stopPropagation()
                          onActionClick(ImageAction.Share, row)
                        }}
                      >
                        <GroupAdd fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!isViewer && (
                    <Tooltip title={t('gallery.imagesSelector.contextMenu.createTask')} arrow>
                      <IconButton
                        size='small'
                        color='primary'
                        onClick={(e) => {
                          e.stopPropagation()
                          onActionClick(ImageAction.CreateTask, row)
                        }}
                      >
                        <FormatListBulletedAdd fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canEdit && (
                    <Tooltip title={t('gallery.imagesSelector.contextMenu.edit')} arrow>
                      <IconButton
                        size='small'
                        color='primary'
                        onClick={(e) => {
                          e.stopPropagation()
                          onActionClick(ImageAction.Edit, row)
                        }}
                      >
                        <Edit fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!isViewer && (
                    <Tooltip title={t('gallery.imagesSelector.contextMenu.download')} arrow>
                      <IconButton
                        size='small'
                        color='primary'
                        onClick={(e) => {
                          e.stopPropagation()
                          onActionClick(ImageAction.Download, row)
                        }}
                      >
                        <FileDownload fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}

              {checkCanDelete(row) && (
                <Tooltip title={t('gallery.imagesSelector.contextMenu.delete')} arrow>
                  <IconButton
                    size='small'
                    color='error'
                    onClick={(e) => {
                      e.stopPropagation()
                      onActionClick(ImageAction.Delete, row)
                    }}
                  >
                    <Delete fontSize='small' />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          )
        },
      } as any)
    }
    return result
  }, [t, language, isEditor, isViewer, canEdit, checkCanDelete, onActionClick, pageUse])

  const handleSortChange = (orderBy: string, order: SortType) => {
    if (orderBy === 'fileName') {
      setImageSort({ orderBy: ImageSortBy.Name, order })
    }
  }

  return (
    <div className='h-full overflow-hidden'>
      <MuiTableHOC
        totalLabel={totalLabel}
        rowKey={(row) => row.id}
        columns={columns}
        rows={data.data}
        page={currentPage - 1}
        rowsPerPage={pageSize}
        totalRows={data.total}
        onPageChange={(newPage) => onPageChange?.(newPage + 1)}
        onRowsPerPageChange={(rowsPerPage) => {
          setPageSize(rowsPerPage)
        }}
        sortState={{
          orderBy: imageSort.orderBy === ImageSortBy.Name ? 'fileName' : imageSort.orderBy,
          order: imageSort.order,
        }}
        onSortChange={handleSortChange}
        onRowClick={(row) => {
          if (selectSearchItem?.id === row.id) {
            setSelectSearchItem(null)
          } else {
            setSelectSearchItem(row)
          }
        }}
        hidePagination={pageUse === 'task'}
      />
    </div>
  )
}

export default ResultTable
