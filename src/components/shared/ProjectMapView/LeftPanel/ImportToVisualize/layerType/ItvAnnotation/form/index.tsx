import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Map as MapBoxMap, MapMouseEvent } from 'maplibre-gl'

import { Tabs, Tab, IconButton, Button, useMediaQuery, useTheme } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import ms from 'milsymbol'
import { nanoid } from 'nanoid'

import { AnnotationItem, AnnotationLabelItem, AnnotationSymbolItem } from '@interfaces/entities'
import useMapStore from '@/components/common/map/store/map'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { cropCanvasImage } from '@/utils/crop-image'

import { SelectedSymbol } from '..'
import SymbolForm, { defaultSymbolFormValues } from './SymbolForm'
import LabelForm, { defaultLabelFormValues } from './LabelForm'
import useResponsive from '@/hook/responsive'

type Props = {
  initialData?: SelectedSymbol
  editItem?: AnnotationItem | null
  mapId: string
  onEditSymbol?: () => void
  onCancel?: (editItem?: AnnotationItem | null) => void
  onSubmit?: (data: AnnotationItem) => void
}

const AnnotationForm: React.FC<Props> = ({ initialData, editItem, mapId, onEditSymbol, onCancel, onSubmit }) => {
  const { mapLibre } = useMapStore()
  const theme = useTheme()
  const { is2K } = useResponsive()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [activeTab, setActiveTab] = useState(0)
  const baseSidc = useMemo(() => initialData?.sidc || ''.padEnd(20, '0'), [initialData?.sidc])

  const [symbolValues, setSymbolValues] = useState<AnnotationSymbolItem>(
    editItem?.annotationSymbol || defaultSymbolFormValues,
  )
  const [labelValues, setLabelValues] = useState<AnnotationLabelItem>(
    editItem?.annotationLabel || defaultLabelFormValues,
  )
  const [currentSidc, setCurrentSidc] = useState<string>(baseSidc)
  const [mapClickGeometry, setMapClickGeometry] = useState<{ type: 'Point'; coordinates: [number, number] } | null>(
    editItem?.geometry || null,
  )
  const [croppedSymbolUrl, setCroppedSymbolUrl] = useState<string>('')
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const symbolDataRef = useRef<{
    lng: number
    lat: number
    sidc: string
    symbolSize: number
    labelValues: AnnotationLabelItem
  } | null>(null)
  const isRecreatingRef = useRef(false)
  const sourceId = 'annotation-symbol-source'
  const layerId = 'annotation-symbol-layer'

  const map = mapLibre[mapId]

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  // Update values when editItem changes
  useEffect(() => {
    if (editItem) {
      setSymbolValues(editItem.annotationSymbol || defaultSymbolFormValues)
      setLabelValues(editItem.annotationLabel || defaultLabelFormValues)
      setMapClickGeometry(editItem.geometry)
      // Initialize editItem symbol data ref
      symbolDataRef.current = {
        lng: editItem.geometry.coordinates[0] ?? 0,
        lat: editItem.geometry.coordinates[1] ?? 0,
        sidc: editItem.sidc,
        symbolSize: editItem?.annotationSymbol?.symbolSize || 40,
        labelValues: symbolDataRef.current?.labelValues || defaultLabelFormValues,
      }

      if (editItem.sidc) {
        setCurrentSidc(editItem.sidc)
      }
    }
  }, [editItem])

  const handleSymbolFormChange = useCallback(
    (values: AnnotationSymbolItem) => {
      setSymbolValues(values)

      const sidc = buildSidc(baseSidc, values)
      symbolDataRef.current = {
        lng: symbolDataRef.current?.lng ?? 0,
        lat: symbolDataRef.current?.lat ?? 0,
        sidc,
        symbolSize: values.symbolSize,
        labelValues: symbolDataRef.current?.labelValues || defaultLabelFormValues,
      }

      setCurrentSidc(sidc)
    },
    [baseSidc],
  )

  const handleLabelFormChange = useCallback((values: AnnotationLabelItem) => {
    setLabelValues((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(values)) {
        return prev
      }
      return values
    })
  }, [])

  const handleFormSubmit = () => {
    if (!mapClickGeometry) {
      showAlert({ status: 'warning', title: t('alert.errorTitle'), content: t('alert.mapPositionRequired') })
      return
    }

    clearSymbolLayer()
    onSubmit?.({
      id: editItem?.id || nanoid(),
      sidc: currentSidc,
      annotationSymbol: symbolValues,
      annotationLabel: labelValues,
      geometry: mapClickGeometry ?? { type: 'Point', coordinates: [0, 0] },
    })
  }

  // Generate symbol URL based on current form data
  const symbolUrl = useMemo(() => {
    if (!currentSidc) return ''

    try {
      const symbolSize = 40
      // Convert null values to undefined for SymbolOptions compatibility
      const cleanProperties = Object.fromEntries(
        Object.entries(labelValues).map(([key, value]) => [key, value ?? undefined]),
      )
      const properties = { ...cleanProperties, size: symbolSize }
      const sym = new ms.Symbol(currentSidc, properties)

      // Return the data URL directly from symbol
      return sym.toDataURL()
    } catch (error) {
      console.error('Error generating symbol:', error)
      return ''
    }
  }, [currentSidc, labelValues])

  // Crop symbol image asynchronously for preview
  useEffect(() => {
    if (!symbolUrl) {
      setCroppedSymbolUrl('')
      return
    }

    const cropSymbol = () => {
      try {
        const img = new globalThis.Image()
        img.onload = () => {
          // Create canvas and draw image
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            setCroppedSymbolUrl(symbolUrl)
            return
          }

          ctx.drawImage(img, 0, 0)

          // Crop the canvas
          const croppedCanvas = cropCanvasImage(canvas, false)
          setCroppedSymbolUrl(croppedCanvas.toDataURL())
        }
        img.onerror = () => {
          setCroppedSymbolUrl(symbolUrl)
        }
        img.src = symbolUrl
      } catch (error) {
        console.error('Error cropping symbol:', error)
        setCroppedSymbolUrl(symbolUrl)
      }
    }

    cropSymbol()
  }, [symbolUrl])

  // Add symbol to map function
  const addSymbolToMap = useCallback(
    (mapInstance: MapBoxMap, lng: number, lat: number, sidc: string, symbolSize = 40) => {
      try {
        // Convert null values to undefined for SymbolOptions compatibility
        const cleanProperties = Object.fromEntries(
          Object.entries(labelValues).map(([key, value]) => [key, value ?? undefined]),
        )
        const properties = { ...cleanProperties, size: symbolSize }
        const sym = new ms.Symbol(sidc, properties)

        const svgString = sym.asSVG()
        const { width, height } = sym.getSize()

        // Create a canvas from SVG
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const svg = new Blob([svgString], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(svg)
        const imgElement = new globalThis.Image(width, height)
        imgElement.onload = () => {
          ctx.drawImage(imgElement, 0, 0)
          URL.revokeObjectURL(url)

          if (mapInstance.getLayer(layerId)) {
            mapInstance.removeLayer(layerId)
          }
          if (mapInstance.getSource(sourceId)) {
            mapInstance.removeSource(sourceId)
          }
          if (mapInstance.hasImage(sourceId)) {
            mapInstance.removeImage(sourceId)
          }

          mapInstance.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [lng, lat],
              },
              properties: {
                sidc,
                symbolSize,
              },
            },
          })

          mapInstance.addLayer({
            id: layerId,
            type: 'symbol',
            source: sourceId,
            layout: {
              'icon-image': sourceId,
              'icon-size': is2K ? 2 : 1,
              'icon-allow-overlap': true,
            },
          })

          // Crop canvas and add image to map
          const croppedCanvas = cropCanvasImage(canvas, false)
          const croppedCtx = croppedCanvas.getContext('2d')
          if (croppedCtx) {
            const imageData = croppedCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height)
            mapInstance.addImage(sourceId, imageData)
          }

          // Mark recreation as complete
          isRecreatingRef.current = false
        }
        imgElement.onerror = () => {
          // ensure URL is revoked on error to avoid leaks
          try {
            URL.revokeObjectURL(url)
          } catch {}
          // Mark recreation as complete even on error
          isRecreatingRef.current = false
        }
        imgElement.src = url
      } catch (error) {
        console.error('Error adding symbol to map:', error)
        isRecreatingRef.current = false
      }
    },
    [labelValues, is2K],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: fix loop
  useEffect(() => {
    if (!mapId || !initialData) return

    if (!map) return

    const previousCursor = map.getCanvas().style.cursor
    map.getCanvas().style.cursor = 'crosshair'

    const handleMapClick = (e: MapMouseEvent) => {
      const lngLat = e.lngLat
      if (lngLat) {
        const sidc = currentSidc
        const symbolSize = symbolValues.symbolSize || 40

        symbolDataRef.current = { lng: lngLat.lng, lat: lngLat.lat, sidc, symbolSize, labelValues }
        setMapClickGeometry({
          type: 'Point',
          coordinates: [lngLat.lng, lngLat.lat],
        })

        isRecreatingRef.current = true
        addSymbolToMap(map, lngLat.lng, lngLat.lat, sidc, symbolSize)
      }
    }

    const handleStyleData = () => {
      if (isRecreatingRef.current) return
      if (map.getLayer(layerId) || map.getSource(sourceId)) return
      if (!symbolDataRef.current) return

      // Mark as recreating before starting async operation
      isRecreatingRef.current = true

      const { lng, lat, sidc, symbolSize } = symbolDataRef.current
      addSymbolToMap(map, lng, lat, sidc, symbolSize)
    }

    map.on('click', handleMapClick)
    map.on('styledata', handleStyleData)

    return () => {
      // Remove temporary preview artifacts when leaving the form
      clearSymbolLayer()
      map.off('click', handleMapClick)
      map.off('styledata', handleStyleData)
      map.getCanvas().style.cursor = previousCursor
      isRecreatingRef.current = false
    }
  }, [map, currentSidc, symbolValues, addSymbolToMap])

  const clearSymbolLayer = () => {
    if (!map) return

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
    if (map.hasImage(sourceId)) {
      map.removeImage(sourceId)
    }
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      })

      map.removeSource(sourceId)
    }
  }

  const handleEditSymbol = () => {
    clearSymbolLayer()
    onEditSymbol?.()
  }

  const handleCancel = () => {
    clearSymbolLayer()
    onCancel?.(editItem || null)
  }

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex shrink-0 items-center pt-0'>
        <IconButton onClick={handleEditSymbol} size='small'>
          <ChevronLeftIcon className='text-[#040904]' />
        </IconButton>
        <p className='font-medium text-[#040904] text-base'>{t('annotation.editSymbol')}</p>
      </div>
      <div className='shrink-0 px-0 md:px-2'>
        <Tabs value={activeTab} onChange={handleChange} variant='fullWidth' aria-label='symbol annotation tabs'>
          <Tab label={t('annotation.symbol') ?? 'Symbol'} />
          <Tab label={t('annotation.label') ?? 'Label'} />
        </Tabs>
      </div>

      {/* Symbol Preview Section */}
      <div className='flex shrink-0 items-center justify-center gap-4 py-8'>
        {(croppedSymbolUrl || symbolUrl) && (
          <div className='relative flex items-center gap-2'>
            <Image
              src={croppedSymbolUrl || symbolUrl}
              alt='Symbol Preview'
              width={40}
              height={40}
              style={{ width: '4rem' }}
            />
          </div>
        )}
      </div>

      <div className='flex-1 overflow-hidden px-2'>
        {activeTab === 0 && (
          <SymbolForm initialData={initialData} initialValues={symbolValues} onChange={handleSymbolFormChange} />
        )}
        {activeTab === 1 && (
          <LabelForm
            initialData={initialData}
            initialValues={labelValues}
            symbolValues={symbolValues}
            onChange={handleLabelFormChange}
          />
        )}
      </div>

      {/* Buttons */}
      <div className='m-4 mt-0 mb-0 flex shrink-0 justify-center border-(--color-gray-border) border-t p-0 pt-4 pb-2'>
        <div className={`flex gap-4 ${isMobile ? 'w-full' : ''}`}>
          <Button
            className={`${isMobile ? 'flex-1' : ''}`}
            variant='outlined'
            startIcon={<CloseIcon />}
            onClick={handleCancel}
          >
            {t('button.cancel')}
          </Button>
          <Button
            variant='contained'
            color='primary'
            className={`${isMobile ? 'flex-1' : ''}`}
            onClick={handleFormSubmit}
          >
            {t('button.ok')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AnnotationForm

const buildSidc = (baseSidc: string, values: AnnotationSymbolItem): string => {
  const sidcArr = baseSidc.padEnd(20, '0').split('')

  if (values.context) sidcArr[2] = values.context
  if (values.identity) sidcArr[3] = values.identity
  if (values.status) sidcArr[6] = values.status

  if (values.headquarters) sidcArr[7] = values.headquarters
  if (values.echelon) {
    sidcArr[8] = values.echelon[0] || sidcArr[8]
    sidcArr[9] = values.echelon[1] || sidcArr[9]
  }
  if (values.modifier1) {
    sidcArr[16] = values.modifier1[0] || sidcArr[16]
    sidcArr[17] = values.modifier1[1] || sidcArr[17]
  } else {
    // Clear modifier1 if not set
    sidcArr[16] = '0'
    sidcArr[17] = '0'
  }
  if (values.modifier2) {
    sidcArr[18] = values.modifier2[0] || sidcArr[18]
    sidcArr[19] = values.modifier2[1] || sidcArr[19]
  } else {
    // Clear modifier2 if not set
    sidcArr[18] = '0'
    sidcArr[19] = '0'
  }

  return sidcArr.join('')
}
