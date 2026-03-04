'use client'

import React from 'react'
import { Button, Divider } from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import InputLabel from '@/components/common/input/InputLabel'
import { GetResultImageDtoOut } from '@interfaces/index'
import { Language } from '@interfaces/config'
import { HierarchicalLookupNode } from '@/utils/transformData'
import { formatDateTime } from '@/utils/formatDate'
import type { ModelResult } from '../hooks/types'
import ImagePreview from './ImagePreview'
import ModelResultsTable from './ModelResultsTable'

interface ChangeDetectionFormProps {
  selectedImages: (GetResultImageDtoOut | null)[]
  setSelectedImages: React.Dispatch<React.SetStateAction<(GetResultImageDtoOut | null)[]>>
  selectedModelResults: ModelResult[]
  setSelectedModelResults: React.Dispatch<React.SetStateAction<ModelResult[]>>
  featureTree: HierarchicalLookupNode[]
  getLeafIds: (node: HierarchicalLookupNode) => number[]
  watchedModelIds: number[]
  language: string
  loading: boolean
  imageLoading: boolean
  viewOnly?: boolean
  t: (key: string, options?: any) => string
  onOpenGallery: (slot: number) => void
}

const ChangeDetectionForm: React.FC<ChangeDetectionFormProps> = ({
  selectedImages,
  setSelectedImages,
  selectedModelResults,
  setSelectedModelResults,
  featureTree,
  getLeafIds,
  watchedModelIds,
  language,
  loading,
  imageLoading,
  viewOnly,
  t,
  onOpenGallery,
}) => {
  const handleRemoveImage = (slot: number) => {
    const newSelectedImages = [...selectedImages]
    newSelectedImages[slot] = null
    setSelectedImages(newSelectedImages)
    const newSelectedModelResults = selectedModelResults.filter((mr) => mr.comparisonsTypeId !== slot + 1)
    setSelectedModelResults(newSelectedModelResults)
  }

  const handleSelectModelResult = (modelResult: ModelResult) => {
    const newSelectedModelResults = selectedModelResults.filter(
      (mr) => mr.comparisonsTypeId !== modelResult.comparisonsTypeId || mr.groupModelId !== modelResult.groupModelId,
    )
    newSelectedModelResults.push(modelResult)
    setSelectedModelResults(newSelectedModelResults)
  }

  const renderSlot = (slot: number, label: string) => {
    const image = selectedImages[slot]
    return (
      <div>
        <InputLabel className='font-medium' required>
          {t(`form.taskForm.${label}`)}
        </InputLabel>
        {image ? (
          <div className='flex flex-col gap-4'>
            <ImagePreview
              image={image}
              onRemove={() => handleRemoveImage(slot)}
              language={language}
              titleLabel={t('form.taskForm.imageName')}
              captureDateLabel={t('form.taskForm.captureDate')}
              hashtagLabel={t('form.taskForm.hashtag')}
              formatDateFn={formatDateTime}
              loading={loading}
              viewOnly={viewOnly}
            />
            {featureTree[0]?.children
              ?.filter((node) => node.children.flatMap((n) => getLeafIds(n)).some((id) => watchedModelIds.includes(id)))
              .map((node) => (
                <div key={node.id}>
                  <Divider className='mb-4! hidden lg:block' />
                  <InputLabel className='font-medium' required>
                    {t('form.taskForm.selectDetectionModel', {
                      name: language === Language.TH ? node.name : node.nameEn,
                    })}
                  </InputLabel>
                  <div className='overflow-hidden rounded-lg border border-(--color-divider)'>
                    <div className='overflow-x-auto'>
                      <ModelResultsTable
                        slot={slot}
                        modelId={node.id}
                        image={image}
                        selectedModelResults={selectedModelResults}
                        onSelectModelResult={handleSelectModelResult}
                        loading={loading}
                        viewOnly={viewOnly}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className='flex items-center justify-center rounded-lg border border-primary border-dashed p-6'>
            <Button
              variant='contained'
              color='primary'
              disabled={imageLoading || viewOnly}
              onClick={() => onOpenGallery(slot)}
              startIcon={<ImageIcon />}
            >
              {t('form.taskForm.selectFromGallery')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center'>
      <div className='flex w-full max-w-[calc(100vw-80px)] flex-col gap-4 lg:w-7xl lg:max-w-[calc(100vw-112px)] lg:flex-row'>
        <div className='flex-1 overflow-hidden'>{renderSlot(0, 'selectBaseImage')}</div>
        <div className='border-(--color-divider) border-t lg:border-t-0 lg:border-r' />
        <div className='flex-1 overflow-hidden'>{renderSlot(1, 'selectComparisonImage')}</div>
      </div>
    </div>
  )
}

export default ChangeDetectionForm
