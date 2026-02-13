import React, { useCallback, useEffect, useState } from 'react'
import * as mgrs from 'mgrs'
import proj4 from 'proj4'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CloseIcon from '@mui/icons-material/Close'
import NearMeIcon from '@mui/icons-material/NearMe'
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'

type CoordSystem = 'DD' | 'UTM47' | 'UTM48' | 'MGRS'

const utm47 = '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs'
const utm48 = '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs'
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs'

const COORD_UNITS = [
  { label: 'GCS', value: 'DD' },
  { label: 'WGS 1984 UTM 47', value: 'UTM47' },
  { label: 'WGS 1984 UTM 48', value: 'UTM48' },
  { label: 'MGRS', value: 'MGRS' },
]

interface CursorCoordinateProps {
  map: maplibregl.Map
}

function fromDecimalDegree(lng: number, lat: number, to: CoordSystem): string {
  if (to === 'DD') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } else if (to === 'UTM47' || to === 'UTM48') {
    const utmProj = to === 'UTM47' ? utm47 : utm48
    const [easting, northing] = proj4(wgs84, utmProj, [lng, lat])
    return `${easting.toFixed(6)}, ${northing.toFixed(6)}`
  } else if (to === 'MGRS') {
    return mgrs.forward([lng, lat], 5)
  }
  return ''
}

const CursorCoordinate: React.FC<CursorCoordinateProps> = ({ map }) => {
  const { t } = useTranslation('common')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedCoordinate, setSelectedCoordinate] = useState<[number, number] | undefined>()
  const [currentCoordinate, setCurrentCoordinate] = useState<[number, number] | undefined>()
  const [displaySystem, setDisplaySystem] = useState<CoordSystem>('DD')

  const handleClear = useCallback(() => {
    setSelectedCoordinate(undefined)
  }, [])

  const handleCopy = useCallback(
    async (system: CoordSystem) => {
      setDisplaySystem(system)
      if (!selectedCoordinate) return
      const coordinate = fromDecimalDegree(selectedCoordinate[0], selectedCoordinate[1], system)
      if (coordinate) {
        await navigator.clipboard.writeText(coordinate)
      }
    },
    [selectedCoordinate],
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

  let widthClass = 'min-w-[160px]'
  if (displaySystem === 'UTM47' || displaySystem === 'UTM48') {
    widthClass = 'min-w-[200px]'
  } else if (displaySystem === 'MGRS') {
    widthClass = 'min-w-[124px]'
  }

  return (
    <div className='flex h-7 items-center gap-1 text-white text-xs'>
      {selectedCoordinate && (
        <>
          <MyLocationIcon sx={{ width: 16, height: 16 }} />
          <label className={`inline-block ${widthClass} tabular-nums`}>
            {fromDecimalDegree(selectedCoordinate[0], selectedCoordinate[1], displaySystem)}
          </label>
          <Tooltip title={t('tools.copyCoordinates')} arrow placement='top'>
            <IconButton
              className='text-white!'
              onClick={(e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
              size='small'
            >
              <ContentCopyIcon sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            {COORD_UNITS.map(({ label, value }) => (
              <MenuItem
                key={value}
                onClick={() => {
                  setAnchorEl(null)
                  handleCopy(value as CoordSystem)
                }}
              >
                {label}
              </MenuItem>
            ))}
          </Menu>
          <Tooltip title={t('button.close')} arrow placement='top'>
            <IconButton className='text-white!' onClick={handleClear} size='small'>
              <CloseIcon sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
        </>
      )}
      {currentCoordinate && (
        <div className='hidden items-center gap-1 lg:flex'>
          <NearMeIcon sx={{ width: 16, height: 16 }} />
          <label className={`inline-block ${widthClass} tabular-nums`}>
            {fromDecimalDegree(currentCoordinate[0], currentCoordinate[1], displaySystem)}
          </label>
        </div>
      )}
    </div>
  )
}

export default CursorCoordinate
