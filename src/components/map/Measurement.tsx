import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { GeoJSONSource, LngLatLike, Marker } from 'maplibre-gl'
import * as turf from '@turf/turf'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@/components/common/input/InputLabel'
import { convertArea } from '@/utils/convert'
import { layerIdConfig } from '@/components/common/map/config/map'
import { Position } from 'geojson'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import { PolygonIcon, PolylineIcon } from '@/icons'
import { IconButton } from '@mui/material'
import { areaUnits, lengthUnits } from '@/components/common/dialog/SettingsDialog'
import { createRoot, Root } from 'react-dom/client'
import useMapStore from '@/components/common/map/store/map'
import { nanoid } from 'nanoid'

interface MeasurementProps {
  map: maplibregl.Map
  disabled?: boolean
  onMapClick?: () => void
  onClose?: () => void
}

type Mode = 'length' | 'area'

const LOCALE_STRING_OPTIONS = {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
}

function convertLength(lengthMeter: number, unit: string): number {
  switch (unit) {
    case 'meter':
      return lengthMeter
    case 'km':
      return lengthMeter / 1000
    case 'foot':
      return lengthMeter / 0.3048
    case 'yard':
      return lengthMeter / 0.9144
    case 'mile':
      return lengthMeter / 1609.344
    case 'nauticmile':
      return lengthMeter / 1852
    default:
      return lengthMeter
  }
}

type MeasurementResult = {
  mode: Mode
  value: number
  displayValue: string
  position: Position
  marker: maplibregl.Marker
  markerRoot: Root
}

const getRandomId = () => nanoid()

const DRAWING_SOURCE = 'measurement-drawing-source'
const DRAWING_LAYER = 'measurement-drawing-layer'
const RESULT_SOURCE = 'measurement-result-source'
const RESULT_LAYER = 'measurement-result-layer'

