import { Box, Paper, IconButton } from '@mui/material'
import React, { useMemo } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { formatPercent } from '@/utils/text'
import { areaUnits } from '../../dialog/SettingsDialog'
import { useSettings } from '@/hook/useSettings'
import { convertArea } from '@/utils/convert'
import { LOCALE_STRING_OPTIONS } from '@/utils/formatNumber'

export type DetectionInfo = {
  x: number
  y: number
  modelName: string
  taskName: string
  confidence: number | undefined
  area: number | undefined
  aoiName?: string | null
}

interface TooltipProps {
  hoverInfo: DetectionInfo | null
  onClose?: () => void
}

const Tooltip: React.FC<TooltipProps> = ({ hoverInfo, onClose }) => {
  const { t } = useTranslation()
  const { areaUnit } = useSettings()

  const convertedArea = useMemo(() => convertArea(hoverInfo?.area ?? 0, areaUnit), [hoverInfo?.area, areaUnit])

  if (!hoverInfo) return null

  return (
    <Paper
      className='absolute z-10 flex min-w-3xs flex-col bg-white p-2'
      style={{ left: hoverInfo.x, top: hoverInfo.y }}
    >
      {/* Close button positioned over the popup so main layout stays unchanged */}
      <IconButton
        size='small'
        onClick={() => onClose?.()}
        aria-label='close-tooltip'
        style={{ position: 'absolute', right: 6, top: 6 }}
      >
        <CloseIcon fontSize='small' />
      </IconButton>

      <Box className='flex flex-col gap-0.5'>
        <div className='space-y-2 text-sm'>
          {/* <div className='flex'>
            <span className='w-1/3 pr-2 text-(--color-text-secondary)'>{t('map.detection.model')}:</span>
            <span className='w-2/3 font-medium text-(--color-text-primary)'>{formatText(hoverInfo.modelName)}</span>
          </div> */}

          {hoverInfo.aoiName && (
            <div className='flex'>
              <span className='w-1/3 text-(--color-text-secondary)'>{t('map.detection.aoiName')}:</span>
              <span className='w-2/3 font-medium text-(--color-text-primary)'>{hoverInfo.aoiName}</span>
            </div>
          )}

          {typeof hoverInfo.confidence !== 'undefined' && (
            <div className='flex'>
              <span className='w-1/3 text-(--color-text-secondary)'>{t('map.detection.confidence')}:</span>
              <span className='w-2/3 font-medium text-(--color-text-primary)'>
                {formatPercent(hoverInfo.confidence)}
              </span>
            </div>
          )}

          {typeof hoverInfo.area !== 'undefined' && (
            <div className='flex'>
              <span className='w-1/3 text-(--color-text-secondary)'>{t('map.detection.area')}:</span>
              <span className='w-2/3 font-medium text-(--color-text-primary)'>
                {convertedArea.toLocaleString(undefined, LOCALE_STRING_OPTIONS)}{' '}
                {t(areaUnits.find((u) => u.code === areaUnit)?.label || '')}
              </span>
            </div>
          )}
        </div>
      </Box>
    </Paper>
  )
}

export default Tooltip
