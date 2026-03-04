/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { PostTasksDtoIn, PutTasksDtoIn, GetResultImageDtoOut } from '@interfaces/index'
import { TaskMode } from '@interfaces/config'
import type { FormValues, ModelResult, SarFeature } from './types'

interface UseTaskFormSaveParams {
  projectId?: string
  taskId?: string
  watchedServiceId?: number
  watchedRootModelId?: number
  selectedImages: (GetResultImageDtoOut | null)[]
  selectedModelResults: ModelResult[]
  sarFeatures: SarFeature[]
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
}

export function useTaskFormSave({
  projectId,
  taskId,
  watchedServiceId,
  watchedRootModelId,
  selectedImages,
  selectedModelResults,
  sarFeatures,
  setLoading,
}: UseTaskFormSaveParams) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()

  const saveName = () => async (data: FormValues) => {
    setLoading(true)
    if (taskId) {
      try {
        await service.tasks.update(taskId, {
          mode: TaskMode.editNameOnly,
          name: data.name,
        } as PutTasksDtoIn)
        showAlert({ status: 'success', title: t('alert.saveSuccess') })
        router.replace(`/project/${projectId}/task`)
      } catch (err: any) {
        showAlert({ status: 'error', errorCode: err?.message })
      } finally {
        setLoading(false)
      }
    }
  }

  const buildSarPayload = (): Partial<PostTasksDtoIn | PutTasksDtoIn> => {
    const includedPayload: Partial<PostTasksDtoIn | PutTasksDtoIn> = {}
    includedPayload.images = selectedImages
      .filter((item) => item !== null)
      .map(({ image }, idx) => ({
        imageId: image.id,
        itemId: image.itemId ?? '',
        comparisonsTypeId: idx === 0 ? 1 : 2,
      }))

    const importedFeatures: any[] = []
    const extentFeatures: any[] = []
    const drawingFeatures: any[] = []
    for (const feature of sarFeatures) {
      const jsonFeature = JSON.stringify({
        type: feature.geomType,
        coordinates: feature.geomType === 'Polygon' ? [feature.coords] : feature.coords,
      })
      switch (feature.source) {
        case 'import':
          importedFeatures.push({ geometry: jsonFeature })
          break
        case 'extent':
          extentFeatures.push({ geometry: jsonFeature, ...feature.sourceData })
          break
        case 'draw':
          drawingFeatures.push({ geometry: jsonFeature })
          break
      }
    }
    includedPayload.aoiVectors = importedFeatures as any[]
    includedPayload.aoiCoordinates = extentFeatures
    includedPayload.aoiGeometryCollections = drawingFeatures
    return includedPayload
  }

  const buildNonSarPayload = (): Partial<PostTasksDtoIn | PutTasksDtoIn> => {
    const includedPayload: Partial<PostTasksDtoIn | PutTasksDtoIn> = {}
    switch (watchedRootModelId) {
      case 1: // Object Detection
        includedPayload.images = selectedImages
          .filter((item) => item !== null)
          .map(({ image }) => ({
            imageId: image.id,
            itemId: image.itemId ?? '',
          }))
        break
      case 4: // Change Detection
        includedPayload.images = selectedImages
          .filter((item) => item !== null)
          .map(({ image }, idx) => ({
            imageId: image.id,
            itemId: image.itemId ?? '',
            comparisonsTypeId: idx === 0 ? 1 : 2,
          }))
        includedPayload.selectResults = selectedModelResults
        break
    }
    return includedPayload
  }

  const save = (mode: TaskMode) => async (data: FormValues) => {
    setLoading(true)
    try {
      const includedPayload = watchedServiceId === 2 ? buildSarPayload() : buildNonSarPayload()

      const payload: Partial<PostTasksDtoIn | PutTasksDtoIn> = {
        projectId,
        mode,
        name: data.name,
        serviceId: Number(data.serviceId),
        rootModelId: Number(data.rootModelId),
        modelIds: data.modelIds.map(Number),
        ...includedPayload,
      }

      let resultId: string | undefined
      if (taskId) {
        await service.tasks.update(String(taskId), payload as PutTasksDtoIn)
        resultId = String(taskId)
      } else {
        resultId = (await service.tasks.create(payload as PostTasksDtoIn)).id
      }

      showAlert({ status: 'success', title: t('alert.saveSuccess') })

      if (mode === TaskMode.saveAndProcess) {
        router.replace(`/project/${projectId}/task`)
      } else if (resultId) {
        router.replace(`/project/${projectId}/task/${resultId}`)
      }
    } catch (err: any) {
      showAlert({ status: 'error', errorCode: err?.message })
    } finally {
      setLoading(false)
    }
  }

  return { saveName, save }
}