const Measurement: React.FC<MeasurementProps> = ({ map, disabled, onMapClick, onClose }) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const [mode, setMode] = useState<Mode | null>(null)
  const [areaUnit, setAreaUnit] = useState('sqkm')
  const [lengthUnit, setLengthUnit] = useState('km')
  const [currentCoordinates, setCurrentCoordinates] = useState<[number, number][]>([])
  const [mouseLngLat, setMouseLngLat] = useState<[number, number] | null>(null)
  const [measureResults, setMeasureResults] = useState<Record<string, MeasurementResult>>({})
  const currentFeatureId = useRef<string | null>(null)

  const resultFeatureCollectionRef = useRef<GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>({
    type: 'FeatureCollection',
    features: [],
  })
  const drawingFeatureCollectionRef = useRef<GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>({
    type: 'FeatureCollection',
    features: [],
  })

  // Helper to convert sqm to ไร่ งาน ตารางวา
  const sqmToRaiNganWah = useCallback(
    (areaSqm: number): string => {
      const rai = Math.floor(areaSqm / 1600)
      const ngan = Math.floor((areaSqm % 1600) / 400)
      const wah = ((areaSqm % 1600) % 400) / 4
      // Format with comma
      const raiStr = rai.toLocaleString()
      const nganStr = ngan.toLocaleString()
      const wahStr = wah % 1 === 0 ? wah.toLocaleString() : wah.toLocaleString(undefined, LOCALE_STRING_OPTIONS)
      return `${raiStr} ${t('unit.area.raiAbbr')} ${nganStr} ${t('unit.area.nganAbbr')} ${wahStr} ${t('unit.area.sqwaAbbr')}`
    },
    [t],
  )

  const setResultFeatures = useCallback(
    (features?: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>[]) => {
      if (features) {
        resultFeatureCollectionRef.current.features = features
      }
      const source = map.getSource(RESULT_SOURCE) as GeoJSONSource | undefined
      source?.setData(resultFeatureCollectionRef.current)
    },
    [map],
  )

  const setDrawingFeatures = useCallback(
    (features?: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>[]) => {
      if (features) {
        drawingFeatureCollectionRef.current.features = features
      }
      const source = map.getSource(DRAWING_SOURCE) as GeoJSONSource | undefined
      source?.setData(drawingFeatureCollectionRef.current)
    },
    [map],
  )

  const getDisplayValue = useCallback(
    (value: number, mode: Mode, lengthUnit: string, areaUnit: string): string => {
      return mode === 'length'
        ? `${convertLength(value, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${t(lengthUnits.find((u) => u.code === lengthUnit)?.abbr || '')}`
        : areaUnit === 'rai'
          ? sqmToRaiNganWah(value)
          : `${convertArea(value, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${t(areaUnits.find((u) => u.code === areaUnit)?.abbr || '')}`
    },
    [t, sqmToRaiNganWah],
  )

  const renderMeasureResult = useCallback((root: Root, isLengthMode: boolean, displayValue: string) => {
    root.render(
      <div className='flex items-center gap-2'>
        <div className='flex items-center'>
          {isLengthMode ? <PolylineIcon fontSize='small' /> : <PolygonIcon fontSize='small' />}
        </div>
        <div className='text-sm'>{displayValue}</div>
      </div>,
    )
  }, [])

  // --- Finish drawing and save feature ---
  const finishDrawing = useCallback(() => {
    const isLengthMode = mode === 'length'
    if ((isLengthMode && currentCoordinates.length > 1) || (mode === 'area' && currentCoordinates.length > 2)) {
      const coordinates = isLengthMode
        ? (currentCoordinates as Position[])
        : ([[...currentCoordinates, currentCoordinates[0]]] as Position[][])
      const featureId = getRandomId()
      const feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties> = {
        id: featureId,
        type: 'Feature',
        geometry:
          mode === 'length'
            ? {
                type: 'LineString',
                coordinates: coordinates as Position[],
              }
            : {
                type: 'Polygon',
                coordinates: coordinates as Position[][],
              },
        properties: {},
      }
      resultFeatureCollectionRef.current.features.push(feature)
      setResultFeatures()

      const measureResult = isLengthMode
        ? turf.length(turf.lineString(coordinates as Position[]), {
            units: 'meters',
          })
        : turf.area(turf.polygon(coordinates as Position[][]))
      const displayValue = getDisplayValue(measureResult, mode, lengthUnit, areaUnit)
      const labelCoordinates = isLengthMode
        ? (coordinates as Position[]).at(-1)!
        : turf.pointOnFeature(turf.polygon(coordinates as Position[][])).geometry.coordinates
      const measureResultEl = document.createElement('div')
      measureResultEl.className = 'font-(family-name:--font) bg-white rounded shadow px-2 py-1'
      const markerRoot = createRoot(measureResultEl)
      renderMeasureResult(markerRoot, isLengthMode, displayValue)
      const measureResultMarker = new Marker({
        element: measureResultEl,
        anchor: 'center',
        offset: isLengthMode ? [0, -20] : [0, 0],
      })
        .setLngLat(labelCoordinates as LngLatLike)
        .addTo(map)
      setMeasureResults({
        ...measureResults,
        [featureId]: {
          mode,
          value: measureResult,
          displayValue,
          position: labelCoordinates,
          marker: measureResultMarker,
          markerRoot,
        },
      })
    }
    setCurrentCoordinates([])
    setMode(null)
    setMouseLngLat(null)
    currentFeatureId.current = null
  }, [
    mode,
    currentCoordinates,
    areaUnit,
    setResultFeatures,
    lengthUnit,
    map,
    getDisplayValue,
    measureResults,
    renderMeasureResult,
  ])

  const updateMeasureResults = useCallback(
    (_lengthUnit = lengthUnit, _areaUnit = areaUnit) => {
      const newMeasureResults = { ...measureResults }
      Object.values(newMeasureResults).forEach((result) => {
        const displayValue = getDisplayValue(result.value, result.mode, _lengthUnit, _areaUnit)
        result.displayValue = displayValue
        renderMeasureResult(result.markerRoot, result.mode === 'length', displayValue)
      })
      setMeasureResults(newMeasureResults)
    },
    [getDisplayValue, areaUnit, lengthUnit, measureResults, renderMeasureResult],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: missing dependencies are intentional
  useEffect(() => {
    setTimeout(() => {
      updateMeasureResults()
    }, 100)
  }, [language])

  useEffect(() => {
    if (!map) return
    drawingFeatureCollectionRef.current.features = []
    if (mode && currentCoordinates.length > 0) {
      let previewCoords = [...currentCoordinates]
      if (mouseLngLat) {
        previewCoords = [...currentCoordinates, mouseLngLat]
      }
      if (mode === 'length' || previewCoords.length === 2) {
        drawingFeatureCollectionRef.current.features = [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: previewCoords,
            },
            properties: {},
          },
        ]
      } else if (mode === 'area' && previewCoords.length > 2) {
        drawingFeatureCollectionRef.current.features = [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[...previewCoords, previewCoords[0]]],
            },
            properties: {},
          },
        ]
      }
    }
    setDrawingFeatures()
  }, [map, mode, currentCoordinates, mouseLngLat, setDrawingFeatures])

  // --- Map event handlers ---
  const handleMapClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!mode && !disabled) {
        onMapClick?.()
        return
      }
      setCurrentCoordinates((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]])
    },
    [mode, onMapClick, disabled],
  )

  const handleMapDblClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!mode) return
      e.preventDefault()
      finishDrawing()
    },
    [mode, finishDrawing],
  )

  const handleMapMouseMove = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!mode) return
      setMouseLngLat([e.lngLat.lng, e.lngLat.lat])
    },
    [mode],
  )

  useEffect(() => {
    if (!map) return
    map.on('click', handleMapClick)
    map.on('dblclick', handleMapDblClick)
    map.on('mousemove', handleMapMouseMove)
    return () => {
      map.off('click', handleMapClick)
      map.off('dblclick', handleMapDblClick)
      map.off('mousemove', handleMapMouseMove)
    }
  }, [map, handleMapClick, handleMapDblClick, handleMapMouseMove])

  useEffect(() => {
    if (!map) return
    if (!map.getSource(RESULT_SOURCE)) {
      map.addSource(RESULT_SOURCE, {
        type: 'geojson',
        data: resultFeatureCollectionRef.current,
      })
      map.addLayer(
        {
          id: `${RESULT_LAYER}-fill`,
          type: 'fill',
          source: RESULT_SOURCE,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': '#0E94FA',
            'fill-opacity': 0.3,
          },
        },
        layerIdConfig.basicTools,
      )
      map.addLayer(
        {
          id: `${RESULT_LAYER}-line`,
          type: 'line',
          source: RESULT_SOURCE,
          paint: {
            'line-color': '#0E94FA',
            'line-width': 2,
          },
        },
        layerIdConfig.basicTools,
      )
      map.addSource(DRAWING_SOURCE, {
        type: 'geojson',
        data: drawingFeatureCollectionRef.current,
      })
      map.addLayer(
        {
          id: `${DRAWING_LAYER}-fill`,
          type: 'fill',
          source: DRAWING_SOURCE,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': '#0E94FA',
            'fill-opacity': 0.3,
          },
        },
        layerIdConfig.basicTools,
      )
      map.addLayer(
        {
          id: `${DRAWING_LAYER}-line`,
          type: 'line',
          source: DRAWING_SOURCE,
          paint: {
            'line-color': '#0E94FA',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        },
        layerIdConfig.basicTools,
      )
      map.addLayer(
        {
          id: `${DRAWING_LAYER}-circle`,
          type: 'circle',
          source: DRAWING_SOURCE,
          paint: {
            'circle-radius': 4,
            'circle-color': '#0E94FA',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        },
        layerIdConfig.basicTools,
      )
    }
    return () => {
      if (map.getLayer(`${RESULT_LAYER}-fill`)) map.removeLayer(`${RESULT_LAYER}-fill`)
      if (map.getLayer(`${RESULT_LAYER}-line`)) map.removeLayer(`${RESULT_LAYER}-line`)
      if (map.getSource(RESULT_SOURCE)) map.removeSource(RESULT_SOURCE)
      if (map.getLayer(`${DRAWING_LAYER}-fill`)) map.removeLayer(`${DRAWING_LAYER}-fill`)
      if (map.getLayer(`${DRAWING_LAYER}-line`)) map.removeLayer(`${DRAWING_LAYER}-line`)
      if (map.getLayer(`${DRAWING_LAYER}-circle`)) map.removeLayer(`${DRAWING_LAYER}-circle`)
      if (map.getSource(DRAWING_SOURCE)) map.removeSource(DRAWING_SOURCE)
    }
  }, [map])

  // register style-data handler to recreate sources/layers after style reload
  useEffect(() => {
    if (!map) return
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handlerId = `measurement-${getRandomId()}`
    const handler = (m: maplibregl.Map) => {
      try {
        if (!m.getSource(RESULT_SOURCE)) {
          m.addSource(RESULT_SOURCE, {
            type: 'geojson',
            data: resultFeatureCollectionRef.current,
          })
        }
        if (!m.getLayer(`${RESULT_LAYER}-fill`)) {
          m.addLayer(
            {
              id: `${RESULT_LAYER}-fill`,
              type: 'fill',
              source: RESULT_SOURCE,
              filter: ['==', ['geometry-type'], 'Polygon'],
              paint: {
                'fill-color': '#0E94FA',
                'fill-opacity': 0.3,
              },
            },
            layerIdConfig.basicTools,
          )
        }
        if (!m.getLayer(`${RESULT_LAYER}-line`)) {
          m.addLayer(
            {
              id: `${RESULT_LAYER}-line`,
              type: 'line',
              source: RESULT_SOURCE,
              paint: {
                'line-color': '#0E94FA',
                'line-width': 2,
              },
            },
            layerIdConfig.basicTools,
          )
        }
        if (!m.getSource(DRAWING_SOURCE)) {
          m.addSource(DRAWING_SOURCE, {
            type: 'geojson',
            data: drawingFeatureCollectionRef.current,
          })
        }
        if (!m.getLayer(`${DRAWING_LAYER}-fill`)) {
          m.addLayer(
            {
              id: `${DRAWING_LAYER}-fill`,
              type: 'fill',
              source: DRAWING_SOURCE,
              filter: ['==', ['geometry-type'], 'Polygon'],
              paint: {
                'fill-color': '#0E94FA',
                'fill-opacity': 0.3,
              },
            },
            layerIdConfig.basicTools,
          )
        }
        if (!m.getLayer(`${DRAWING_LAYER}-line`)) {
          m.addLayer(
            {
              id: `${DRAWING_LAYER}-line`,
              type: 'line',
              source: DRAWING_SOURCE,
              paint: {
                'line-color': '#0E94FA',
                'line-width': 2,
                'line-dasharray': [2, 2],
              },
            },
            layerIdConfig.basicTools,
          )
        }
        if (!m.getLayer(`${DRAWING_LAYER}-circle`)) {
          m.addLayer(
            {
              id: `${DRAWING_LAYER}-circle`,
              type: 'circle',
              source: DRAWING_SOURCE,
              paint: {
                'circle-radius': 4,
                'circle-color': '#0E94FA',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              },
            },
            layerIdConfig.basicTools,
          )
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('measurement style-data handler error', e)
      }
    }
    register(map, handlerId, handler)
    return () => {
      unregister(map, handlerId)
    }
  }, [map])

  const setDrawingMode = useCallback((mode: Mode | null) => {
    setCurrentCoordinates([])
    setMouseLngLat(null)
    setMode(mode)
    currentFeatureId.current = mode ? getRandomId() : null
  }, [])

  useEffect(() => {
    if (disabled) {
      setDrawingMode(null)
    }
  }, [disabled, setDrawingMode])

  const zoomToFeature = useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>) => {
      if (!map) return
      try {
        if (feature.geometry.type === 'Point') {
          const c = feature.geometry.coordinates as number[]
          map.easeTo({ center: [c[0], c[1]], zoom: 14 })
          return
        }

        let geo: any
        if (feature.geometry.type === 'LineString') {
          geo = turf.lineString(feature.geometry.coordinates)
        } else if (feature.geometry.type === 'Polygon') {
          geo = turf.polygon(feature.geometry.coordinates)
        }
        if (!geo) return
        const b = turf.bbox(geo) // [minX, minY, maxX, maxY]
        map.fitBounds(
          [
            [b[0], b[1]],
            [b[2], b[3]],
          ],
          { padding: 40 },
        )
      } catch {}
    },
    [map],
  )

  const removeMeasureResult = useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>) => {
      const featureId = feature.id as string
      // Remove marker
      measureResults[featureId]?.marker.remove()
      // Remove from result features
      resultFeatureCollectionRef.current.features = resultFeatureCollectionRef.current.features.filter(
        (f) => f.id !== featureId,
      )
      setResultFeatures()
      // Remove from measureResults state
      const newMeasureResults = { ...measureResults }
      delete newMeasureResults[featureId]
      setMeasureResults(newMeasureResults)
    },
    [measureResults, setResultFeatures],
  )

  // --- Calculate current result (with preview) ---
  const currentResult = useMemo(() => {
    if (!mode) {
      return undefined
    }
    const isLengthMode = mode === 'length'
    const previewCoords = mouseLngLat ? [...currentCoordinates, mouseLngLat] : [...currentCoordinates]
    if ((isLengthMode && previewCoords.length < 2) || (!isLengthMode && previewCoords.length < 3)) {
      return undefined
    }
    const coordinates = isLengthMode
      ? (previewCoords as Position[])
      : ([[...previewCoords, previewCoords[0]]] as Position[][])
    const measureResult = isLengthMode
      ? turf.length(turf.lineString(coordinates as Position[]), {
          units: 'meters',
        })
      : turf.area(turf.polygon(coordinates as Position[][]))
    const displayValue = getDisplayValue(measureResult, mode, lengthUnit, areaUnit)
    return (
      <div className='mb-0.5 flex h-[34px] items-center rounded-xs bg-[#e0e9ff] px-2'>
        <div className='flex items-center'>
          {mode === 'length' ? <PolylineIcon fontSize='small' /> : <PolygonIcon fontSize='small' />}
        </div>
        <div className='mx-2 flex-1 truncate text-left text-sm'>{displayValue}</div>
      </div>
    )
  }, [mode, currentCoordinates, mouseLngLat, getDisplayValue, areaUnit, lengthUnit])

  return (
    <Paper elevation={3} className='flex w-full flex-col bg-white p-2 md:w-80 md:p-4' sx={{ borderRadius: 2 }}>
      <div className='flex items-center justify-between'>
        <label className='font-medium'>{t('tools.measurement')}</label>
        <IconButton className='md:hidden!' size='small' onClick={() => onClose?.()}>
          <CloseIcon fontSize='small' />
        </IconButton>
      </div>
      <div className='my-2 flex items-center gap-2'>
        <div className='flex flex-1 flex-col'>
          <InputLabel className='hidden md:block'>{t('form.settings.areaUnit')}</InputLabel>
          <Select
            value={areaUnit}
            onChange={(e) =>
              setAreaUnit(() => {
                updateMeasureResults(lengthUnit, e.target.value)
                return e.target.value
              })
            }
          >
            {areaUnits.map((unit) => (
              <MenuItem key={unit.code} value={unit.code}>
                {t(unit.label)}
              </MenuItem>
            ))}
          </Select>
        </div>
        <div className='flex flex-1 flex-col'>
          <InputLabel className='hidden md:block'>{t('form.settings.lengthUnit')}</InputLabel>
          <Select
            value={lengthUnit}
            onChange={(e) =>
              setLengthUnit(() => {
                updateMeasureResults(e.target.value, areaUnit)
                return e.target.value
              })
            }
          >
            {lengthUnits.map((unit) => (
              <MenuItem key={unit.code} value={unit.code}>
                {t(unit.label)}
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>
      {currentResult}
      {resultFeatureCollectionRef.current.features.length > 0 && (
        <div className='flex max-h-20 flex-col gap-0.5 overflow-auto'>
          {resultFeatureCollectionRef.current.features
            .slice()
            .reverse()
            .map((f) => (
              <button
                key={f.id}
                className='!bg-(--color-background-default) flex cursor-pointer items-center rounded-xs px-2 py-0.5'
                type='button'
                onClick={() => zoomToFeature(f)}
              >
                <div className='flex items-center'>
                  {f.geometry.type === 'LineString' && <PolylineIcon fontSize='small' />}
                  {f.geometry.type === 'Polygon' && <PolygonIcon fontSize='small' />}
                </div>
                <div className='mx-2 flex-1 truncate text-left text-sm'>{measureResults[f.id!]?.displayValue}</div>
                <IconButton
                  size='small'
                  color='error'
                  onClick={(e) => {
                    e.stopPropagation()
                    removeMeasureResult(f)
                  }}
                >
                  <DeleteIcon fontSize='small' />
                </IconButton>
              </button>
            ))}
        </div>
      )}
      <div className='mt-2 flex gap-2'>
        <Button
          className='min-w-0! px-2!'
          variant={mode === 'area' ? 'contained' : 'outlined'}
          onClick={() => setDrawingMode(mode === 'area' ? null : 'area')}
        >
          <PolygonIcon fontSize='small' />
        </Button>
        <Button
          className='min-w-0! px-2!'
          variant={mode === 'length' ? 'contained' : 'outlined'}
          onClick={() => setDrawingMode(mode === 'length' ? null : 'length')}
        >
          <PolylineIcon fontSize='small' />
        </Button>
        <div className='flex-1' />
        {mode && (
          <Button variant='contained' color='primary' onClick={finishDrawing}>
            {t('button.save')}
          </Button>
        )}
      </div>
    </Paper>
  )
}

export default Measurement
