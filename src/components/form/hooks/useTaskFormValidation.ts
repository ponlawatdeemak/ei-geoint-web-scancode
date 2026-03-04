import { useMemo } from 'react'
import type { GetResultImageDtoOut } from '@interfaces/index'
import type { HierarchicalLookupNode } from '@/utils/transformData'
import type { ModelResult, SarFeature } from './types'

interface UseTaskFormValidationParams {
  watchedName: string
  watchedServiceId?: number
  watchedRootModelId?: number
  watchedModelIds: number[]
  activeStep: number
  selectedImages: (GetResultImageDtoOut | null)[]
  selectedModelResults: ModelResult[]
  featureTree: HierarchicalLookupNode[]
  getLeafIds: (node: HierarchicalLookupNode) => number[]
  sarFeatures: SarFeature[]
}

export function useTaskFormValidation({
  watchedName,
  watchedServiceId,
  watchedRootModelId,
  watchedModelIds,
  activeStep,
  selectedImages,
  selectedModelResults,
  featureTree,
  getLeafIds,
  sarFeatures,
}: UseTaskFormValidationParams) {
  const enableNextButton = useMemo(() => {
    switch (watchedServiceId) {
      case 1:
        return watchedName && watchedRootModelId && watchedModelIds.length > 0
      case 2:
        return (
          watchedName &&
          watchedRootModelId &&
          (activeStep === 0 || selectedImages.filter((item) => item !== null).length === 2)
        )
      default:
        return false
    }
  }, [watchedServiceId, watchedRootModelId, watchedModelIds, watchedName, activeStep, selectedImages])

  const enableSaveDraftButton = useMemo(() => {
    switch (watchedServiceId) {
      case 1:
        return watchedName && watchedRootModelId && watchedModelIds.length > 0
      case 2:
        return watchedName && watchedRootModelId
      default:
        return false
    }
  }, [watchedServiceId, watchedRootModelId, watchedModelIds, watchedName])

  const enableSaveAndProcessButton = useMemo(() => {
    switch (watchedServiceId) {
      case 1:
        if (watchedRootModelId === 1) {
          return selectedImages.filter((item) => item !== null).length === 1
        }
        if (watchedRootModelId === 4) {
          return (
            selectedImages.filter((item) => item !== null).length === 2 &&
            selectedModelResults.length ===
              featureTree[0].children.filter((node) =>
                node.children.flatMap((n) => getLeafIds(n)).some((id) => watchedModelIds.includes(id)),
              ).length *
                2
          )
        }
        return false
      case 2:
        return selectedImages.filter((item) => item !== null).length === 2 && sarFeatures.length > 0
      default:
        return false
    }
  }, [
    watchedRootModelId,
    selectedImages,
    watchedServiceId,
    featureTree,
    getLeafIds,
    watchedModelIds,
    selectedModelResults,
    sarFeatures.length,
  ])

  return {
    enableNextButton,
    enableSaveDraftButton,
    enableSaveAndProcessButton,
  }
}
