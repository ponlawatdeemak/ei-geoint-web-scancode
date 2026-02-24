import React from 'react'
import { Box, IconButton, Tab, Tabs, Tooltip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LayersIcon from '@mui/icons-material/Layers'
import DateRangeIcon from '@mui/icons-material/DateRange'
import { useTranslation } from 'react-i18next'
import { GetModelSubscriptionWeeklyDtoOut, ProjectMapViewPageLevel } from '@interfaces/index'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'

export enum ActiveViewLocal {
  layer = 0,
  weekly = 1,
}

type Props = {
  showPanelLeft: boolean
  setShowPanelLeft: (v: boolean) => void
  activeView: number
  setActiveView: (v: number) => void
  pageLevel: ProjectMapViewPageLevel
  weeklySubscriptionModel?: GetModelSubscriptionWeeklyDtoOut[]
  isEditingItv?: boolean
}

const MobilePanelHeader: React.FC<Props> = ({
  setShowPanelLeft,
  activeView,
  setActiveView,
  pageLevel,
  weeklySubscriptionModel,
  isEditingItv,
}) => {
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()

  return (
    <Box className='flex flex-col'>
      <Box className='flex justify-end p-2 pb-0'>
        <IconButton onClick={() => setShowPanelLeft(false)} size='small'>
          <CloseIcon fontSize='small' />
        </IconButton>
      </Box>

      {pageLevel === ProjectMapViewPageLevel.project && (
        <Tabs
          value={activeView}
          variant='fullWidth'
          onChange={(_, v) => {
            if (v === ActiveViewLocal.weekly && isEditingItv) {
              showAlert?.({
                status: 'warning',
                content: t('alert.closeItvLayerFirst'),
              })
              return
            }

            setActiveView(v)
          }}
        >
          <Tooltip title={t('map.layer') ?? 'Layers'} arrow>
            <Tab icon={<LayersIcon className='border-white!' />} value={ActiveViewLocal.layer} />
          </Tooltip>
          <Tooltip title={t('map.weekly') ?? 'Weekly'} arrow>
            <Tab
              icon={<DateRangeIcon className='border-white!' />}
              value={ActiveViewLocal.weekly}
              disabled={!weeklySubscriptionModel || weeklySubscriptionModel.length === 0}
            />
          </Tooltip>
        </Tabs>
      )}
    </Box>
  )
}

export default MobilePanelHeader
