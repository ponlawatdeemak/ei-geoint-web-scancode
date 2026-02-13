import React from 'react'
import { Button, Tooltip } from '@mui/material'
import LayersIcon from '@mui/icons-material/Layers'
import DateRangeIcon from '@mui/icons-material/DateRange'
import { useTranslation } from 'react-i18next'
import { ActiveView } from '.'

type Props = {
  activeView: number
  setActiveView: (v: number) => void
  weeklySubscriptionModel?: unknown[]
}

const LeftSidebarButtons: React.FC<Props> = ({ activeView, setActiveView, weeklySubscriptionModel }) => {
  const { t } = useTranslation('common')

  const isDisabled = !weeklySubscriptionModel || weeklySubscriptionModel.length === 0

  return (
    <>
      <Tooltip title={t('map.layer') ?? 'Layers'} placement='right' arrow>
        <Button
          size='small'
          variant={activeView === ActiveView.layer ? 'contained' : 'outlined'}
          className={`h-11.25 w-11.25 min-w-0! border-transparent! text-white!`}
          onClick={() => setActiveView(ActiveView.layer)}
        >
          <LayersIcon />
        </Button>
      </Tooltip>
      <Tooltip title={t('map.weekly') ?? 'Weekly'} placement='right' arrow>
        <Button
          size='small'
          variant={activeView === ActiveView.weekly ? 'contained' : 'outlined'}
          className={`h-11.25 w-11.25 min-w-0! border-transparent! ${isDisabled ? '' : 'text-white!'}`}
          onClick={() => setActiveView(ActiveView.weekly)}
          disabled={isDisabled}
        >
          <DateRangeIcon />
        </Button>
      </Tooltip>
    </>
  )
}

export default LeftSidebarButtons
