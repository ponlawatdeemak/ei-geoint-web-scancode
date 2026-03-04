import { useState, useCallback } from 'react'
import { HierarchicalLookupNode } from '@/utils/transformData'

export function useHierarchicalCheckboxes(initialSelectedIds: number[] = []) {
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>(initialSelectedIds)

  const getLeafIds = useCallback((node: HierarchicalLookupNode): number[] => {
    if (!node.children || node.children.length === 0) return [node.id]
    return node.children.flatMap((child) => getLeafIds(child))
  }, [])

  const isNodeChecked = useCallback(
    (node: HierarchicalLookupNode) => {
      const leafIds = getLeafIds(node)
      if (leafIds.length === 0) return false
      return leafIds.every((id) => selectedModelIds.includes(id))
    },
    [getLeafIds, selectedModelIds],
  )

  const isNodeIndeterminate = useCallback(
    (node: HierarchicalLookupNode) => {
      const leafIds = getLeafIds(node)
      if (leafIds.length === 0) return false
      const some = leafIds.some((id) => selectedModelIds.includes(id))
      return some && !isNodeChecked(node)
    },
    [getLeafIds, isNodeChecked, selectedModelIds],
  )

  const toggleNode = useCallback(
    (node: HierarchicalLookupNode, checked: boolean) => {
      const leafIds = getLeafIds(node)
      setSelectedModelIds((prev) => {
        const set = new Set(prev)
        if (checked) {
          for (const id of leafIds) set.add(id)
        } else {
          for (const id of leafIds) set.delete(id)
        }
        return Array.from(set)
      })
    },
    [getLeafIds],
  )

  return {
    selectedModelIds,
    setSelectedModelIds,
    isNodeChecked,
    isNodeIndeterminate,
    toggleNode,
    getLeafIds,
  }
}
