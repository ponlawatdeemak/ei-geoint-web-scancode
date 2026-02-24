import React from 'react'
import { Box, Button, IconButton, Tooltip, useMediaQuery } from '@mui/material'
import FlipIcon from '@mui/icons-material/Flip'
import MultipleStopIcon from '@mui/icons-material/MultipleStop'
import CloseIcon from '@mui/icons-material/Close'
import Paper from '@mui/material/Paper'
import WeeklyMapCompareDialog from '@/components/map/WeeklyMapCompareDialog'
import DateStepper from './weekly/DateStepper'
import type { LayerConfig } from '@interfaces/index'
import { useWeeklyMapStore } from './weekly/store/useWeeklyMapStore'
import type { LngLatBoundsLike } from 'maplibre-gl'
import classNames from 'classnames'
import theme from '@/styles/theme'
import { WeeklyChartIcon } from '@/icons'
import { WeeklyChart } from './weekly/WeeklyChart'
import { useQuery } from '@tanstack/react-query'
import service from '@/api'

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
  const [isChartOpen, setIsChartOpen] = React.useState(false)

  const { data: modelAll } = useQuery({
    queryKey: ['model-all'],
    queryFn: async () => {
      const models = await service.lookup.getModelAll()
      return models
    },
  })

  return data.length === 0 ? null : (
    <>
      <div className='absolute bottom-0 left-1/2 z-[20] w-full -translate-x-1/2 overflow-x-auto overflow-y-hidden bg-gradient-to-t from-black/80 to-transparent md:px-4 md:py-4 md:pt-2' style={{ padding: '40px 50px' }}>
        <DateStepper />
      </div>

      {/* Weekly Chart Tool Panel Button */}
      <div className='absolute bottom-10 left-4 z-[25] md:bottom-10 pointer-events-auto'>
        <div className='flex flex-col gap-2 rounded-xl bg-[#003F7F] p-2 backdrop-blur-sm shadow-md'>
          <Tooltip title={t('tools.weeklyChart') || 'Weekly Chart'} placement='right' arrow>
            <div
              className={classNames(
                'group rounded-[3px] shadow-sm transition-colors hover:bg-background-dark-blue',
                {
                  'bg-background-dark-blue': isChartOpen,
                  'bg-white': !isChartOpen,
                },
              )}
            >
              <IconButton
                className='!p-1.5 !bg-transparent h-8 w-8'
                onClick={() => setIsChartOpen((prev) => !prev)}
              >
                <WeeklyChartIcon
                  className={classNames('group-hover:!text-white', {
                    '!text-white': isChartOpen,
                    'text-header-blue': !isChartOpen,
                  })}
                  sx={{ width: 18, height: 18, color: isChartOpen ? 'white' : 'var(--color-text-icon-primary)' }}
                />
              </IconButton>
            </div>
          </Tooltip>
        </div>
      </div>

      {isChartOpen && (
        <div className='fixed inset-0 z-[100] flex flex-col bg-white md:bg-transparent md:absolute md:inset-auto md:bottom-32 md:left-1/2 md:-translate-x-1/2 md:z-[99] md:w-[95%] md:max-w-6xl lg:w-[85%] lg:max-w-[1400px] xl:max-w-[1600px] pointer-events-auto'>
          {/* Mobile Header */}
          <div className='flex h-14 w-full shrink-0 items-center bg-[#1976D2] px-4 text-white md:hidden'>
            <IconButton size='large' onClick={() => setIsChartOpen(false)} sx={{ color: 'white', ml: -1.5 }}>
              <CloseIcon />
            </IconButton>
            <span className='ml-2 text-lg font-medium font-sarabun'>{t('tools.weeklyChart') || 'Weekly Chart'}</span>
          </div>

          {/* Container Content */}
          <Paper elevation={0} className='flex w-full flex-1 flex-col bg-white p-2 !rounded-none md:!rounded-xl md:p-4 md:pb-2 md:shadow-[0_3px_14px_rgba(0,0,0,0.12)]'>
            <div className='hidden items-center justify-end md:flex'>
              <IconButton size='small' onClick={() => setIsChartOpen(false)} sx={{ mb: -1 }}>
                <CloseIcon fontSize='small' />
              </IconButton>
            </div>
            <div className='relative w-full flex-none h-[28.125rem] md:h-[18.75rem]'>
              <WeeklyChart data={data} modelAll={modelAll} />
            </div>
          </Paper>
        </div>
      )}

      <div 
        className={classNames(
          'absolute left-1/2 z-[20] w-full -translate-x-1/2 overflow-x-auto overflow-y-hidden px-4 transition-all duration-300',
          {
            'bottom-24 md:bottom-[29rem]': isChartOpen,
            'bottom-24 md:bottom-24': !isChartOpen,
          }
        )}
      >
        <div className='mb-0 md:mb-4 flex min-w-fit transform justify-center gap-3'>
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
