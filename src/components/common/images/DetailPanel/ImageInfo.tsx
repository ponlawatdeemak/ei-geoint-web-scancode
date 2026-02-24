import { formatDateTime } from '@/utils/formatDate'
import { AutoAwesome, GroupAdd, Edit, FileDownload, Delete, FormatListBulletedAdd } from '@mui/icons-material'
import { IconButton, Divider, Typography, Button, Tooltip } from '@mui/material'
import { memo, useCallback, useMemo } from 'react'
import MetadataEditor from '../../editor/MetadataEditor'
import Empty from '../../empty'
import { useImages } from '../use-images'
import { useSettings } from '@/hook/useSettings'
import { useTranslation } from 'react-i18next'
import useResponsive from '@/hook/responsive'
import { checkIsInProgress, ImageAction, ImagesMode, ImageUploadStep } from '../images'
import { ImageStatus, Roles } from '@interfaces/config'
import LinearProgressWithLabel from '../../display/UploadProgress/LinearProgressWithLabel'
import { useProfileStore } from '@/hook/useProfileStore'
import { ThaicomImageStatus } from '@interfaces/config/thaicom.config'
import { GetByItemIdImageDtoOut } from '@interfaces/dto/images'
import classNames from 'classnames'

interface ImageInfoProps {
  selectedImage: GetByItemIdImageDtoOut | null
  pageUse?: 'itv' | 'gallery'
  mode?: ImagesMode
}

