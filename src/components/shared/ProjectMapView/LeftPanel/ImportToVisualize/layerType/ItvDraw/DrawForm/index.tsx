// React
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'

// UI Components
import {
  Button,
  Tabs,
  Tab,
  TextField,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Divider,
} from '@mui/material'
import { SketchPicker } from 'react-color'
import Image from 'next/image'

// Icons
import CloseIcon from '@mui/icons-material/Close'
import SquareOutlinedIcon from '@mui/icons-material/SquareOutlined'
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined'

// Map Libraries
import maplibregl, { GeoJSONSource } from 'maplibre-gl'
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawRectangleMode,
  TerraDrawCircleMode,
  TerraDrawPolygonMode,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'

// Internal Components
import Empty from '@/components/common/empty'
import useMapStore from '@/components/common/map/store/map'

// Hooks & Contexts
import { useTranslation } from 'react-i18next'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'

// Config & Types
import { layerIdConfig } from '@/components/common/map/config/map'
import { ItvDrawPolygonType, ItvDrawType } from '@interfaces/config/app.config'
import { DefaultAoiColor } from '@interfaces/config/color.config'
import { itvDrawConfig } from '../itv-draw'

// Utils
import { nanoid } from 'nanoid'
import { hexToRGBAArray } from '@/utils/color'
import { rgbaArrayToCss } from '@/components/shared/ProjectMapView/utils/utils'

// Types
interface Props {
  mapId: string
  drawType: ItvDrawType | null
  setDrawType?: (value: ItvDrawType | null) => void
  onSubmit?: (data: {
    drawType: ItvDrawType | null
    properties: Record<string, string | number>
    geometry: GeoJSON.Geometry
  }) => void
}

type TabInfo = { key: 'type' | 'border' | 'fill'; label: string }

// Constants
const RESULT_SOURCE = 'itv-draw-result-source'
const RESULT_LAYER = 'itv-draw-result-layer'

