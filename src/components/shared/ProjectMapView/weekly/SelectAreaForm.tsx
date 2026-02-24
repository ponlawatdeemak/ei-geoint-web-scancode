import { Box, Button, Checkbox, Divider, FormControlLabel, FormGroup, Typography } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { AreaItem, useWeeklyMapStore } from './store/useWeeklyMapStore'
import { useState } from 'react'

type SelectAreaFormProps = {
  onBack: () => void
}

const SelectAreaForm: React.FC<SelectAreaFormProps> = ({ onBack }) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { allAreas, selectedAreas, setSelectedAreas, search } = useWeeklyMapStore()
  const [localSelectedAreas, setLocalSelectedAreas] = useState<AreaItem[]>(selectedAreas)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target
    const areaId = Number(name)
    const area = allAreas.find((item) => item.id === areaId)
    if (!area) return

    let newSelectedAreas: AreaItem[]
    if (checked) {
      newSelectedAreas = [...localSelectedAreas, area]
    } else {
      newSelectedAreas = localSelectedAreas.filter((item) => item.id !== areaId)
    }
    setLocalSelectedAreas(newSelectedAreas)
  }

  const onSave = () => {
    setSelectedAreas(localSelectedAreas)
    search()
    onBack()
  }

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
            {t('button.selectArea')}
          </Typography>
        </Box>

        <FormGroup sx={{ p: 2, flexDirection: 'column', overflowY: 'auto' }}>
          {allAreas.map((item) => (
            <Box key={item.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    size='small'
                    checked={localSelectedAreas.some((area) => area.id === item.id)}
                    onChange={handleChange}
                    name={String(item.id)}
                  />
                }
                label={<span className='!text-sm'>{language === 'th' ? item.name : item.nameEn}</span>}
              />
            </Box>
          ))}
        </FormGroup>
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

export default SelectAreaForm