const ImageInfo = ({ selectedImage, pageUse = 'gallery', mode }: ImageInfoProps) => {
  const {
    selectSearchItem,
    setAction,
    imagesMode,
    uploadStep,
    uploadProgress,
    wssImageData,

    cancelUpload,
  } = useImages()
  const { language } = useSettings()
  const { t } = useTranslation('common')
  const { isLg } = useResponsive()
  const profile = useProfileStore((state) => state.profile)

  const createdByUser = useMemo(() => {
    const user = selectedImage?.createdByUser
    return user?.firstName && user?.lastName ? `${user?.firstName} ${user?.lastName}` : '-'
  }, [selectedImage])

  const onCancel = () => {
    cancelUpload?.()
  }

  const isEditor = useMemo(
    () => (mode ? mode === ImagesMode.Editor : imagesMode === ImagesMode.Editor),
    [imagesMode, mode],
  )

  const isInProgress = useMemo(() => checkIsInProgress(Number(selectedImage?.statusId)), [selectedImage])
  const isAbortOrFail = useMemo(
    () => [ImageStatus.aborted, ImageStatus.failed].includes(Number(selectedImage?.statusId)),
    [selectedImage],
  )

  const isShowAction = useMemo(() => {
    return !isInProgress && !isAbortOrFail
  }, [isInProgress, isAbortOrFail])

  const isViewer = useMemo(() => {
    if (!profile) return false
    return profile.roleId === Roles.viewer
  }, [profile])

  const onActionClick = useCallback(
    (action: ImageAction) => {
      if (selectedImage && selectSearchItem) {
        setAction({
          action,
          image: {
            imageId: selectedImage.id,
            itemId: selectedImage.itemId as string,
            fileName: selectedImage.name,
            imagingDate: selectedImage.imagingDate,
            hashtags: selectedImage.hashtags?.map((item) => item.name).join(','),
            originalFileUrl: selectSearchItem.originalFileUrl || '',
            serviceId: selectedImage.serviceId ? Number(selectedImage.serviceId) : null,
            isProcessed: selectSearchItem.isProcessed,
            organizationId: selectedImage.organizationId,
          },
        })
      }
    },
    [setAction, selectedImage, selectSearchItem],
  )

  const canDelete = useMemo(() => {
    if (profile && selectSearchItem) {
      const isRoleAllowed = profile.roleId === Roles.superAdmin || profile.roleId === Roles.admin
      const temp = selectSearchItem.canDelete
      return isRoleAllowed && temp
    } else {
      return false
    }
  }, [profile, selectSearchItem])

  const canEdit = useMemo(() => {
    if (!profile) return false
    return (
      profile.roleId === Roles.superAdmin ||
      profile.roleId === Roles.admin ||
      profile.roleId === Roles.customerAdmin ||
      profile.roleId === Roles.user
    )
  }, [profile])

  return (
    <div className='lg:h-[60%] lg:overflow-auto'>
      {selectedImage ? (
        <div className={classNames('flex flex-1 flex-col gap-4', { 'lg:p-6': pageUse === 'gallery' })}>
          <Divider />
          <div className='flex flex-wrap items-center justify-between gap-6'>
            {(isLg || pageUse === 'itv') && <div className=''>{selectedImage?.name}</div>}
            {isEditor && (
              <div className='flex flex-wrap gap-2 [&>.MuiIconButton-root]:h-10! [&>.MuiIconButton-root]:w-10! [&>.MuiIconButton-root]:rounded-sm! [&>.MuiIconButton-root]:bg-(--color-background-light)!'>
                {isShowAction && (
                  <>
                    <Tooltip title={t('gallery.imagesSelector.contextMenu.show')} arrow>
                      <IconButton className='' onClick={() => onActionClick(ImageAction.Show)}>
                        <AutoAwesome />
                      </IconButton>
                    </Tooltip>
                    {!isViewer && (
                      <Tooltip title={t('gallery.imagesSelector.contextMenu.createTask')} arrow>
                        <IconButton onClick={() => onActionClick(ImageAction.CreateTask)}>
                          <FormatListBulletedAdd className='' />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!isViewer && (
                      <Tooltip title={t('gallery.imagesSelector.contextMenu.shared')} arrow>
                        <IconButton onClick={() => onActionClick(ImageAction.Share)}>
                          <GroupAdd className='' />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEdit && (
                      <Tooltip title={t('gallery.imagesSelector.contextMenu.edit')} arrow>
                        <IconButton onClick={() => onActionClick(ImageAction.Edit)}>
                          <Edit className='' />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!isViewer && (
                      <Tooltip title={t('gallery.imagesSelector.contextMenu.download')} arrow>
                        <IconButton onClick={() => onActionClick(ImageAction.Download)}>
                          <FileDownload className='' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                )}
                {canDelete && (
                  <Tooltip title={t('gallery.imagesSelector.contextMenu.delete')} arrow>
                    <IconButton onClick={() => onActionClick(ImageAction.Delete)}>
                      <Delete color='error' />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          <Divider />
          <div className='grid grid-cols-1 gap-2 xl:grid-cols-2'>
            <div className='flex gap-2'>
              <div className='text-gray'>{t('gallery.imagesSelector.detail.service')}:</div>
              <div>
                <Typography variant='body1' color='primary'>
                  {selectedImage?.service?.[language === 'th' ? 'name' : 'nameEn'] || '-'}
                </Typography>
              </div>
            </div>
            <div className='flex gap-2'>
              <div className='text-gray'>{t('gallery.imagesSelector.detail.imagingDate')}:</div>
              <div>{selectedImage?.imagingDate ? formatDateTime(selectedImage?.imagingDate, language) : '-'}</div>
            </div>
            <div className='flex gap-2'>
              <div className='text-gray'>{t('gallery.imagesSelector.detail.createdAt')}:</div>
              <div>{selectedImage?.createdAt ? formatDateTime(selectedImage?.createdAt, language) : '-'}</div>
            </div>
            <div className='flex gap-2'>
              <div className='text-gray'>{t('gallery.imagesSelector.detail.createdBy')}:</div>
              <div>{createdByUser}</div>
            </div>
            <div className='flex gap-2'>
              <div className='min-w-20 text-gray'>{t('gallery.imagesSelector.detail.hashtags')}:</div>
              <div className='flex flex-wrap gap-2'>
                {(selectedImage?.hashtags?.length || 0) > 0
                  ? selectedImage?.hashtags?.map((item) => (
                      <div key={item.id} className='rounded-[100px] bg-[#1976D2] px-2 text-white'>
                        {item.name}
                      </div>
                    ))
                  : '-'}
              </div>
            </div>
          </div>
          <div className='flex-1'>
            {selectedImage?.metadata && (
              <>
                <Divider />
                <MetadataEditor className='h-full' disabled value={selectedImage.metadata as string} />
              </>
            )}
          </div>
          {isInProgress && (
            <div className='flex flex-col gap-6'>
              <Divider />
              {/* {(wssImageData?.data.processing_status === ThaicomImageStatus.QUEUED ||
                wssImageData?.data.processing_status === ThaicomImageStatus.UPLOAD_PENDING) &&
              uploadStep !== ImageUploadStep.Upload ? (
                <div className='text-error'>{t('gallery.alert.errorUpload')}</div>
              ) : (
			)} */}
              <LinearProgressWithLabel uploadStep={uploadStep} value={uploadProgress} />
              <div className='flex items-center justify-center'>
                <Button variant='outlined' className='w-[140px]' onClick={onCancel}>
                  {t('button.cancel')}
                </Button>
              </div>
            </div>
          )}

          {Number(selectedImage.statusId) === ImageStatus.failed && (
            <div className='flex flex-col gap-6'>
              <Divider />
              <div className='mt-4 flex flex-col gap-2'>
                <div className='flex gap-2'>
                  <div className='text-gray'>{t('gallery.imagesSelector.detail.processItem.failed.statusLabel')}:</div>
                  <div className='text-[#D32F2F]'>
                    {t('gallery.imagesSelector.detail.processItem.failed.statusText')}
                  </div>
                </div>
                <div className='flex gap-2'>
                  <div className='text-gray'>{t('gallery.imagesSelector.detail.processItem.failed.remarkLabel')}:</div>
                  <div>-</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <Empty className='my-12' message={t('empty.noImageDetail')} />
        </div>
      )}
    </div>
  )
}

export default memo(ImageInfo)
