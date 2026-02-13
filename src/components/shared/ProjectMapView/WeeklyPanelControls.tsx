import React from 'react'
import { Box, Button, IconButton, Tooltip, useMediaQuery } from '@mui/material'
import FlipIcon from '@mui/icons-material/Flip'
import MultipleStopIcon from '@mui/icons-material/MultipleStop'
import WeeklyMapCompareDialog from '@/components/map/WeeklyMapCompareDialog'
import DateStepper from './weekly/DateStepper'
import type { LayerConfig } from '@interfaces/index'
import { useWeeklyMapStore } from './weekly/store/useWeeklyMapStore'
import type { LngLatBoundsLike } from 'maplibre-gl'
import theme from '@/styles/theme'

export type WeeklyCompareDialogConfig = {
  open: boolean
  layerConfigs: LayerConfig[]
  defaultMode: 'ChangeDetection' | 'Compare'
}

type Props = {
  t: (k: string) => string
  weeklyCompareDialogConfig: WeeklyCompareDialogConfig
  setWeeklyCompareDialogConfig: (cfg: WeeklyCompareDialogConfig) => void
  currentMapExtent?: LngLatBoundsLike | null
}

const WeeklyPanelControls: React.FC<Props> = ({
  t,
  weeklyCompareDialogConfig,
  setWeeklyCompareDialogConfig,
  currentMapExtent,
}) => {
  const { data } = useWeeklyMapStore()
  const isMinimized = useMediaQuery(theme.breakpoints.down('lg'))

  return data.length === 0 ? null : (
    <>
      <div className='absolute bottom-0 left-1/2 z-20 w-full -translate-x-1/2 overflow-x-auto overflow-y-hidden bg-gradient-to-t from-black/80 to-transparent px-4 py-4 pt-2'>
        <DateStepper />
      </div>
      <div className='absolute bottom-20 left-1/2 z-20 w-full -translate-x-1/2 overflow-x-auto overflow-y-hidden px-4'>
        <div className='mb-4 flex min-w-fit transform justify-center gap-3'>
          <Tooltip title={t('button.mapCompare')} arrow>
            {isMinimized ? (
              <Box className='!rounded-[8px] !bg-white flex h-10 w-10 items-center justify-center border border-(--color-gray-border)'>
                <IconButton
                  onClick={() => {
                    setWeeklyCompareDialogConfig({ open: true, layerConfigs: [], defaultMode: 'ChangeDetection' })
                  }}
                  className='!h-8 !w-8 !p-0'
                >
                  <FlipIcon />
                </IconButton>
              </Box>
            ) : (
              <Button
                variant='outlined'
                className='min-w-[164px]! border-(--color-gray-border)! bg-white!'
                startIcon={<FlipIcon />}
                onClick={() => {
                  setWeeklyCompareDialogConfig({ open: true, layerConfigs: [], defaultMode: 'ChangeDetection' })
                }}
                aria-label='map-compare'
              >
                {t('button.mapCompare')}
              </Button>
            )}
          </Tooltip>
          <Tooltip title={t('button.mapSidebySide')} arrow>
            {isMinimized ? (
              <Box className='!rounded-[8px] !bg-white flex h-10 w-10 items-center justify-center border border-(--color-gray-border)'>
                <IconButton
                  onClick={() => {
                    setWeeklyCompareDialogConfig({ open: true, layerConfigs: [], defaultMode: 'Compare' })
                  }}
                  className='!h-8 !w-8 !p-0'
                >
                  <MultipleStopIcon />
                </IconButton>
              </Box>
            ) : (
              <Button
                variant='outlined'
                className='min-w-[160px]! border-(--color-gray-border)! bg-white!'
                startIcon={<MultipleStopIcon />}
                onClick={() => {
                  setWeeklyCompareDialogConfig({ open: true, layerConfigs: [], defaultMode: 'Compare' })
                }}
                aria-label='map-sync'
              >
                {t('button.mapSidebySide')}
              </Button>
            )}
          </Tooltip>
        </div>
      </div>

      <WeeklyMapCompareDialog
        open={weeklyCompareDialogConfig.open}
        onClose={() => setWeeklyCompareDialogConfig({ ...weeklyCompareDialogConfig, open: false })}
        layerConfigs={weeklyCompareDialogConfig.layerConfigs}
        defaultMode={weeklyCompareDialogConfig.defaultMode}
        initialExtent={currentMapExtent}
      />
    </>
  )
}

export default WeeklyPanelControls
