import { Box, Button, Checkbox, Divider, FormControlLabel, Typography } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { ModelItem, useWeeklyMapStore } from './store/useWeeklyMapStore'
import NoDataPlaceholder from './NoDataPlaceholder'
import { useState, useMemo, type ChangeEvent, type FC } from 'react'

interface ModelCheckboxGroupProps {
  readonly model: ModelItem
  readonly selectedModels: ModelItem[]
  readonly onSelectionChange: (newSelected: ModelItem[]) => void
}

function ModelCheckboxGroup({ model, selectedModels, onSelectionChange }: ModelCheckboxGroupProps) {
  const { language } = useSettings()

  const getAllDescendantIds = (m: ModelItem): string[] => {
    return m.children?.flatMap((child) => [child.id, ...getAllDescendantIds(child)]) || []
  }

  const selfAndDescendants = [model.id, ...getAllDescendantIds(model)]
  const selectedDescendantCount = selfAndDescendants.filter((id) => selectedModels.some((s) => s.id === id)).length

  const isAllChecked = selfAndDescendants.length > 0 && selectedDescendantCount === selfAndDescendants.length
  const isIndeterminate = selectedDescendantCount > 0 && selectedDescendantCount < selfAndDescendants.length

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
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
    onSelectionChange(newSelected)
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
          <ModelCheckboxGroup
            key={child.id}
            model={child}
            selectedModels={selectedModels}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </Box>
    </Box>
  )
}

type SelectModelFormProps = {
  onBack: () => void
}

const SelectModelForm: FC<SelectModelFormProps> = ({ onBack }) => {
  const { t } = useTranslation('common')
  const { allModels, selectedAreas, selectedModels, setSelectedModels, search } = useWeeklyMapStore()
  const [localSelectedModels, setLocalSelectedModels] = useState<ModelItem[]>(selectedModels)

  const onSave = () => {
    setSelectedModels(localSelectedModels)
    search()
    onBack()
  }

  const availableModels = useMemo(() => {
    const selectedAreaIds = new Set(selectedAreas.map((a) => a.id))
    return allModels.filter((model) => model.parentAreaIds.some((id) => selectedAreaIds.has(id)))
  }, [selectedAreas, allModels])

  return (
    <Box className='flex h-full w-full flex-col'>
      <Box
        className='flex min-h-0 shrink flex-col'
        sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            py: 1,
            px: 1,
            bgcolor: '#f4f6f8',
          }}
        >
          <Typography variant='subtitle1' sx={{ fontWeight: 'bold', ml: 1 }}>
            {t('button.selectModel')}
          </Typography>
        </Box>

        <Box sx={{ p: 2, flexDirection: 'row', overflowY: 'auto' }}>
          {availableModels.length === 0 ? (
            <NoDataPlaceholder text={t('table.noData')} />
          ) : (
            availableModels.map((model) => (
              <ModelCheckboxGroup
                key={model.id}
                model={model}
                selectedModels={localSelectedModels}
                onSelectionChange={setLocalSelectedModels}
              />
            ))
          )}
        </Box>
      </Box>

      {/* Buttons */}
      <Box sx={{ p: 2, px: 4, bgcolor: 'background.paper', zIndex: 100, mt: 'auto' }}>
        <div className='flex flex-col gap-4'>
          <Divider />
          <div className='flex items-center justify-center gap-2'>
            <Button variant='outlined' onClick={onBack}>
              {t('button.back')}
            </Button>
            <Button variant='contained' color='primary' onClick={onSave} startIcon={<SaveIcon />}>
              {t('button.save')}
            </Button>
          </div>
        </div>
      </Box>
    </Box>
  )
}

export default SelectModelForm
