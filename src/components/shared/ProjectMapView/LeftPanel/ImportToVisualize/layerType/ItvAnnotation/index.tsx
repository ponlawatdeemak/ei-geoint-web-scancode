'use client'

import AnnotationSymbol from './symbol'
import AnnotationForm from './form'
import { AnnotationItem, App6eMainIcon, App6eSymbolSet, ItvFeatureProperties, ItvLayer } from '@interfaces/entities'
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ms from 'milsymbol'
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import InputLabel from '@/components/common/input/InputLabel'
import { t } from 'i18next'
import ItemsList from './items'
import { ItvMode } from '@/components/shared/ProjectMapView/utils/importToVisualize'
import { CreateItvLayerDtoIn, UpdateItvLayerDtoIn } from '@interfaces/dto/import-to-visualize'
import { ItvLayerType } from '@interfaces/config/app.config'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import importToVisualize from '@/api/import-to-visualize'
import useMapStore from '@/components/common/map/store/map'
import { layerIdConfig } from '@/components/common/map/config/map'
import { app6eData } from './data/app6e'

import ItvDialog from '../../../ItvDialog'
import { cropCanvasImage } from '@/utils/crop-image'

export interface SelectedSymbol {
  sidc: string
  icon: App6eMainIcon
  symbolSet: App6eSymbolSet
}

export enum AnnotationMode {
  list = 'list',
  draw = 'draw',
}

type FeatureWithGeometry = ItvFeatureProperties & {
  geometry?: {
    type?: string
    coordinates?: [number, number]
  }
}

interface Props {
  mapId: string
  projectId: string
  onClose: () => void
  onSaveComplete?: (value?: ItvLayer) => void
  itvMode: ItvMode | null
  layerInfo?: ItvLayer
  setLayerInfo: Dispatch<SetStateAction<ItvLayer | undefined>>
  editingLayerName: boolean
  setEditingLayerName: (v: boolean) => void
  setForceHideBackButtonRow?: (v: boolean) => void
  onToggleLayer: (id: string, isVisible: boolean) => void
}

