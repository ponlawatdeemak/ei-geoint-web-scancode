'use client'

import React from 'react'
import { Button } from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import InputLabel from '@/components/common/input/InputLabel'
import { GetResultImageDtoOut } from '@interfaces/index'
import ImagePreview from './ImagePreview'

interface ObjectDetectionFormProps {
  selectedImages: (GetResultImageDtoOut | null)[]
  setSelectedImages: React.Dispatch<React.SetStateAction<(GetResultImageDtoOut | null)[]>>
  language: string
  loading: boolean
  imageLoading: boolean
  viewOnly?: boolean
  t: (key: string, options?: any) => string
  formatDateFn: (date: string | Date, lang?: string) => string
  onOpenGallery: () => void
}

const ObjectDetectionForm: React.FC<ObjectDetectionFormProps> = ({
  selectedImages,
  setSelectedImages,
  language,
  loading,
  imageLoading,
  viewOnly,
  t,
  formatDateFn,
  onOpenGallery,
}) => {
  const handleRemoveImage = () => {
    setSelectedImages([])
  }

  return (
    <div className='md:col-span-2'>
      <InputLabel className='font-medium' required>
        {t('form.taskForm.selectImage')}
      </InputLabel>
      {selectedImages[0] ? (
        <ImagePreview
          image={selectedImages[0]}
          onRemove={handleRemoveImage}
          language={language}
          titleLabel={t('form.taskForm.imageName')}
          captureDateLabel={t('form.taskForm.captureDate')}
          hashtagLabel={t('form.taskForm.hashtag')}
          formatDateFn={formatDateFn}
          loading={loading}
          viewOnly={viewOnly}
        />
      ) : (
        <div className='flex items-center justify-center rounded-lg border border-primary border-dashed p-6'>
          <Button
            variant='contained'
            color='primary'
            disabled={imageLoading || viewOnly}
            onClick={onOpenGallery}
            startIcon={<ImageIcon />}
          >
            {t('form.taskForm.selectFromGallery')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ObjectDetectionForm
