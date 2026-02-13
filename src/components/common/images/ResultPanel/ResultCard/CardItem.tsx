import { SearchImagesResultItem } from '@interfaces/dto/images'
import { FC, memo, useMemo, useState } from 'react'
import Image from 'next/image'
import { AutoAwesome, Delete, Edit, FileDownload, FormatListBulletedAdd, GroupAdd, MoreVert } from '@mui/icons-material'
import { ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { checkIsInProgress, ImageAction, ImagesMode } from '../../images'
import { useImages } from '../../use-images'
import { ProcessAbortIcon, ProcessCompleteIcon, ProcessFailIcon, ProcessInProgressIcon } from '../../svg'
import { ImageStatus, Roles } from '@interfaces/config'
import useResponsive from '@/hook/responsive'
import { useProfileStore } from '@/hook/useProfileStore'

type Props = {
  item: SearchImagesResultItem
}

const CardItem: FC<Props> = ({ item }: Props) => {
  const { t } = useTranslation('common')
  const { isLg } = useResponsive()
  const profile = useProfileStore((state) => state.profile)
  const { selectSearchItem, imagesMode, setSelectSearchItem, setAction, imageProcessData } = useImages()
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
  } | null>(null)

  const canDelete = useMemo(() => {
    if (profile && item) {
      const isRoleAllowed = profile.roleId === Roles.superAdmin || profile.roleId === Roles.admin
      const temp = item.canDelete
      return isRoleAllowed && temp
    } else {
      return false
    }
  }, [profile, item])

  const canEdit = useMemo(() => {
    if (!profile) return false
    return (
      profile.roleId === Roles.superAdmin ||
      profile.roleId === Roles.admin ||
      profile.roleId === Roles.customerAdmin ||
      profile.roleId === Roles.user
    )
  }, [profile])

  const handleRightClick = (event: React.MouseEvent) => {
    event.preventDefault()
    if (!canDelete && !isShowAction) return

    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
          }
        : null,
    )

    // Prevent text selection lost after opening the context menu on Safari and Firefox
    const selection = document.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)

      setTimeout(() => {
        selection.addRange(range)
      })
    }
  }

  const onClose = () => {
    setContextMenu(null)
  }

  const onMenuClick = (value: ImageAction) => {
    setAction({
      action: value,
      image: {
        imageId: item.imageId,
        itemId: item.id,
        fileName: item.fileName,
        imagingDate: item.imagingDate,
        hashtags: item.hashtags?.map((item) => item.name).join(','),
        originalFileUrl: item.originalFileUrl,
        serviceId: item.serviceId,
        isProcessed: item.isProcessed,
        organizationId: item.organizationId,
      },
    })
    setContextMenu(null)
  }

  const onSelectImage = (item: SearchImagesResultItem) => {
    setSelectSearchItem(item)
  }

  const isEditor = useMemo(() => imagesMode === ImagesMode.Editor, [imagesMode])
  const isInProgress = useMemo(() => checkIsInProgress(Number(item?.statusId)), [item])
  const isAbortOrFail = useMemo(
    () => [ImageStatus.aborted, ImageStatus.failed].includes(Number(item?.statusId)),
    [item],
  )
  const isShowAction = useMemo(() => {
    return !isInProgress && !isAbortOrFail
  }, [isInProgress, isAbortOrFail])

  const isViewer = useMemo(() => {
    if (!profile) return false
    return profile.roleId === Roles.viewer
  }, [profile])

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-2 py-2 hover:bg-[#E0E9FF] lg:px-4 ${selectSearchItem?.id === item.id ? 'bg-[#E0E9FF]' : ''}`}
    >
      <button
        type='button'
        onContextMenu={isEditor ? handleRightClick : undefined}
        onClick={() => onSelectImage(item)}
        className='relative flex aspect-[7/5] w-full max-w-[300px] cursor-pointer items-center justify-center overflow-hidden'
      >
        {item.id === imageProcessData?.itemId ? (
          <>
            {isInProgress && <ProcessInProgressIcon width={70} height={70} />}
            {Number(imageProcessData?.statusId) === ImageStatus.aborted && <ProcessAbortIcon width={70} height={70} />}
            {Number(imageProcessData?.statusId) === ImageStatus.failed && <ProcessFailIcon width={70} height={70} />}
          </>
        ) : (
          <>
            {item.statusId === ImageStatus.aborted && <ProcessAbortIcon width={70} height={70} />}
            {item.statusId === ImageStatus.failed && <ProcessFailIcon width={70} height={70} />}
            {item.statusId === ImageStatus.completed && item.thumbnailUrl && (
              <Image src={item.thumbnailUrl} fill={true} alt={'Image Thumbnail'} />
            )}
            {item.statusId === ImageStatus.completed && !item.thumbnailUrl && (
              <ProcessCompleteIcon width={70} height={70} />
            )}
          </>
        )}
      </button>
      <div className='flex w-full flex-wrap items-center justify-between pb-1'>
        <Tooltip title={item.fileName || ''} arrow>
          <div className='flex min-w-0 items-center truncate text-[12px]'>
            <span className='max-w-[200px] truncate'>{item.fileName}</span>
            {item.isProcessed && <AutoAwesome className='!w-[16px] mx-2 shrink-0' color='primary' />}
            {!isLg && isEditor && <MoreVert className='!w-[16px] shrink-0 cursor-pointer' onClick={handleRightClick} />}
          </div>
        </Tooltip>
        <div className='flex'></div>
      </div>
      {isEditor && (
        <Menu
          open={contextMenu !== null}
          onClose={onClose}
          anchorReference='anchorPosition'
          anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        >
          {isShowAction && (
            <MenuItem onClick={() => onMenuClick(ImageAction.Show)} className='h-[40px] min-w-[270px]'>
              <ListItemIcon>
                <AutoAwesome className='' />
              </ListItemIcon>
              <ListItemText>{t('gallery.imagesSelector.contextMenu.show')}</ListItemText>
            </MenuItem>
          )}
          {isShowAction && !isViewer && (
            <MenuItem onClick={() => onMenuClick(ImageAction.CreateTask)} className='h-[40px] min-w-[270px]'>
              <ListItemIcon>
                <FormatListBulletedAdd className='' />
              </ListItemIcon>
              <ListItemText>{t('gallery.imagesSelector.contextMenu.createTask')}</ListItemText>
            </MenuItem>
          )}
          {isShowAction && !isViewer && (
            <MenuItem onClick={() => onMenuClick(ImageAction.Share)} className='h-[40px] min-w-[270px]'>
              <ListItemIcon>
                <GroupAdd className='' />
              </ListItemIcon>
              <ListItemText>{t('gallery.imagesSelector.contextMenu.shared')}</ListItemText>
            </MenuItem>
          )}
          {isShowAction && canEdit && (
            <MenuItem onClick={() => onMenuClick(ImageAction.Edit)} className='h-[40px] min-w-[270px]'>
              <ListItemIcon>
                <Edit className='' />
              </ListItemIcon>
              <ListItemText>{t('gallery.imagesSelector.contextMenu.edit')}</ListItemText>
            </MenuItem>
          )}
          {isShowAction && !isViewer && (
            <MenuItem onClick={() => onMenuClick(ImageAction.Download)} className='h-[40px] min-w-[270px]'>
              <ListItemIcon>
                <FileDownload className='' />
              </ListItemIcon>
              <ListItemText>{t('gallery.imagesSelector.contextMenu.download')}</ListItemText>
            </MenuItem>
          )}

          {canDelete && (
            <MenuItem onClick={() => onMenuClick(ImageAction.Delete)} className='!text-error h-[40px] min-w-[270px]'>
              <ListItemIcon>
                <Delete color='error' />
              </ListItemIcon>
              <ListItemText>{t('gallery.imagesSelector.contextMenu.delete')}</ListItemText>
            </MenuItem>
          )}
        </Menu>
      )}
    </div>
  )
}

export default memo(CardItem)
