'use client'

import React from 'react'
import { Chip, Tooltip, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import Image from 'next/image'
import { GetResultImageDtoOut } from '@interfaces/index'
import useResponsive from '@/hook/responsive'
import { ProcessCompleteIcon } from '../../common/images/svg'

interface ImagePreviewProps {
  image: GetResultImageDtoOut | null
  onRemove: () => void
  language: string
  titleLabel?: React.ReactNode
  captureDateLabel?: React.ReactNode
  hashtagLabel?: React.ReactNode
  formatDateFn?: (date: string | Date, lang?: string) => string
  loading?: boolean
  viewOnly?: boolean
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  onRemove,
  language,
  titleLabel,
  captureDateLabel,
  hashtagLabel,
  formatDateFn,
  loading,
  viewOnly,
}) => {
  const { is2K } = useResponsive()
  if (!image) return null
  return (
    <div className='relative flex flex-col items-start rounded-lg bg-(--color-background-default) sm:flex-row'>
      <div className='relative h-24 w-full shrink-0 overflow-hidden rounded sm:m-4 sm:w-24'>
        {image.imageUrl ? (
          <Image className='object-cover' src={image.imageUrl} alt={image.image.name} fill />
        ) : (
          <div className='flex h-full w-full items-center justify-center sm:h-auto'>
            <ProcessCompleteIcon width={is2K ? 105 : 70} height={is2K ? 105 : 70} />
          </div>
        )}
      </div>
      <div className='flex w-full min-w-0 flex-1 flex-col gap-4 p-4 text-sm sm:px-0'>
        <div className='flex gap-1'>
          <label className='shrink-0 text-(--color-text-secondary)'>{titleLabel}:</label>
          <Tooltip title={image.image.name} arrow>
            <label className='truncate'>{image.image.name}</label>
          </Tooltip>
        </div>
        <div className='flex gap-1'>
          <label className='shrink-0 text-(--color-text-secondary)'>{captureDateLabel}:</label>
          <label className='truncate'>
            {image.image.imagingDate && formatDateFn ? formatDateFn(image.image.imagingDate, language) : ''}
          </label>
        </div>
        <div className='flex gap-1'>
          <label className='shrink-0 text-(--color-text-secondary)'>{hashtagLabel}:</label>
          <div className='-mt-[3px] flex flex-wrap gap-2'>
            {image.image.imageHashtags?.map(({ id, hashtag }) => (
              <Chip key={id} label={hashtag.name} size='small' color='primary' />
            ))}
          </div>
        </div>
      </div>
      {!viewOnly && (
        <div className='absolute top-0 right-0 flex-shrink-0 p-2 sm:relative'>
          <IconButton color='error' onClick={onRemove} size='small' disabled={loading}>
            <DeleteIcon />
          </IconButton>
        </div>
      )}
    </div>
  )
}

export default ImagePreview