const DrawForm: FC<Props> = ({ mapId, drawType, setDrawType, onSubmit }) => {
  // ========== Hooks ==========
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const { mapLibre } = useMapStore()

  // ========== Refs ==========
  const terraDrawRef = useRef<TerraDraw | null>(null)
  const resultFeatureCollectionRef = useRef<GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>({
    type: 'FeatureCollection',
    features: [],
  })

  // ========== State ==========
  const [activeTab, setActiveTab] = useState(0)
  const [isDrawingComplete, setIsDrawingComplete] = useState(false)

  // ========== Computed Values ==========
  const polygonTypeOptions = useMemo(() => Object.values(ItvDrawPolygonType), [])
  const currentConfig = useMemo(() => (drawType ? itvDrawConfig[drawType] : undefined), [drawType])
  const map = useMemo(() => mapLibre[mapId], [mapLibre, mapId])

  const tabs = useMemo(() => {
    if (!currentConfig) return [] as TabInfo[]
    const result: TabInfo[] = []
    if (currentConfig.tabType && currentConfig.tabType.length > 0) {
      result.push({ key: 'type', label: t('itv.draw.type') })
    }
    if (currentConfig.tabBorder && currentConfig.tabBorder.length > 0) {
      result.push({ key: 'border', label: t('itv.draw.border') })
    }
    if (currentConfig.tabFill && currentConfig.tabFill.length > 0) {
      result.push({ key: 'fill', label: t('itv.draw.fill') })
    }
    return result
  }, [currentConfig, t])

  // Generate default form values based on currentConfig
  const getDefaultFieldValue = useCallback(
    (field: string): string | number => {
      if (field.toLowerCase().includes('color')) {
        return currentConfig?.value === ItvDrawType.POINT ? DefaultAoiColor.slice(0, 7) : DefaultAoiColor
      }

      if (field.toLowerCase().includes('size')) {
        if (currentConfig?.value === ItvDrawType.TEXT && field === 'drawSize') {
          return 30
        }
        if (currentConfig?.value === ItvDrawType.TEXT && field === 'drawTextHaloSize') {
          return 1
        }
        return 3
      }

      if (field.toLowerCase().includes('degree')) {
        return 0
      }

      if (field === 'drawPolygonType') {
        return polygonTypeOptions[0]
      }

      if (field === 'drawText') {
        return ''
      }

      return ''
    },
    [currentConfig, polygonTypeOptions],
  )

  const getDefaultFormValues = useCallback(() => {
    if (!currentConfig) return {}

    const defaults: Record<string, string | number> = {}
    const allFields = [
      ...(currentConfig.tabType || []),
      ...(currentConfig.tabBorder || []),
      ...(currentConfig.tabFill || []),
    ]

    allFields.forEach((field) => {
      defaults[field] = getDefaultFieldValue(field)
    })

    return defaults
  }, [currentConfig, getDefaultFieldValue])

  const [formValues, setFormValues] = useState<Record<string, string | number>>(() => getDefaultFormValues())

  // ========== Map Layer Management ==========
  const clearLayer = useCallback(() => {
    if (!map) return
    // Clear result features
    if (map.getLayer(`${RESULT_LAYER}-fill`)) map.removeLayer(`${RESULT_LAYER}-fill`)
    if (map.getLayer(`${RESULT_LAYER}-line`)) map.removeLayer(`${RESULT_LAYER}-line`)
    if (map.getLayer(`${RESULT_LAYER}-point`)) map.removeLayer(`${RESULT_LAYER}-point`)
    if (map.getLayer(`${RESULT_LAYER}-text`)) map.removeLayer(`${RESULT_LAYER}-text`)
    if (map.getSource(RESULT_SOURCE)) map.removeSource(RESULT_SOURCE)
  }, [map])

  const setResultFeatures = useCallback(
    (features?: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>[]) => {
      if (!map) return

      if (features) {
        resultFeatureCollectionRef.current.features = features
      }
      const source = map.getSource(RESULT_SOURCE) as GeoJSONSource
      source?.setData(resultFeatureCollectionRef.current)
    },
    [map],
  )

  // ========== Terra Draw Handlers ==========
  const handleTerraDrawFinish = useCallback(
    (terraDraw: TerraDraw) => {
      const features = terraDraw.getSnapshot()
      if (features.length > 0) {
        const feature = features[0]
        // Add formValues to feature properties
        feature.properties = { ...feature.properties, ...formValues, drawType }
        resultFeatureCollectionRef.current.features = [feature]
        setResultFeatures([feature])
        setIsDrawingComplete(true)
        terraDraw.stop()
        terraDrawRef.current = null

        // start a new drawing session if user wants to draw again
        setIsDrawingComplete(false)
        terraDraw.start()

        if (drawType === ItvDrawType.LINE) {
          terraDraw.setMode('linestring')
        } else if (drawType === ItvDrawType.POLYGON) {
          const polygonType = (formValues.drawPolygonType as string) || ItvDrawPolygonType.RECTANGLE
          terraDraw.setMode(polygonType)
        }
      }
    },
    [formValues, drawType, setResultFeatures],
  )

  // ========== Map Click Handlers ==========
  const handleMapClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      // Only handle clicks for POINT and TEXT modes (terra-draw handles LINE/POLYGON)
      if (!drawType || (drawType !== ItvDrawType.POINT && drawType !== ItvDrawType.TEXT)) {
        return
      }

      if (drawType === ItvDrawType.TEXT && formValues.drawText === '') {
        showAlert({ status: 'warning', title: t('alert.errorTitle'), content: t('alert.requireTextError') })
        return
      }

      const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat]

      // Create a point/text feature and store it in result
      const feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties> = {
        type: 'Feature',
        id: nanoid(),
        geometry: {
          type: 'Point',
          coordinates: coord,
        },
        properties: { ...formValues, drawType },
      }

      // Replace previous feature with new one (clear old, add new)
      resultFeatureCollectionRef.current.features = [feature]
      setResultFeatures([feature])
    },
    [drawType, setResultFeatures, formValues, showAlert, t],
  )

  // ========== Form Handlers ==========
  const handleTabChange = useCallback((_e: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }, [])

  const handleFieldChange = useCallback(
    (key: string, value: string | number) => {
      const props = { ...formValues, [key]: value }
      const features = [...resultFeatureCollectionRef.current.features]
      // Add formValues to feature properties
      if (features.length > 0) {
        features[0].properties = { ...features[0].properties, ...props }
      }
      resultFeatureCollectionRef.current.features = features
      setResultFeatures(features)

      // Set form value
      setFormValues((prev) => ({ ...prev, [key]: value }))
    },
    [formValues, setResultFeatures],
  )

  const handleCancel = useCallback(() => {
    if (setDrawType) {
      setDrawType(null)
      setIsDrawingComplete(false)
      resultFeatureCollectionRef.current.features = []
      setResultFeatures([])
    }
  }, [setDrawType, setResultFeatures])

  const handleOk = useCallback(() => {
    const geometry = resultFeatureCollectionRef.current.features[0]?.geometry || null

    if (!geometry) {
      showAlert({ status: 'warning', title: t('alert.errorTitle'), content: t('alert.mapPositionRequired') })
      return
    }

    // Check required fields
    if (currentConfig) {
      const allFields = [
        ...(currentConfig.tabType || []),
        ...(currentConfig.tabBorder || []),
        ...(currentConfig.tabFill || []),
      ]

      for (const field of allFields) {
        const value = formValues[field]

        // Check if text field is empty
        if (field === 'drawText' && (!value || (typeof value === 'string' && value.trim() === ''))) {
          showAlert({
            status: 'warning',
            title: t('alert.errorTitle'),
            content: t('alert.requireFieldError') || 'Please fill in all required fields',
          })
          return
        }
      }
    }

    onSubmit?.({
      drawType: drawType || null,
      geometry,
      properties: formValues,
    })
  }, [formValues, onSubmit, drawType, showAlert, t, currentConfig])

  // ========== Effects: Map Layer Setup ==========
  useEffect(() => {
    if (!map) return

    // Function to setup all layers
    const setupLayers = () => {
      // Cleanup old layers and sources first (in case names changed)
      clearLayer()

      const fillColorArr = hexToRGBAArray(DefaultAoiColor, true)
      const strokeColorArr = hexToRGBAArray(DefaultAoiColor)
      const fillColor = rgbaArrayToCss(fillColorArr, `rgba(${DefaultAoiColor}aa)`)
      const strokeColor = rgbaArrayToCss(strokeColorArr, `rgba(${DefaultAoiColor}ff)`)

      // Result layer for final drawn features
      map.addSource(RESULT_SOURCE, {
        type: 'geojson',
        data: resultFeatureCollectionRef.current,
      })
      map.addLayer(
        {
          id: `${RESULT_LAYER}-fill`,
          type: 'fill',
          source: RESULT_SOURCE,
          filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
          paint: {
            'fill-color': ['coalesce', ['get', 'drawFillColor'], fillColor],
            'fill-opacity': 0.6,
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
            'line-color': ['coalesce', ['get', 'drawBorderColor'], strokeColor],
            'line-width': ['coalesce', ['get', 'drawBorderSize'], 2],
          },
        },
        layerIdConfig.basicTools,
      )
      map.addLayer(
        {
          id: `${RESULT_LAYER}-point`,
          type: 'circle',
          source: RESULT_SOURCE,
          filter: ['all', ['==', ['geometry-type'], 'Point'], ['!=', ['get', 'drawType'], ItvDrawType.TEXT]],
          paint: {
            'circle-color': ['coalesce', ['get', 'drawFillColor'], '#00F0FF'],
            'circle-radius': ['coalesce', ['get', 'drawSize'], 6],
            'circle-stroke-color': ['coalesce', ['get', 'drawBorderColor'], '#ffffff'],
            'circle-stroke-width': ['coalesce', ['get', 'drawBorderSize'], 1],
            'circle-opacity': 1,
          },
        },
        layerIdConfig.basicTools,
      )

      map.addLayer(
        {
          id: `${RESULT_LAYER}-text`,
          type: 'symbol',
          source: RESULT_SOURCE,
          filter: ['==', ['get', 'drawType'], ItvDrawType.TEXT],
          layout: {
            'text-field': ['get', 'drawText'],
            'text-font': ['Noto Sans Regular'],
            'text-size': ['coalesce', ['get', 'drawSize'], 12],
            'text-letter-spacing': 0,
            'text-offset': [0, -1.2],
            'text-anchor': 'top',
            'text-allow-overlap': true,
            'symbol-placement': 'point',
            'text-rotate': ['coalesce', ['get', 'drawDegree'], 0],
            'text-rotation-alignment': 'viewport',
            'text-pitch-alignment': 'viewport',
          },
          paint: {
            'text-color': ['coalesce', ['get', 'drawTextColor'], '#222'],
            'text-halo-color': ['coalesce', ['get', 'drawTextHaloColor'], '#fff'],
            'text-halo-width': ['coalesce', ['get', 'drawTextHaloSize'], 1],
          },
        },
        layerIdConfig.basicTools,
      )
    }

    const previousCursor = map.getCanvas().style.cursor
    map.getCanvas().style.cursor = 'crosshair'

    // Setup layers initially
    setupLayers()

    // // Register style data handler to re-setup layers when basemap changes
    // const handlerId = 'itv-draw-handler'
    // const register = useMapStore.getState().registerStyleDataHandler
    // const unregister = useMapStore.getState().unregisterStyleDataHandler

    // register(map, handlerId, () => {
    //   setupLayers()

    //   // // Re-apply the feature data to the sources after recreation
    //   // const resultSource = map.getSource(RESULT_SOURCE) as GeoJSONSource
    //   // if (resultSource) {
    //   //   resultSource.setData(resultFeatureCollectionRef.current)
    //   // }

    //   // const drawingSource = map.getSource(DRAWING_SOURCE) as GeoJSONSource
    //   // if (drawingSource) {
    //   //   drawingSource.setData(drawingFeatureCollectionRef.current)
    //   // }
    // })

    return () => {
      // unregister(map, handlerId)
      clearLayer()
      map.getCanvas().style.cursor = previousCursor
    }
  }, [map, clearLayer])

  // ========== Effects: Terra Draw Setup ==========
  useEffect(() => {
    if (!map || (drawType !== ItvDrawType.LINE && drawType !== ItvDrawType.POLYGON) || isDrawingComplete) {
      // Cleanup terra-draw when not needed
      if (terraDrawRef.current) {
        terraDrawRef.current.stop()
        terraDrawRef.current = null
      }
      return
    }

    try {
      const adapter = new TerraDrawMapLibreGLAdapter({ map })

      // Register all modes upfront
      const modes = [
        new TerraDrawLineStringMode(),
        new TerraDrawRectangleMode(),
        new TerraDrawCircleMode(),
        new TerraDrawPolygonMode(),
      ]

      const terraDraw = new TerraDraw({ adapter, modes })
      terraDraw.start()

      // Select the appropriate mode
      if (drawType === ItvDrawType.LINE) {
        terraDraw.setMode('linestring')
      } else if (drawType === ItvDrawType.POLYGON) {
        const polygonType = (formValues.drawPolygonType as string) || ItvDrawPolygonType.RECTANGLE
        terraDraw.setMode(polygonType)
      }

      // Listen for drawing completion
      terraDraw.on('finish', () => handleTerraDrawFinish(terraDraw))

      terraDrawRef.current = terraDraw

      return () => {
        if (terraDraw) {
          terraDraw.stop()
        }
      }
    } catch (error) {
      console.error('Error initializing terra-draw:', error)
    }
  }, [map, drawType, isDrawingComplete, handleTerraDrawFinish, formValues.drawPolygonType])

  // Handle polygon type change by switching terra-draw modes
  useEffect(() => {
    if (!terraDrawRef.current || drawType !== ItvDrawType.POLYGON) return

    const polygonType = (formValues.drawPolygonType as string) || ItvDrawPolygonType.RECTANGLE
    terraDrawRef.current.setMode(polygonType)
  }, [formValues, drawType])

  // ========== Effects: Map Event Listeners ==========
  useEffect(() => {
    if (!map) return
    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [map, handleMapClick])

  // ========== Render Helpers ==========

  // ========== Render Helpers ==========
  const genControl = (key: string) => {
    if (key.toLowerCase().includes('size')) {
      return (
        <div key={key} className='flex flex-col'>
          <InputLabel required>{t(`itv.draw.${key}`) || key}</InputLabel>
          <TextField
            type='number'
            value={(formValues[key] as number) ?? 1}
            onChange={(e) => {
              const raw = e.target.value
              const num = raw === '' ? 1 : Number(raw)
              if (!Number.isNaN(num)) {
                const clamped = Math.max(1, Math.min(100, num))
                handleFieldChange(key, clamped)
              }
            }}
            fullWidth
            size='small'
            slotProps={{ htmlInput: { min: 1, max: 100 } }}
          />
        </div>
      )
    }
    if (key.toLowerCase().includes('degree')) {
      return (
        <div key={key} className='flex flex-col'>
          <InputLabel required>{t(`itv.draw.${key}`) || key}</InputLabel>
          <TextField
            type='number'
            value={(formValues[key] as number) ?? 0}
            onChange={(e) => {
              const raw = e.target.value
              const num = raw === '' ? 0 : Number(raw)
              if (!Number.isNaN(num)) {
                const clamped = Math.max(0, Math.min(360, num))
                handleFieldChange(key, clamped)
              }
            }}
            fullWidth
            size='small'
            slotProps={{ htmlInput: { min: 0, max: 360 } }}
          />
        </div>
      )
    }

    if (key.toLowerCase().includes('color')) {
      return (
        <div key={key} className='flex flex-col space-y-2'>
          <InputLabel required>{t(`itv.draw.${key}`) || key}</InputLabel>
          <div className='flex justify-center'>
            <SketchPicker
              disableAlpha={true}
              className='w-[84%]! pb-5! shadow-none!'
              color={(formValues[key] as string) ?? '#000000'}
              onChange={(color) => handleFieldChange(key, color.hex)}
            />
          </div>
        </div>
      )
    }

    if (key.toLowerCase().includes('polygontype')) {
      return (
        <div key={key} className='flex flex-col gap-2'>
          <ToggleButtonGroup
            value={(formValues[key] as string) ?? polygonTypeOptions[0]}
            exclusive
            onChange={(_, newValue) => {
              if (newValue !== null) {
                handleFieldChange(key, newValue)
              }
            }}
            fullWidth
          >
            {polygonTypeOptions.map((option) => (
              <Tooltip key={option} title={t(`itv.draw.polygonType.${option}`) || option} arrow>
                <ToggleButton
                  value={option}
                  aria-label={option}
                  sx={{
                    border: 'none',
                    '&.Mui-selected': {
                      color: '#0B76C8',
                      backgroundColor: '#CAD9FF',
                      '&:hover': {
                        color: '#0B76C8',
                        backgroundColor: '#CAD9FF',
                      },
                    },
                  }}
                >
                  {option === ItvDrawPolygonType.RECTANGLE && <SquareOutlinedIcon />}
                  {option === ItvDrawPolygonType.CIRCLE && <CircleOutlinedIcon />}
                  {option === ItvDrawPolygonType.POLYGON && (
                    <span className='inline-flex h-5 w-5 items-center justify-center filter transition group-hover:brightness-0 group-hover:invert'>
                      <Image
                        src={formValues[key] === option ? '/icons/polygon-blue.svg' : '/icons/polygon.svg'}
                        alt='polygon'
                        width={20}
                        height={20}
                      />
                    </span>
                  )}
                </ToggleButton>
              </Tooltip>
            ))}
          </ToggleButtonGroup>
        </div>
      )
    }

    return (
      <div key={key} className='flex flex-col'>
        <InputLabel required>{t(`itv.draw.${key}`) || key}</InputLabel>
        <TextField
          value={(formValues[key] as string) ?? ''}
          onChange={(e) => handleFieldChange(key, e.target.value.slice(0, 100))}
          fullWidth
          size='small'
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
      </div>
    )
  }

  // ========== Render ==========
  return (
    <div className='flex h-full flex-col'>
      <div className='shrink-0 px-0 md:px-2'>
        {tabs.length > 0 ? (
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant='fullWidth'
            aria-label='itv draw tabs'
            indicatorColor='primary'
            sx={{
              borderBottom: '1px solid #e0e0e0',
            }}
          >
            {tabs.map((tab, idx) => (
              <Tab key={`${tab.key}-${idx}`} label={tab.label} />
            ))}
          </Tabs>
        ) : (
          <Empty message={t('empty.noList')} />
        )}
      </div>
      <div className='flex-1 overflow-y-auto px-2 pt-2'>
        {tabs.length > 0 && (
          <div>
            {tabs[activeTab].key === 'type' && currentConfig?.tabType && (
              <div className='space-y-4'>{currentConfig.tabType.map((key) => genControl(key))}</div>
            )}
            {tabs[activeTab].key === 'border' && currentConfig?.tabBorder && (
              <div className='space-y-4'>{currentConfig.tabBorder.map((key) => genControl(key))}</div>
            )}
            {tabs[activeTab].key === 'fill' && currentConfig?.tabFill && (
              <div className='space-y-4'>{currentConfig.tabFill.map((key) => genControl(key))}</div>
            )}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className='m-0 mt-0 mb-0 flex shrink-0 justify-center gap-4 border-(--color-gray-border) border-t p-0 pt-4 pb-2'>
        <Divider />
        <div className={`flex w-full gap-4 md:w-auto`}>
          <Button className={`w-30 flex-1`} variant='outlined' startIcon={<CloseIcon />} onClick={handleCancel}>
            {t('button.cancel')}
          </Button>
          <Button variant='contained' color='primary' className={`flex-1`} onClick={handleOk}>
            {t('button.ok')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DrawForm