const ItvAnnotation: FC<Props> = ({
  mapId,
  projectId,
  onClose,
  onSaveComplete,
  itvMode,
  layerInfo,
  setLayerInfo,
  editingLayerName,
  setEditingLayerName,
  setForceHideBackButtonRow,
  onToggleLayer,
}) => {
  const { mapLibre } = useMapStore()
  const [selectedSymbol, setSelectedSymbol] = useState<SelectedSymbol | null>(null)
  const [editItem, setEditItem] = useState<AnnotationItem | null>(null)
  const [mode, setMode] = useState<AnnotationMode>(AnnotationMode.list)
  const [showDialog, setShowDialog] = useState(false)
  const [items, setItems] = useState<AnnotationItem[]>([])
  const { showAlert } = useGlobalUI()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const previousItemsRef = useRef<string>('')
  const sourceId = 'annotation-list-source'
  const layerId = 'annotation-list-layer'
  const map = useMemo(() => mapLibre[mapId], [mapLibre, mapId])

  useEffect(() => {
    if (layerInfo?.features) {
      // Transform features to AnnotationItem[], ensuring geometry is a GeometryPoint
      const features = (layerInfo.features as FeatureWithGeometry[])
        .map((feature) => {
          // Only include features with geometry of type 'Point'
          if (feature.geometry?.type === 'Point' && Array.isArray(feature.geometry.coordinates)) {
            return {
              ...feature,
              geometry: {
                type: 'Point',
                coordinates: feature.geometry.coordinates as [number, number],
              },
            }
          }
          // Optionally, skip or handle non-Point geometries
          return null
        })
        .filter(Boolean) as AnnotationItem[]
      setItems(features)
    }
  }, [layerInfo])

  const ensureAnnotationLayer = useCallback(() => {
    if (!map) return

    // source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })
    }

    // layer
    if (!map.getLayer(layerId)) {
      map.addLayer(
        {
          id: layerId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'icon-image': ['get', 'symbolImageName'],
            'icon-size': 1,
            'icon-anchor': 'center',
            'icon-allow-overlap': true,
          },
        },
        layerIdConfig.basicTools,
      )
    }
  }, [map])

  useEffect(() => {
    if (!map) return

    // initial
    if (map.isStyleLoaded()) {
      ensureAnnotationLayer()
    }

    const handlerId = 'itv-annotation-handler'
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler

    const handler = (m: maplibregl.Map) => {
      ensureAnnotationLayer()

      const source = m.getSource(sourceId) as maplibregl.GeoJSONSource
      if (source && items.length > 0) {
        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: items.map((item) => ({
            type: 'Feature',
            geometry: item.geometry,
            properties: {
              id: item.id,
              sidc: item.sidc,
              symbolImageName: `annotation-symbol-${item.id}`,
            },
          })),
        }
        source.setData(geojson)
        previousItemsRef.current = ''
      }
    }

    register(map, handlerId, handler)

    return () => {
      unregister(map, handlerId)
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
  }, [map, ensureAnnotationLayer, items])

  // Separate effect to cleanup images when items change
  useEffect(() => {
    if (!map) return

    return () => {
      // Remove symbol images for old items
      items.forEach((item) => {
        const imageId = `annotation-symbol-${item.id}`
        if (map.hasImage(imageId)) {
          map.removeImage(imageId)
        }
      })
    }
  }, [map, items])

  useEffect(() => {
    if (!map) return

    let source = map.getSource(sourceId) as maplibregl.GeoJSONSource

    // Check if items actually changed by comparing serialized version
    const currentItemsKey = JSON.stringify(
      items.map((i) => ({ id: i.id, sidc: i.sidc, symbolSet: i.annotationSymbol?.symbolSet })),
    )

    if (!source) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })
      source = map.getSource(sourceId) as maplibregl.GeoJSONSource
    }

    if (items.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] })
      previousItemsRef.current = ''
      return
    }

    previousItemsRef.current = currentItemsKey

    // Create symbol images for each item
    let loadedCount = 0
    const totalItems = items.length

    const updateSource = () => {
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: items.map((item) => ({
          type: 'Feature',
          geometry: item.geometry,
          properties: {
            id: item.id,
            sidc: item.sidc,
            symbolImageName: `annotation-symbol-${item.id}`,
          },
        })),
      }
      source.setData(geojson)
    }

    items.forEach((item) => {
      const imageId = `annotation-symbol-${item.id}`

      // Remove old image if exists
      if (map.hasImage(imageId)) {
        map.removeImage(imageId)
      }

      try {
        const symbolSize = item.annotationSymbol?.symbolSize || 40
        const cleanProperties = Object.fromEntries(
          Object.entries(item.annotationLabel || {}).map(([key, value]) => [key, value ?? undefined]),
        )
        const properties = { ...cleanProperties, size: symbolSize }
        const sym = new ms.Symbol(item.sidc, properties)
        const svgString = sym.asSVG()
        const { width, height } = sym.getSize()

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          loadedCount++
          if (loadedCount === totalItems) updateSource()
          return
        }

        const svg = new Blob([svgString], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(svg)
        const imgElement = new globalThis.Image(width, height)

        imgElement.onload = () => {
          ctx.drawImage(imgElement, 0, 0)
          URL.revokeObjectURL(url)

          // Crop left/right
          const croppedCanvas = cropCanvasImage(canvas, false)
          const croppedCtx = croppedCanvas.getContext('2d')
          if (croppedCtx) {
            const imageData = croppedCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height)
            map.addImage(imageId, imageData)
          }

          loadedCount++
          if (loadedCount === totalItems) {
            updateSource()
          }
        }

        imgElement.onerror = () => {
          console.error('Error loading symbol image for item:', item.id)
          URL.revokeObjectURL(url)
          loadedCount++
          if (loadedCount === totalItems) updateSource()
        }

        imgElement.src = url
      } catch (error) {
        console.error('Error processing symbol for item:', item.id, error)
        loadedCount++
        if (loadedCount === totalItems) updateSource()
      }
    })
  }, [items, map])

  useEffect(() => {
    setForceHideBackButtonRow?.(mode !== AnnotationMode.list)
  }, [mode, setForceHideBackButtonRow])

  // biome-ignore lint/correctness/useExhaustiveDependencies: fix infinite loop
  useEffect(() => {
    if (layerInfo?.id) {
      onToggleLayer(layerInfo.id, false)
    }

    // Show layer when component unmounts
    return () => {
      if (layerInfo?.id) {
        onToggleLayer(layerInfo.id, true)
      }
    }
  }, [layerInfo?.id])

  useEffect(() => {
    if (itvMode === ItvMode.Add || editingLayerName) {
      setShowDialog(true)
    } else {
      setShowDialog(false)
    }
  }, [itvMode, editingLayerName])

  // Handler for deleting an item by id
  const handleDeleteItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  const onSave = useCallback(() => {
    if (!layerInfo) return
    showAlert({
      status: 'confirm-save',
      showCancel: true,
      async onConfirm() {
        try {
          const param: UpdateItvLayerDtoIn = {
            projectId,
            id: layerInfo?.id,
            name: layerInfo.name,
            features: items,
          }
          await importToVisualize.updateLayer(param)
          setEditingLayerName(false)
          setLayerInfo({ ...layerInfo, features: items as unknown as ItvFeatureProperties[], name: layerInfo.name })

          showAlert({
            status: 'success',
            title: t('alert.saveSuccess'),
            onConfirm() {
              onClose()
            },
          })
        } catch (error: unknown) {
          showAlert({
            status: 'error',
            errorCode: error instanceof Error ? error.message : String(error),
          })
        }
      },
    })
  }, [layerInfo, showAlert, setLayerInfo, items, projectId, setEditingLayerName, layerInfo?.name, onClose])

  const handleSubmitAnnotation = useCallback(
    (data: AnnotationItem) => {
      if (editItem) {
        const updatedItem: AnnotationItem = {
          id: editItem.id,
          annotationLabel: data.annotationLabel,
          annotationSymbol: data.annotationSymbol,
          sidc: data.sidc,
          geometry: data.geometry ?? editItem.geometry,
        }

        setItems((prevItems) => {
          // Check if item exists in list
          const exists = prevItems.some((item) => item.id === editItem.id)
          if (exists) {
            // Update existing item
            return prevItems.map((item) => (item.id === editItem.id ? updatedItem : item))
          } else {
            // Add back if it was removed during edit
            return [...prevItems, updatedItem]
          }
        })
      } else {
        const properties: AnnotationItem = {
          id: data.id,
          annotationLabel: data.annotationLabel,
          annotationSymbol: data.annotationSymbol,
          sidc: data.sidc,
          geometry: data.geometry ?? { type: 'Point', coordinates: [0, 0] },
        }
        setItems((prevItems) => [...prevItems, properties])
      }

      setSelectedSymbol(null)
      setEditItem(null)
      setMode(AnnotationMode.list)
    },
    [editItem],
  )

  const onSaveLayerName = useCallback(
    async (values: { name: string }) => {
      if (itvMode === ItvMode.Add) {
        const param: CreateItvLayerDtoIn = {
          projectId,
          name: values.name,
          layerType: ItvLayerType.ANNOTATION,
        }
        const res = await importToVisualize.createLayer(param)
        onSaveComplete?.(res.data)
      } else {
        if (layerInfo?.id) {
          const param: UpdateItvLayerDtoIn = {
            projectId,
            id: layerInfo?.id,
            name: values.name,
          }
          await importToVisualize.updateLayer(param)
          setEditingLayerName(false)
          const newLayer = { ...layerInfo, name: values.name }
          setLayerInfo(newLayer)
        }
      }

      showAlert({ status: 'success', title: t('alert.saveSuccess') })
    },
    [showAlert, projectId, onSaveComplete, itvMode, layerInfo, setEditingLayerName, setLayerInfo],
  )

  const onCancelDialog = useCallback(() => {
    if (itvMode === ItvMode.Add) {
      onClose()
    } else {
      setEditingLayerName(false)
    }
  }, [itvMode, onClose, setEditingLayerName])

  const editValue = useMemo(() => {
    return {
      name: layerInfo?.name || '',
    }
  }, [layerInfo])

  const renderContent = () => {
    if (mode === AnnotationMode.list) {
      return (
        <div className='flex h-full w-full flex-col'>
          {/* Btn Control */}
          <div className='flex shrink-0 flex-col'>
            <div className='py-2 pl-0'>
              <Button
                component='label'
                variant='outlined'
                className='ml-1! border-transparent! px-1! py-0! text-[#0B76C8]!'
                size='large'
                startIcon={<AddCircleIcon />}
                onClick={() => setMode(AnnotationMode.draw)}
              >
                {t('itv.button.addDraw')}
              </Button>
            </div>
          </div>
          {/* Items */}
          <div className='flex-1 overflow-y-auto px-1 pb-4'>
            <ItemsList
              itemList={items}
              onItemClick={(item) => {
                if (map && item.geometry?.coordinates) {
                  map.flyTo({
                    center: item.geometry.coordinates as [number, number],
                    zoom: 16,
                    essential: true,
                  })
                }
              }}
              onDelete={handleDeleteItem}
              onEdit={(id) => {
                const targetItem = items.find((item) => item.id === id)
                if (!targetItem) return

                setItems((prevItems) => prevItems.filter((item) => item.id !== id))

                setEditItem(targetItem)
                const symbolSetCode = targetItem.annotationSymbol?.symbolSet || ''
                const symbolSet = (symbolSetCode && app6eData[symbolSetCode]) || undefined
                const fallbackSymbolSet: App6eSymbolSet =
                  symbolSet ||
                  ({
                    name: symbolSetCode || 'Unknown',
                    symbolset: symbolSetCode,
                    mainIcon: [],
                    modifier1: [],
                    modifier2: [],
                  } as App6eSymbolSet)

                const icon: App6eMainIcon =
                  targetItem.annotationSymbol?.icon ||
                  ({
                    code: '',
                    entity: '',
                    entityType: '',
                    entitySubtype: '',
                    name: '',
                  } as App6eMainIcon)

                setSelectedSymbol({
                  sidc: targetItem.sidc,
                  icon,
                  symbolSet: fallbackSymbolSet,
                })
                setMode(AnnotationMode.draw)
              }}
            />
          </div>

          {/* Buttons */}
          <div className='m-4 mt-0 mb-0 flex shrink-0 justify-center gap-4 border-(--color-gray-border) border-t p-0 pt-4 pb-2'>
            <Button
              className={`${isMobile ? 'flex-1' : ''}`}
              variant='outlined'
              startIcon={<CloseIcon />}
              onClick={onClose}
            >
              {t('button.cancel')}
            </Button>
            <Button
              variant='contained'
              color='primary'
              className={`${isMobile ? 'flex-1' : ''}`}
              startIcon={<SaveIcon />}
              onClick={onSave}
            >
              {t('button.save')}
            </Button>
          </div>
        </div>
      )
    }

    if (selectedSymbol) {
      return (
        <div className='flex-1 overflow-hidden'>
          <AnnotationForm
            initialData={selectedSymbol}
            editItem={editItem}
            mapId={mapId}
            onEditSymbol={() => {
              setEditItem(null)
              setSelectedSymbol(null)
            }}
            onCancel={(editItem) => {
              if (editItem) {
                const editItemTemp: AnnotationItem = { ...editItem }

                setItems((prev) => {
                  // Check if item already exists in list
                  const exists = prev.some((item) => item.id === editItemTemp.id)
                  if (exists) {
                    // If exists, update it
                    return prev.map((item) => (item.id === editItemTemp.id ? editItemTemp : item))
                  } else {
                    // If doesn't exist (was removed during edit), add it back
                    return [...prev, editItemTemp]
                  }
                })
              }

              setSelectedSymbol(null)
              setEditItem(null)
              setMode(AnnotationMode.list)
            }}
            onSubmit={handleSubmitAnnotation}
          />
        </div>
      )
    }

    return (
      <div className='flex-1 overflow-hidden'>
        <AnnotationSymbol
          onSelect={(data) => setSelectedSymbol(data)}
          onCancel={() => {
            setMode(AnnotationMode.list)
          }}
        />
      </div>
    )
  }

  return (
    <div className='flex h-full w-full flex-col'>
      {showDialog && (
        <ItvDialog
          projectId={projectId}
          onSave={onSaveLayerName}
          onCancel={onCancelDialog}
          mode={itvMode}
          layerType={ItvLayerType.ANNOTATION}
          values={editValue}
        />
      )}
      {ItvMode.Edit === itvMode && renderContent()}
    </div>
  )
}

export default ItvAnnotation
