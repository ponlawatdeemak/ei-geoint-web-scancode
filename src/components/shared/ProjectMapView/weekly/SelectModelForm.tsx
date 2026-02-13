import React, { useMemo } from 'react'
import { Box, Checkbox, FormControlLabel, IconButton, Typography } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { ModelItem, useWeeklyMapStore } from './store/useWeeklyMapStore'
import NoDataPlaceholder from './NoDataPlaceholder'

function ModelCheckboxGroup({ model }: { model: ModelItem }) {
  const { language } = useSettings()
  const { selectedModels, setSelectedModels } = useWeeklyMapStore()

  const getAllDescendantIds = (m: ModelItem): string[] => {
    return m.children?.flatMap((child) => [child.id, ...getAllDescendantIds(child)]) || []
  }

  const selfAndDescendants = [model.id, ...getAllDescendantIds(model)]
  const selectedDescendantCount = selfAndDescendants.filter((id) => selectedModels.some((s) => s.id === id)).length

  const isAllChecked = selfAndDescendants.length > 0 && selectedDescendantCount === selfAndDescendants.length
  const isIndeterminate = selectedDescendantCount > 0 && selectedDescendantCount < selfAndDescendants.length

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target

    const getAllModelsFromSubtree = (m: ModelItem): ModelItem[] => {
      return [m, ...m.children.flatMap(getAllModelsFromSubtree)]
    }
    const modelsToChange = getAllModelsFromSubtree(model)

    let newSelected: ModelItem[]
    if (checked) {
      const modelsToAdd = modelsToChange.filter((m) => !selectedModels.some((s) => s.id === m.id))
      newSelected = [...selectedModels, ...modelsToAdd]
    } else {
      const idsToRemove = new Set(modelsToChange.map((m) => m.id))
      newSelected = selectedModels.filter((s) => !idsToRemove.has(s.id))
    }
    setSelectedModels(newSelected)
  }

  return (
    <Box sx={{ textAlign: 'left' }}>
      <FormControlLabel
        label={<span className='!text-sm'>{language === 'th' ? model.name : model.nameEn}</span>}
        control={
          <Checkbox size='small' checked={isAllChecked} indeterminate={isIndeterminate} onChange={handleChange} />
        }
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 3 }}>
        {model.children?.map((child) => (
          <ModelCheckboxGroup key={child.id} model={child} />
        ))}
      </Box>
    </Box>
  )
}

type SelectModelFormProps = {
  onBack: () => void
}

const SelectModelForm: React.FC<SelectModelFormProps> = ({ onBack }) => {
  const { t } = useTranslation('common')
  const { allModels, selectedAreas } = useWeeklyMapStore()

  const availableModels = useMemo(() => {
    const selectedAreaIds = new Set(selectedAreas.map((a) => a.id))
    return allModels.filter((model) => model.parentAreaIds.some((id) => selectedAreaIds.has(id)))
  }, [selectedAreas, allModels])

  return (
    <Box sx={{ width: '100%', border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          px: 1,
          bgcolor: '#f4f6f8',
        }}
      >
        <IconButton size='small' onClick={onBack}>
          <ArrowBackIosNewIcon fontSize='small' />
        </IconButton>
        <Typography variant='subtitle1' sx={{ fontWeight: 'bold', ml: 1 }}>
          {t('button.selectModel')}
        </Typography>
      </Box>

      <Box sx={{ p: 2, flexDirection: 'row' }}>
        {availableModels.length === 0 ? (
          <NoDataPlaceholder text={t('table.noData')} />
        ) : (
          availableModels.map((model) => <ModelCheckboxGroup key={model.id} model={model} />)
        )}
      </Box>
    </Box>
  )
}

export default SelectModelForm
