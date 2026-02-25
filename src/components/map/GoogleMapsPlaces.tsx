import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import throttle from 'lodash.throttle'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { Autocomplete, TextField, Tooltip } from '@mui/material'
import { layerIdConfig } from '@/components/common/map/config/map'
import { GeoJSONSource } from 'maplibre-gl'
import useMapStore from '@/components/common/map/store/map'
import useResponsive from '@/hook/responsive'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const RESULT_SOURCE = 'places-search-result-source'
const RESULT_LAYER = 'places-search-result-layer'

interface GoogleMapsPlacesSearchProps {
  map: maplibregl.Map
}

const GoogleMapsPlacesSearch: React.FC<GoogleMapsPlacesSearchProps> = ({ map }) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { is2K } = useResponsive()

  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<
    { id: string; coordinates: [number, number]; displayName: string; formattedAddress: string }[]
  >([])
  const iconImageRef = React.useRef<HTMLImageElement | null>(null)
  const iconLoadedRef = React.useRef(false)
  const selectedPlaceRef = React.useRef<[number, number] | null>(null)

  useEffect(() => {
    if (!map) return
    const ICON_NAME = 'places-search-result-icon'

    if (!iconLoadedRef.current && !iconImageRef.current) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        iconLoadedRef.current = true
        try {
          if (!map.hasImage(ICON_NAME)) {
            map.addImage(ICON_NAME, img)
          }
        } catch {}
      }
      img.onerror = () => {}
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

  // register style-data handler so places source/layer and icon are recreated after style reload
  React.useEffect(() => {
    if (!map) return
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handlerId = 'places-handler'
    const handler = (m: maplibregl.Map) => {
      try {
        const ICON_NAME = 'places-search-result-icon'
        if (!m.hasImage(ICON_NAME) && iconImageRef.current && iconLoadedRef.current) {
          try {
            m.addImage(ICON_NAME, iconImageRef.current)
          } catch {}
        }

        if (!m.getSource(RESULT_SOURCE)) {
          const initialData = selectedPlaceRef.current
            ? {
                type: 'FeatureCollection' as const,
                features: [
                  {
                    type: 'Feature' as const,
                    geometry: {
                      type: 'Point' as const,
                      coordinates: selectedPlaceRef.current,
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
        console.error('places style-data handler error', e)
      }
    }
    register(map, handlerId, handler)
    return () => unregister(map, handlerId)
  }, [map, is2K])

  const fetchPlaces = useCallback(
    async (value: string, callback: any) => {
      try {
        const results = await axios.post(
          'https://places.googleapis.com/v1/places:searchText',
          {
            textQuery: value,
            languageCode: language,
            pageSize: 5,
          },
          {
            headers: {
              'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
            },
          },
        )
        callback(results.data)
        return results.data
      } catch {
        setOptions([])
        setLoading(false)
      }
    },
    [language],
  )

  const throttleFetchPlaces = useMemo(() => {
    return throttle((request, callback) => {
      return fetchPlaces(request, callback)
    }, 300)
  }, [fetchPlaces])

  const handleSearch = useCallback(
    (value: string) => {
      setLoading(true)
      throttleFetchPlaces(value, (results: any) => {
        const newOptions = results.places.map((place: any) => ({
          id: place.id,
          coordinates: [place.location.longitude, place.location.latitude],
          displayName: place.displayName.text,
          formattedAddress: place.formattedAddress,
        }))
        setOptions(newOptions)
        setLoading(false)
      })
    },
    [throttleFetchPlaces],
  )

  return (
    <Autocomplete
      className='rounded-lg bg-white'
      autoHighlight
      options={options}
      noOptionsText={t(loading ? 'tools.searchingPlaces' : 'tools.searchPlaceNoPlaces')}
      getOptionKey={(option) => option.id}
      getOptionLabel={(option) => option.displayName}
      inputValue={inputValue}
      onChange={(_, value) => {
        const source = map.getSource(RESULT_SOURCE) as GeoJSONSource | undefined
        if (value) {
          setInputValue(value.displayName)
          selectedPlaceRef.current = value.coordinates
          source?.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: value.coordinates,
                },
                properties: {},
              },
            ],
          })
          map.easeTo({ center: value.coordinates, zoom: 14 })
        } else {
          setInputValue('')
          setOptions([])
          setLoading(false)
          selectedPlaceRef.current = null
          source?.setData({
            type: 'FeatureCollection',
            features: [],
          })
        }
      }}
      onInputChange={(_, value, reason) => {
        if (reason === 'input') {
          setInputValue(value)
          if (value) {
            handleSearch(value)
          } else {
            setOptions([])
            setLoading(false)
          }
        }
      }}
      renderInput={(params) => <TextField {...params} placeholder={t('tools.searchPlacePlaceholder')} />}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Tooltip
            title={
              <span>
                {option.displayName}
                <br />
                {option.formattedAddress}
              </span>
            }
            arrow
          >
            <div className='flex w-full flex-col gap-2'>
              <span className='overflow-hidden text-ellipsis whitespace-nowrap font-medium'>{option.displayName}</span>
              <span className='overflow-hidden text-ellipsis whitespace-nowrap text-(--color-text-secondary) text-sm'>
                {option.formattedAddress}
              </span>
            </div>
          </Tooltip>
        </li>
      )}
    />
  )
}

export default GoogleMapsPlacesSearch
