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
  startLabel?: string
  className?: string
}

const CustomDateField = (props: React.ComponentProps<typeof DateField>) => (
  <DateField
    {...props}
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
)

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
        label={startLabel}
        value={startDay}
        maxDate={endDay ?? undefined}
        disabled={disabled}
        onChange={onStartDateChange}
        slots={{
          field: CustomDateField,
        }}
      />
      <span className='hidden text-(--color-text-secondary) text-sm sm:inline'>—</span>
      <DatePicker
        label={t('filter.toDate')}
        value={endDay}
        minDate={startDay ?? undefined}
        disabled={disabled}
        onChange={onEndDateChange}
        slots={{
          field: CustomDateField,
        }}
      />
    </div>
  )
}

export default memo(DateRangePicker)
