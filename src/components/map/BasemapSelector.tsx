import React, { useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { BaseMap, BasemapType } from '@/components/common/map/config/map'
import useResponsive from '@/hook/responsive'

const BASEMAPS: BaseMap[] = [
  {
    label: 'tools.basemapTypes.googleSatellite',
    value: BasemapType.GoogleSatellite,
    image: '/images/map/basemap-google-satellite.png',
  },
  {
    label: 'tools.basemapTypes.googleHybrid',
    value: BasemapType.GoogleHybrid,
    image: '/images/map/basemap-google-hybrid.png',
  },
  { label: 'tools.basemapTypes.light', value: BasemapType.CartoLight, image: '/images/map/basemap-light-theme.png' },
  { label: 'tools.basemapTypes.dark', value: BasemapType.CartoDark, image: '/images/map/basemap-dark-theme.png' },
]

interface BasemapSelectorProps {
  map: maplibregl.Map
  currentBasemap: BasemapType
  onBasemapChanged: (selectedBasemap: BasemapType) => void
  disabled?: boolean
  onMapClick?: () => void
  onClose?: () => void
}

const BasemapSelector: React.FC<BasemapSelectorProps> = ({
  map,
  currentBasemap,
  onBasemapChanged,
  disabled,
  onMapClick,
  onClose,
}) => {
  const { t } = useTranslation('common')
  const { is2K } = useResponsive()
  // const [currentBasemap, setCurrentBasemap] = useState<BasemapType | null>(currentBasemap ?? null)

  // --- Map event handlers ---
  const handleMapClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!disabled) {
        onMapClick?.()
      }
    },
    [onMapClick, disabled],
  )

  useEffect(() => {
    if (!map) return
    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [map, handleMapClick])

  return (
    <Paper elevation={3} className='flex w-full flex-col bg-white p-2 md:w-80 md:p-4' sx={{ borderRadius: 2 }}>
      <div className='flex items-center justify-between'>
        <label className='font-medium'>{t('tools.basemapType')}</label>
        <IconButton className='md:hidden!' size='small' onClick={() => onClose?.()}>
          <CloseIcon fontSize='small' />
        </IconButton>
      </div>
      <div className='mt-2 flex flex-col gap-0.5'>
        {BASEMAPS.map(({ value, label, image }) => {
          const isCurrentBasemap = value === BASEMAPS[currentBasemap].value
          return (
            <button
              key={value}
              className={`flex cursor-pointer items-center rounded-sm p-2 hover:bg-(--color-background-default) ${isCurrentBasemap ? 'bg-[#e0e9ff]' : ''}`}
              type='button'
              onClick={() => onBasemapChanged(value)}
            >
              <div
                className={`h-14 w-14 overflow-hidden rounded-sm ${isCurrentBasemap ? 'border-2 border-primary' : ''}`}
              >
                <Image src={image} width={is2K ? 128 : 64} height={is2K ? 128 : 64} alt={label} />
              </div>
              <div className='ml-4 flex-1 truncate text-left text-sm'>{t(label)}</div>
            </button>
          )
        })}
      </div>
    </Paper>
  )
}

export default BasemapSelector
