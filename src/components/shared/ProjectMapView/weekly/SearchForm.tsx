import React from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Button, FormControl, Stack, Typography } from '@mui/material'
import FilterListAltIcon from '@mui/icons-material/FilterListAlt'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useWeeklyMapStore } from './store/useWeeklyMapStore'
import { DateField } from '@mui/x-date-pickers/DateField'
import dayjs from 'dayjs'

// --- Props Interface ---
interface SearchFormProps {
  onSelectAreaClick: () => void
  onSelectModelClick: () => void
}

const SearchForm: React.FC<SearchFormProps> = ({ onSelectAreaClick, onSelectModelClick }) => {
  const { t } = useTranslation('common')
  const { startDate, endDate, setStartDate, setEndDate, loading, search } = useWeeklyMapStore()

  return (
    <Box>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <Typography className='text-left' variant='subtitle2' component='label'>
          {t('form.weeklyMap.selectDateRange')}
        </Typography>

        <Stack direction='row' spacing={1} alignItems='center'>
          <DatePicker
            disabled={loading}
            value={startDate}
            onChange={(newValue) => {
              setStartDate(newValue)
              search()
            }}
            maxDate={endDate || undefined}
            sx={{ flex: 1 }}
            slots={{
              field: (params) => (
                <DateField
                  {...params}
                  format='D MMM YY'
                  size='small'
                  focused={false}
                  shouldRespectLeadingZeros
                  slotProps={{
                    textField: {
                      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.preventDefault(),
                    },
                  }}
                />
              ),
            }}
          />
          <span className='flex-shrink-0 text-(--color-text-secondary) text-sm'>—</span>
          <DatePicker
            disabled={loading}
            value={endDate}
            onChange={(newValue) => {
              setEndDate(newValue)
              search()
            }}
            maxDate={dayjs()}
            minDate={startDate || undefined}
            sx={{ flex: 1 }}
            slots={{
              field: (params) => (
                <DateField
                  {...params}
                  format='D MMM YY'
                  size='small'
                  focused={false}
                  shouldRespectLeadingZeros
                  slotProps={{
                    textField: {
                      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.preventDefault(),
                    },
                  }}
                />
              ),
            }}
          />
        </Stack>
      </FormControl>
      <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
        <Button
          disabled={loading}
          variant='outlined'
          className='bg-white'
          startIcon={<FilterListAltIcon />}
          onClick={onSelectAreaClick}
          aria-label='select-area'
          fullWidth
        >
          {t('button.selectArea')}
        </Button>
        <Button
          disabled={loading}
          variant='outlined'
          className='bg-white'
          startIcon={<AutoAwesomeIcon />}
          onClick={onSelectModelClick}
          aria-label='select-model'
          fullWidth
        >
          {t('button.selectModel')}
        </Button>
      </Stack>
    </Box>
  )
}

export default SearchForm
