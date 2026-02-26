import { DateField } from '@mui/x-date-pickers/DateField'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { type Dayjs } from 'dayjs'
import { memo } from 'react'

import { useTranslation } from 'react-i18next'
interface DateRangePickerProps {
  startDay: Dayjs | null | undefined
  endDay: Dayjs | null | undefined
  disabled?: boolean

  onStartDateChange: (value: Dayjs | null) => void
  onEndDateChange: (value: Dayjs | null) => void
  minWidth?: number
  startLabel?: string
  className?: string
}

const DateRangePicker = ({
  startDay,
  endDay,
  disabled,
  onStartDateChange,
  onEndDateChange,
  startLabel,
  className = '',
}: DateRangePickerProps) => {
  const { t } = useTranslation('common')

  return (
    <div className={`col-span-1 flex w-full flex-col items-center gap-2 sm:col-span-3 sm:flex-row ${className}`}>
      <DatePicker
        value={startDay}
        maxDate={endDay ?? undefined}
        disabled={disabled}
        onChange={onStartDateChange}
        slots={{
          field: (params) => (
            <DateField
              {...params}
              label={startLabel}
              format='D MMM YY'
              size='small'
              focused={false}
              shouldRespectLeadingZeros
              fullWidth
              clearable
              slotProps={{
                textField: {
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.preventDefault(),
                },
              }}
            />
          ),
        }}
      />
      <span className='hidden text-(--color-text-secondary) text-sm sm:inline'>—</span>
      <DatePicker
        value={endDay}
        minDate={startDay ?? undefined}
        disabled={disabled}
        onChange={onEndDateChange}
        slots={{
          field: (params) => (
            <DateField
              {...params}
              label={t('filter.toDate')}
              format='D MMM YY'
              size='small'
              focused={false}
              shouldRespectLeadingZeros
              fullWidth
              clearable
              slotProps={{
                textField: {
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.preventDefault(),
                },
              }}
            />
          ),
        }}
      />
    </div>
  )
}

export default memo(DateRangePicker)
