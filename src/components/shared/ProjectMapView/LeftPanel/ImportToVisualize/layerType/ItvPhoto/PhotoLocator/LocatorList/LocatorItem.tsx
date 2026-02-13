import { ItvPhotoFeature, ItvPhotoLocatorTab } from '../../itv-photo'
import { FC, memo, useMemo } from 'react'
import Image from 'next/image'
import { Check } from '@mui/icons-material'
import { Tooltip } from '@mui/material'
import importToVisualize from '@/api/import-to-visualize'

interface LocatorItemProps {
  photo: ItvPhotoFeature
  onClick: (photo: ItvPhotoFeature) => void
  selected: boolean
  currentTab: ItvPhotoLocatorTab
}

const LocatorItem: FC<LocatorItemProps> = ({ photo, onClick, selected, currentTab }: LocatorItemProps) => {
  const isNoAddressOrAllTab = useMemo(
    () => currentTab === ItvPhotoLocatorTab.NO_ADDRESS || currentTab === ItvPhotoLocatorTab.ALL,
    [currentTab],
  )
  const thumbnailUrl = useMemo(() => {
    const url = importToVisualize.getThumbnailUrl({ uploadId: photo.uploadId })
    return url
  }, [photo])

  return (
    <button
      type='button'
      onClick={() => onClick?.(photo)}
      className={`flex cursor-pointer flex-col items-center justify-center py-2 hover:bg-[#E0E9FF] lg:px-4`}
    >
      <div className='relative flex aspect-7/5 w-full max-w-[300px] items-center justify-center overflow-hidden'>
        {thumbnailUrl && (
          <Image fill src={thumbnailUrl} alt={'Photo Thumbnail'} draggable={false} className='object-contain' />
        )}
        {isNoAddressOrAllTab && selected && (
          <div className='absolute right-2 bottom-2 flex h-5 w-5 rounded-full bg-primary'>
            <Check sx={{ color: 'white' }} fontSize='small' />
          </div>
        )}
      </div>
      <div className='flex w-full flex-wrap items-center justify-center pt-2 pb-1'>
        <Tooltip title={photo.fileName || ''} arrow>
          <div className='flex min-w-0 items-center truncate text-[12px]'>
            <span className='max-w-[200px] truncate'>{photo.fileName}</span>
          </div>
        </Tooltip>
      </div>
    </button>
  )
}

export default memo(LocatorItem)
