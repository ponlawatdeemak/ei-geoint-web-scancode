import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { TableRows, ViewModule } from '@mui/icons-material'
import { FC, memo, useCallback } from 'react'
import { ViewType } from './images'

interface ResultSwitchProps {
  value: ViewType
  onChange: (value: ViewType) => void
}

const ResultSwitch: FC<ResultSwitchProps> = ({ value, onChange }) => {
  const { t } = useTranslation('common')
  const handleChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newValue: ViewType) => {
      onChange(newValue)
    },
    [onChange],
  )

  return (
    <div>
      <ToggleButtonGroup
        size='small'
        color='primary'
        value={value}
        exclusive
        onChange={handleChange}
        aria-label='View Type'
      >
        <Tooltip title={t('view.card')} arrow>
          <ToggleButton size='small' value={ViewType.GRID}>
            <ViewModule />
          </ToggleButton>
        </Tooltip>
        <Tooltip title={t('view.table')} arrow>
          <ToggleButton size='small' value={ViewType.LIST}>
            <TableRows />
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </div>
  )
}

export default memo(ResultSwitch)
