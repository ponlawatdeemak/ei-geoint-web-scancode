import React from 'react'
import { Box, Checkbox, FormControlLabel, FormGroup, IconButton, Typography } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { AreaItem, useWeeklyMapStore } from './store/useWeeklyMapStore'

type SelectAreaFormProps = {
  onBack: () => void
}

const SelectAreaForm: React.FC<SelectAreaFormProps> = ({ onBack }) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { allAreas, selectedAreas, setSelectedAreas } = useWeeklyMapStore()

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target
    const areaId = Number(name)
    const area = allAreas.find((item) => item.id === areaId)
    if (!area) return

    let newSelectedAreas: AreaItem[]
    if (checked) {
      newSelectedAreas = [...selectedAreas, area]
    } else {
      newSelectedAreas = selectedAreas.filter((item) => item.id !== areaId)
    }
    setSelectedAreas(newSelectedAreas)
  }

  return (
    <Box className='w-full' sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
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
          {t('button.selectArea')}
        </Typography>
      </Box>

      <FormGroup sx={{ p: 2, flexDirection: 'column' }}>
        {allAreas.map((item) => (
          <Box key={item.id}>
            <FormControlLabel
              control={
                <Checkbox
                  size='small'
                  checked={selectedAreas.some((area) => area.id === item.id)}
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
  )
}

export default SelectAreaForm
