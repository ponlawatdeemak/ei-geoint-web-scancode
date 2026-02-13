import React from 'react'
import { Box, Button, IconButton, Tooltip, useMediaQuery } from '@mui/material'

import FlipIcon from '@mui/icons-material/Flip'
import MultipleStopIcon from '@mui/icons-material/MultipleStop'
import MapCompareDialog from '@/components/map/MapCompareDialog'
import { RootModelConfig, type LayerConfig, type ProjectMapViewGroup } from '@interfaces/index'
import { LngLatBoundsLike } from 'maplibre-gl'
import theme from '@/styles/theme'

type Props = {
  selectedGroup: ProjectMapViewGroup | null
  currentMapExtent?: LngLatBoundsLike | null
  isMobile: boolean
  isPanelOpen: boolean
  t: (k: string) => string
  mapCompareDialogConfig: { open: boolean; layerConfigs: LayerConfig[]; defaultMode: 'ChangeDetection' | 'Compare' }
  setMapCompareDialogConfig: (cfg: {
    open: boolean
    layerConfigs: LayerConfig[]
    defaultMode: 'ChangeDetection' | 'Compare'
  }) => void
  layerVisibility: Record<string, boolean>
}

const GroupCompareButtons: React.FC<Props> = ({
  selectedGroup,
  currentMapExtent,
  isMobile,
  isPanelOpen,
  t,
  mapCompareDialogConfig,
  setMapCompareDialogConfig,
  layerVisibility,
}) => {
  const isMinimized = useMediaQuery(theme.breakpoints.down('lg'))

  if (selectedGroup?.rootModelId !== RootModelConfig.changeDetection) return null

  return (
    <div className='absolute bottom-8 left-1/2 z-40 flex -translate-x-1/2 transform gap-3'>
      <Tooltip title={t('button.mapCompare')} arrow>
        {isMinimized ? (
          <Box
            className={`flex h-10 w-10 items-center justify-center rounded-lg! border border-(--color-gray-border) bg-white! ${isPanelOpen && isMobile ? 'hidden' : ''}`}
          >
            <IconButton
              onClick={() => {
                setMapCompareDialogConfig({
                  open: true,
                  layerConfigs: selectedGroup.layerConfigs ?? [],
                  defaultMode: 'ChangeDetection',
                })
              }}
              className='h-8! w-8! p-0!'
            >
              <FlipIcon />
            </IconButton>
          </Box>
        ) : (
          <Button
            variant='outlined'
            className='min-w-41! border-(--color-gray-border)! bg-white!'
            startIcon={<FlipIcon />}
            onClick={() => {
              setMapCompareDialogConfig({
                open: true,
                layerConfigs: selectedGroup.layerConfigs ?? [],
                defaultMode: 'ChangeDetection',
              })
            }}
            aria-label='map-compare'
          >
            {t('button.mapCompare')}
          </Button>
        )}
      </Tooltip>
      <Tooltip title={t('button.mapSidebySide')} arrow>
        {isMinimized ? (
          <Box
            className={`flex h-10 w-10 items-center justify-center rounded-lg! border border-(--color-gray-border) bg-white! ${isPanelOpen && isMobile ? 'hidden' : ''}`}
          >
            <IconButton
              onClick={() => {
                setMapCompareDialogConfig({
                  open: true,
                  layerConfigs: selectedGroup.layerConfigs ?? [],
                  defaultMode: 'Compare',
                })
              }}
              className='h-8! w-8! p-0!'
            >
              <MultipleStopIcon />
            </IconButton>
          </Box>
        ) : (
          <Button
            variant='outlined'
            className='min-w-40! border-(--color-gray-border)! bg-white!'
            startIcon={<MultipleStopIcon />}
            onClick={() => {
              setMapCompareDialogConfig({
                open: true,
                layerConfigs: selectedGroup.layerConfigs ?? [],
                defaultMode: 'Compare',
              })
            }}
            aria-label='map-sync'
          >
            {t('button.mapSidebySide')}
          </Button>
        )}
      </Tooltip>
      <MapCompareDialog
        open={mapCompareDialogConfig.open}
        layerVisibility={layerVisibility}
        onClose={() => setMapCompareDialogConfig({ ...mapCompareDialogConfig, open: false })}
        layerConfigs={mapCompareDialogConfig.layerConfigs}
        defaultMode={mapCompareDialogConfig.defaultMode}
        initialExtent={currentMapExtent}
      />
    </div>
  )
}

export default GroupCompareButtons
