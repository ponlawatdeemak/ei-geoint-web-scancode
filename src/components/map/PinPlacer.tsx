import React, { useCallback, useEffect, useState } from 'react'
import * as mgrs from 'mgrs'
import proj4 from 'proj4'
import { useTranslation } from 'react-i18next'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import LocationPinIcon from '@mui/icons-material/LocationPin'
import InfoIcon from '@mui/icons-material/Info'

import { layerIdConfig } from '@/components/common/map/config/map'
import type { GeoJSONSource } from 'maplibre-gl'
import useMapStore from '@/components/common/map/store/map'
import SearchCoordinateHelpDialog from './SearchCoordinateHelpDialog'
import useResponsive from '@/hook/responsive'

const RESULT_SOURCE = 'pin-placer-result-source'
const RESULT_LAYER = 'pin-placer-result-layer'

type CoordSystem = 'DD' | 'UTM' | 'MGRS'

interface PinPlacerProps {
  map: maplibregl.Map
  disabled?: boolean
  onMapClick?: () => void
  onClose?: () => void
}

// --- DD regex patterns ---
const DD_NUM = String.raw`-?\d+(?:\.\d+)?`
const DM_PART = String.raw`(\d+)°\s*(\d+(?:\.\d+)?)'`
const DMS_PART = String.raw`(\d{1,3})°\s*(\d{1,2})'\s*(\d+(?:\.\d+)?)"`

const RE_DD = new RegExp(String.raw`^(${DD_NUM})\s*(?:,|\s+)\s*(${DD_NUM})$`)
const RE_DM = new RegExp(String.raw`^${DM_PART}\s*([NS])?\s+${DM_PART}\s*([EW])?$`)
const RE_DMS = new RegExp(String.raw`^${DMS_PART}\s*([NS])?\s+${DMS_PART}\s*([EW])?$`)

