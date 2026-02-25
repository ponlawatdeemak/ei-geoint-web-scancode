import { useCallback, useEffect, useMemo, useState, type FC, type MouseEvent } from 'react'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CloseIcon from '@mui/icons-material/Close'
import SettingsIcon from '@mui/icons-material/Settings'
import NearMeIcon from '@mui/icons-material/NearMe'
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { COORD_UNITS, type CoordSystem, fromDecimalDegree } from '@/utils/coordinate'
import { useSettings } from '@/hook/useSettings'

interface CursorCoordinateProps {
  map: maplibregl.Map
}

const CursorCoordinate: FC<CursorCoordinateProps> = ({ map }) => {
  const { t } = useTranslation('common')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedCoordinate, setSelectedCoordinate] = useState<[number, number] | undefined>()
  const [currentCoordinate, setCurrentCoordinate] = useState<[number, number] | undefined>()

  const { copyLocationType, setCopyLocationType } = useSettings()
  const displaySystem = (copyLocationType as CoordSystem) || 'DD'

  const handleClear = useCallback(() => {
    setSelectedCoordinate(undefined)
  }, [])

  const handleCopy = useCallback(
    async (system: CoordSystem) => {
      setCopyLocationType(system)
      if (!selectedCoordinate) return
      const coordinate = fromDecimalDegree(selectedCoordinate[0], selectedCoordinate[1], system)
      if (coordinate) {
        await navigator.clipboard.writeText(coordinate)
      }
    },
    [selectedCoordinate, setCopyLocationType],
  )

  const handleMapClick = useCallback((e: maplibregl.MapMouseEvent) => {
    setSelectedCoordinate([e.lngLat.lng, e.lngLat.lat])
  }, [])

  const handleMapMouseMove = useCallback((e: maplibregl.MapMouseEvent) => {
    setCurrentCoordinate([e.lngLat.lng, e.lngLat.lat])
  }, [])

  useEffect(() => {
    if (!map) return
    map.on('click', handleMapClick)
    map.on('mousemove', handleMapMouseMove)
    return () => {
      map.off('click', handleMapClick)
      map.off('mousemove', handleMapMouseMove)
    }
  }, [map, handleMapClick, handleMapMouseMove])

  let widthClass = 'min-w-[8.75rem]'
  if (displaySystem === 'UTM47' || displaySystem === 'UTM48') {
    widthClass = 'min-w-[12.5rem]'
  } else if (displaySystem === 'MGRS') {
    widthClass = 'min-w-[7.75rem]'
  }

  const iconSize = useMemo(() => {
    return '1rem'
  }, [])

  return (
    <div className='flex h-7 items-center gap-1 text-white text-xs'>
      {selectedCoordinate && (
        <>
          <MyLocationIcon sx={{ width: iconSize, height: iconSize }} />
          <span className={`inline-block ${widthClass} tabular-nums`}>
            {fromDecimalDegree(selectedCoordinate[0], selectedCoordinate[1], displaySystem)}
          </span>
          <Tooltip title={t('tools.copyCoordinates')} arrow placement='top'>
            <IconButton className='text-white!' onClick={() => handleCopy(displaySystem)} size='small'>
              <ContentCopyIcon sx={{ width: iconSize, height: iconSize }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('button.close')} arrow placement='top'>
            <IconButton className='text-white!' onClick={handleClear} size='small'>
              <CloseIcon sx={{ width: iconSize, height: iconSize }} />
            </IconButton>
          </Tooltip>
        </>
      )}
      {currentCoordinate && (
        <div className='hidden items-center gap-1 lg:flex'>
          <NearMeIcon sx={{ width: iconSize, height: iconSize }} />
          <span className={`inline-block ${widthClass} tabular-nums`}>
            {fromDecimalDegree(currentCoordinate[0], currentCoordinate[1], displaySystem)}
          </span>
        </div>
      )}
      <Tooltip title={t('tools.settings')} arrow placement='top'>
        <IconButton
          className='text-white!'
          onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
          size='small'
        >
          <SettingsIcon sx={{ width: iconSize, height: iconSize }} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {COORD_UNITS.map(({ label, value }) => (
          <MenuItem
            key={value}
            selected={displaySystem === value}
            onClick={() => {
              setAnchorEl(null)
              setCopyLocationType(value)
            }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
    </div>
  )
}

export default CursorCoordinate
