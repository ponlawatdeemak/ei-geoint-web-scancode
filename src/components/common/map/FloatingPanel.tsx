import { Box, IconButton, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'
import ClearIcon from '@mui/icons-material/Clear'
import RemoveIcon from '@mui/icons-material/Remove'
import AspectRatioIcon from '@mui/icons-material/AspectRatio'
import { useTranslation } from 'react-i18next'

export interface FloatingPanelProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  isOpen: boolean
  isMinimized: boolean
  isMobile?: boolean
  onClose: () => void
  onToggleMinimize: () => void
}

export function FloatingPanel({
  title,
  icon,
  children,
  isOpen,
  isMinimized,
  isMobile,
  onClose,
  onToggleMinimize,
}: Readonly<FloatingPanelProps>) {
  const { t } = useTranslation('common')
  if (!isOpen) return null

  return (
    <Box
      className={`flex w-full flex-col rounded-lg border border-(--color-gray-border) bg-white shadow-lg md:min-w-md ${isMobile ? 'max-h-[25vh]' : 'max-h-[80vh]'}`}
    >
      {/* Header */}
      <Box className='flex items-center justify-between border-(--color-gray-border) border-b-[0] px-4 py-3 pb-1'>
        <Box className='flex min-w-0 flex-1 items-center gap-2'>
          {icon}
          <span className='truncate font-semibold text-(--color-text-primary)'>{title}</span>
        </Box>
        <Box className='flex flex-shrink-0 items-center gap-1'>
          <Tooltip title={t('button.minimize')} arrow>
            <IconButton size='small' color={'default'} onClick={onToggleMinimize}>
              {isMinimized ? <AspectRatioIcon /> : <RemoveIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={t('button.close')} arrow>
            <IconButton size='small' color={'default'} onClick={onClose}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {/* Content */}
      {!isMinimized && <Box className='flex-1 overflow-y-auto p-4 pt-0'>{children}</Box>}
    </Box>
  )
}

export interface PanelSectionProps {
  label: string
  value: ReactNode
}

export function PanelSection({ label, value }: Readonly<PanelSectionProps>) {
  return (
    <Box className='mb-3 last:mb-0'>
      <div className='mb-1 font-medium text-(--color-text-secondary) text-xs'>{label}</div>
      <div className='text-(--color-text-secondary) text-sm'>{value}</div>
    </Box>
  )
}
