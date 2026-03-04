'use client'

import React from 'react'
import { Checkbox, Divider } from '@mui/material'
import InputLabel from '@/components/common/input/InputLabel'
import { HierarchicalLookupNode } from '@/utils/transformData'

interface FeatureTreePanelProps {
  featureTree: HierarchicalLookupNode[]
  watchedModelIds: number[]
  getLeafIds: (node: HierarchicalLookupNode) => number[]
  setValue: (field: 'modelIds', value: number[]) => void
  loading: boolean
  disabled?: boolean
  t: (key: string) => string
  renderNode: (node: HierarchicalLookupNode, disabled?: boolean) => React.ReactNode
}

const FeatureTreePanel: React.FC<FeatureTreePanelProps> = ({
  featureTree,
  watchedModelIds,
  getLeafIds,
  setValue,
  loading,
  disabled,
  t,
  renderNode,
}) => {
  const allLeafIds = featureTree.flatMap((n) => getLeafIds(n))
  const allChecked = allLeafIds.every((id) => watchedModelIds.includes(id))
  const someChecked = allLeafIds.some((id) => watchedModelIds.includes(id))

  return (
    <div className='mt-2 flex flex-col rounded-lg bg-(--color-background-default) px-4 py-2 md:col-span-2'>
      <div className='flex items-center'>
        <label className='font-medium text-primary'>{t('form.taskForm.feature')}</label>
        <div className='flex-grow' />
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked && !allChecked}
          onChange={(e) => {
            const all = featureTree.flatMap((n) => getLeafIds(n))
            setValue('modelIds', e.target.checked ? Array.from(new Set(all)) : [])
          }}
          disabled={loading || disabled}
        />
        <InputLabel>{t('form.taskForm.selectAll')}</InputLabel>
      </div>
      <Divider />
      <div className='grid md:grid-cols-2'>
        {(featureTree.flatMap((n) => n.children || []) || []).map((node) => renderNode(node, disabled))}
      </div>
    </div>
  )
}

export default FeatureTreePanel
