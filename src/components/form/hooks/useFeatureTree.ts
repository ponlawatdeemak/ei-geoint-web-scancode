import { useCallback } from 'react'
import type { UseFormSetValue } from 'react-hook-form'
import { buildHierarchicalLookup, HierarchicalLookupNode } from '@/utils/transformData'
import { ModelConfig } from '@interfaces/config'
import type { FormValues, Model } from './types'

interface UseFeatureTreeParams {
  allModels: Model[]
  watchedModelIds: number[]
  isOpenFromGallery: boolean
  isProcessed?: boolean | null
  language: string
  setValue: UseFormSetValue<FormValues>
  setModels: React.Dispatch<React.SetStateAction<Model[]>>
  setFeatureTree: React.Dispatch<React.SetStateAction<HierarchicalLookupNode[]>>
}

export function useFeatureTree({
  allModels,
  watchedModelIds,
  isOpenFromGallery,
  isProcessed,
  setValue,
  setModels,
  setFeatureTree,
}: UseFeatureTreeParams) {
  const getLeafIds = useCallback((node: HierarchicalLookupNode): number[] => {
    if (!node.children || node.children.length === 0) return [node.id]
    return node.children.flatMap((child) => getLeafIds(child))
  }, [])

  const isNodeChecked = useCallback(
    (node: HierarchicalLookupNode) => {
      const leafIds = getLeafIds(node)
      if (leafIds.length === 0) return false
      return leafIds.every((id) => watchedModelIds.includes(id))
    },
    [getLeafIds, watchedModelIds],
  )

  const isNodeIndeterminate = useCallback(
    (node: HierarchicalLookupNode) => {
      const leafIds = getLeafIds(node)
      if (leafIds.length === 0) return false
      const some = leafIds.some((id) => watchedModelIds.includes(id))
      return some && !isNodeChecked(node)
    },
    [getLeafIds, watchedModelIds, isNodeChecked],
  )

  const toggleNode = useCallback(
    (node: HierarchicalLookupNode, checked: boolean) => {
      const leafIds = getLeafIds(node)
      const set = new Set(watchedModelIds)
      if (checked) {
        for (const id of leafIds) set.add(id)
      } else {
        for (const id of leafIds) set.delete(id)
      }
      setValue('modelIds', Array.from(set))
    },
    [getLeafIds, setValue, watchedModelIds],
  )

  const handleChangeRootModel = useCallback(
    (id?: number) => {
      setValue('rootModelId', id)
      if (id) {
        const tree = buildHierarchicalLookup(allModels, 'parentModelId')
        const node = tree.find((n) => n.id === id)
        setFeatureTree(node ? [node] : [])
      } else {
        setFeatureTree([])
      }
      setValue('modelIds', [])
    },
    [setValue, allModels, setFeatureTree],
  )

  const handleChangeService = useCallback(
    (id?: number) => {
      setValue('serviceId', id)
      const filteredModels = id
        ? allModels.filter((m) => {
            const defaultCondition = m.parentModelId == null && m.serviceId === id
            if (isOpenFromGallery && !isProcessed) {
              return defaultCondition && m.id !== ModelConfig.changeDetection
            }
            return defaultCondition
          })
        : []
      setModels(filteredModels)
      handleChangeRootModel()
    },
    [setValue, handleChangeRootModel, allModels, isOpenFromGallery, isProcessed, setModels],
  )

  return {
    getLeafIds,
    isNodeChecked,
    isNodeIndeterminate,
    toggleNode,
    handleChangeRootModel,
    handleChangeService,
  }
}