function isValidLatLng(lat: number | undefined, lng: number | undefined): lat is number {
  if (lat === undefined || lng === undefined) return false
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function applyHemisphere(value: number, dir: string | undefined, negativeLetter: string): number {
  if (dir) return value * (dir === negativeLetter ? -1 : 1)
  return value
}

function parseDM(value: string): [number, number] | null {
  const matchDM = RE_DM.exec(value)
  if (!matchDM) return null
  let lat = Number.parseFloat(matchDM[1]) + Number.parseFloat(matchDM[2]) / 60
  let lng = Number.parseFloat(matchDM[4]) + Number.parseFloat(matchDM[5]) / 60
  lat = applyHemisphere(lat, matchDM[3], 'S')
  lng = applyHemisphere(lng, matchDM[6], 'W')
  return isValidLatLng(lat, lng) ? [lng, lat] : null
}

function parseDMS(value: string): [number, number] | null {
  const matchDMS = RE_DMS.exec(value)
  if (!matchDMS) return null
  let lat =
    +Number.parseFloat(matchDMS[1]) + Number.parseFloat(matchDMS[2]) / 60 + Number.parseFloat(matchDMS[3]) / 3600
  let lng =
    +Number.parseFloat(matchDMS[5]) + Number.parseFloat(matchDMS[6]) / 60 + Number.parseFloat(matchDMS[7]) / 3600
  lat = applyHemisphere(lat, matchDMS[4], 'S')
  lng = applyHemisphere(lng, matchDMS[8], 'W')
  return isValidLatLng(lat, lng) ? [lng, lat] : null
}

function parseDD(value: string): [number, number] | null {
  const matchDD = RE_DD.exec(value)
  if (matchDD) {
    const lat = Number.parseFloat(matchDD[1])
    const lng = Number.parseFloat(matchDD[2])
    return isValidLatLng(lat, lng) ? [lng, lat] : null
  }
  return parseDM(value) ?? parseDMS(value)
}

function parseUTM(value: string): [number, number] | null {
  const match = /^(\d{1,2})([NS])[:\s]+(\d+(?:\.\d+)?)(?:\s*,\s*|\s+)(\d+(?:\.\d+)?)$/.exec(value)
  const matchWithoutZone = /^(-?\d+(?:\.\d+)?)(?:\s*,\s*|\s+)(-?\d+(?:\.\d+)?)$/.exec(value)

  let zone = 47
  let isNorth = true
  let easting: number | undefined
  let northing: number | undefined

  if (match) {
    zone = Number.parseInt(match[1], 10)
    isNorth = match[2].toUpperCase() === 'N'
    easting = Number.parseFloat(match[3])
    northing = Number.parseFloat(match[4])
  } else if (matchWithoutZone) {
    easting = Number.parseFloat(matchWithoutZone[1])
    northing = Number.parseFloat(matchWithoutZone[2])
  }

  if (Number.isNaN(easting) || easting === undefined || Number.isNaN(northing) || northing === undefined) return null

  const utmProj = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${isNorth ? '' : ' +south'}`
  const [lng, lat] = proj4(utmProj, '+proj=longlat +datum=WGS84 +no_defs', [easting, northing])
  return [lng, lat]
}

function parseMGRS(value: string): [number, number] | null {
  const [lng, lat] = mgrs.toPoint(value.replaceAll(/\s+/g, ''))
  return [lng, lat]
}

function toDecimalDegree(value: string, from: CoordSystem): [number, number] | null {
  try {
    const trimmed = value.trim()
    if (from === 'DD') return parseDD(trimmed)
    if (from === 'UTM') return parseUTM(trimmed)
    if (from === 'MGRS') return parseMGRS(trimmed)
  } catch {
    return null
  }
  return null
}

const PinPlacer: React.FC<PinPlacerProps> = ({ map, disabled, onMapClick, onClose }) => {
  const { t } = useTranslation('common')
  const [input, setInput] = useState('')
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const iconImageRef = React.useRef<HTMLImageElement | null>(null)
  const iconLoadedRef = React.useRef(false)
  const placedPinRef = React.useRef<[number, number] | null>(null)
  const { is2K } = useResponsive()

  const parseCoords = useCallback((): [number, number] | null => {
    return toDecimalDegree(input, 'MGRS') ?? toDecimalDegree(input, 'DD') ?? toDecimalDegree(input, 'UTM')
  }, [input])

  const clearPin = useCallback(() => {
    const source = map.getSource(RESULT_SOURCE) as GeoJSONSource | undefined
    placedPinRef.current = null
    source?.setData({
      type: 'FeatureCollection',
      features: [],
    })
  }, [map])

  const handleClear = useCallback(() => {
    setInput('')
    clearPin()
  }, [clearPin])

  const handlePlacePin = useCallback(() => {
    const coords = parseCoords()
    if (coords) {
      placedPinRef.current = coords
      const source = map.getSource(RESULT_SOURCE) as GeoJSONSource | undefined
      source?.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: coords,
            },
            properties: {},
          },
        ],
      })
      map.easeTo({ center: coords, zoom: 14 })
    } else {
      clearPin()
    }
  }, [map, parseCoords, clearPin])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && input) {
        e.preventDefault()
        handlePlacePin()
      }
    },
    [input, handlePlacePin],
  )

  // --- Map event handlers ---
  const handleMapClick = useCallback(
    (_e: maplibregl.MapMouseEvent) => {
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

  useEffect(() => {
    if (!map) return
    const ICON_NAME = 'pin-placer-icon'

    if (!iconLoadedRef.current && !iconImageRef.current) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        iconLoadedRef.current = true
        try {
          if (!map.hasImage(ICON_NAME)) {
            map.addImage(ICON_NAME, img)
          }
        } catch {
          // image may already exist
        }
      }
      img.onerror = () => {
        // icon load failed – non-critical
      }
      img.src = '/map/current.svg'
      iconImageRef.current = img
    }

    if (!map.getSource(RESULT_SOURCE)) {
      map.addSource(RESULT_SOURCE, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })
    }
    if (!map.getLayer(RESULT_LAYER)) {
      map.addLayer(
        {
          id: RESULT_LAYER,
          type: 'symbol',
          source: RESULT_SOURCE,
          layout: {
            'icon-image': ICON_NAME,
            'icon-size': is2K ? 2 : 1,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
          },
        },
        layerIdConfig.basicTools,
      )
    }
    return () => {
      if (map.getLayer(RESULT_LAYER)) map.removeLayer(RESULT_LAYER)
      if (map.getSource(RESULT_SOURCE)) map.removeSource(RESULT_SOURCE)
    }
  }, [map, is2K])

  // register a style-data handler so pin source/layer is recreated after style reload
  useEffect(() => {
    if (!map) return
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handlerId = 'pinplacer-handler'
    const handler = (m: maplibregl.Map) => {
      try {
        const ICON_NAME = 'pin-placer-icon'
        if (!m.hasImage(ICON_NAME) && iconImageRef.current && iconLoadedRef.current) {
          try {
            m.addImage(ICON_NAME, iconImageRef.current)
          } catch {
            // image may already exist
          }
        }
        if (!m.getSource(RESULT_SOURCE)) {
          const initialData = placedPinRef.current
            ? {
                type: 'FeatureCollection' as const,
                features: [
                  {
                    type: 'Feature' as const,
                    geometry: {
                      type: 'Point' as const,
                      coordinates: placedPinRef.current,
                    },
                    properties: {},
                  },
                ],
              }
            : { type: 'FeatureCollection' as const, features: [] }
          m.addSource(RESULT_SOURCE, {
            type: 'geojson',
            data: initialData,
          })
        }
        if (!m.getLayer(RESULT_LAYER)) {
          m.addLayer(
            {
              id: RESULT_LAYER,
              type: 'symbol',
              source: RESULT_SOURCE,
              layout: {
                'icon-image': ICON_NAME,
                'icon-size': is2K ? 2 : 1,
                'icon-anchor': 'bottom',
                'icon-allow-overlap': true,
              },
            },
            layerIdConfig.basicTools,
          )
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('pinplacer style-data handler error', e)
      }
    }
    register(map, handlerId, handler)
    return () => unregister(map, handlerId)
  }, [map, is2K])

  return (
    <>
      <Paper elevation={3} className='flex w-full flex-col bg-white p-2 md:w-80 md:p-4' sx={{ borderRadius: 2 }}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <label className='font-medium'>{t('tools.searchCoordinate')}</label>
            <IconButton size='small' onClick={() => setShowHelpDialog(true)}>
              <InfoIcon fontSize='small' className='text-gray-400 hover:text-gray-600' />
            </IconButton>
          </div>
          <IconButton className='md:hidden!' size='small' onClick={() => onClose?.()}>
            <CloseIcon fontSize='small' />
          </IconButton>
        </div>
        <TextField
          className='mt-2! w-full'
          placeholder={t('tools.searchCoordinateForm.inputPlaceholder')}
          size='small'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton onClick={handleClear} edge='end' size='small' disabled={!input}>
                    {input ? <CloseIcon fontSize='small' /> : <SearchIcon fontSize='small' />}
                  </IconButton>
                  <IconButton onClick={handlePlacePin} edge='end' size='small' disabled={!input}>
                    <LocationPinIcon fontSize='small' />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Paper>
      <SearchCoordinateHelpDialog open={showHelpDialog} onClose={() => setShowHelpDialog(false)} />
    </>
  )
}

export default PinPlacer
