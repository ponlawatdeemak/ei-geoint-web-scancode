import { Dispatch, FC, SetStateAction, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import { Point, LineString, Polygon } from 'geojson'
import { nanoid } from 'nanoid'
import { useTranslation } from 'react-i18next'

import importToVisualize from '@/api/import-to-visualize'
import { layerIdConfig } from '@/components/common/map/config/map'
import { useMapStore } from '@/components/common/map/store/map'
import { ItvMode } from '@/components/shared/ProjectMapView/utils/importToVisualize'
import { rgbaArrayToCss } from '@/components/shared/ProjectMapView/utils/utils'
import { useProfileStore } from '@/hook/useProfileStore'
import { ItvDrawType, ItvLayerType } from '@interfaces/config'
import { DefaultAoiColor } from '@interfaces/config/color.config'
import { CreateItvLayerDtoIn, UpdateItvLayerDtoIn } from '@interfaces/dto/import-to-visualize'
import { ItvLayer } from '@interfaces/entities'
import { Roles } from '@interfaces/index'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { hexToRGBAArray } from '@/utils/color'

import ItvDialog from '../../../ItvDialog'
import DrawForm from './DrawForm'
import DrawList from './DrawList'
import { itvDrawConfig, ItvDrawFeature } from './itv-draw'

interface Props {
  projectId: string
  mapId: string
  onClose: () => void
  onSaveComplete?: (value?: ItvLayer) => void
  itvMode: ItvMode | null
  layerInfo?: ItvLayer
  setLayerInfo: Dispatch<SetStateAction<ItvLayer | undefined>>
  editingLayerName: boolean
  setEditingLayerName: (v: boolean) => void
  onToggleLayer: (id: string, isVisible: boolean) => void
}

const ItvDraw: FC<Props> = ({
  projectId,
  mapId,
  onClose,
  onSaveComplete,
  itvMode,
  layerInfo,
  setLayerInfo,
  editingLayerName,
  setEditingLayerName,
  onToggleLayer,
}) => {
  const { showAlert } = useGlobalUI()
  const { t } = useTranslation('common')

  const profile = useProfileStore((state) => state.profile)

  const [showDialog, setShowDialog] = useState(false)
  const [showForm, setShowForm] = useState(true)

  const [openDrawMenu, setOpenDrawMenu] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const addMenuBtnId = useId()
  const menuId = useId()

  const [drawType, setDrawType] = useState<ItvDrawType | null>(null)
  const { mapLibre } = useMapStore()
  const sourceId = 'draw-list-source'
  const pointLayerId = 'draw-list-point'
  const lineLayerId = 'draw-list-line'
  const polygonLayerId = 'draw-list-polygon'
  const polygonOutlineLayerId = 'draw-list-polygon-outline'
  const textLayerId = 'draw-list-text'
  const map = useMemo(() => mapLibre[mapId], [mapLibre, mapId])

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

  const ensureDrawLayer = useCallback(() => {
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

    // Default colors
    const fillColorArr = hexToRGBAArray(DefaultAoiColor, true)
    const strokeColorArr = hexToRGBAArray(DefaultAoiColor)
    const fillColor = rgbaArrayToCss(fillColorArr, `rgba(${DefaultAoiColor}aa)`)
    const strokeColor = rgbaArrayToCss(strokeColorArr, `rgba(${DefaultAoiColor}ff)`)

    // Point layer
    if (!map.getLayer(pointLayerId)) {
      map.addLayer(
        {
          id: pointLayerId,
          type: 'circle',
          source: sourceId,
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
    }

    // Line layer
    if (!map.getLayer(lineLayerId)) {
      map.addLayer(
        {
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {
            'line-color': ['coalesce', ['get', 'drawBorderColor'], strokeColor],
            'line-width': ['coalesce', ['get', 'drawBorderSize'], 2],
          },
        },
        layerIdConfig.basicTools,
      )
    }

    // Polygon fill layer
    if (!map.getLayer(polygonLayerId)) {
      map.addLayer(
        {
          id: polygonLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
          paint: {
            'fill-color': ['coalesce', ['get', 'drawFillColor'], fillColor],
            'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.6],
          },
        },
        layerIdConfig.basicTools,
      )
    }

    // Polygon outline layer
    if (!map.getLayer(polygonOutlineLayerId)) {
      map.addLayer(
        {
          id: polygonOutlineLayerId,
          type: 'line',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'line-color': ['coalesce', ['get', 'drawBorderColor'], strokeColor],
            'line-width': ['coalesce', ['get', 'drawBorderSize'], 2],
          },
        },
        layerIdConfig.basicTools,
      )
    }

    // Text layer
    if (!map.getLayer(textLayerId)) {
      map.addLayer(
        {
          id: textLayerId,
          type: 'symbol',
          source: sourceId,
          filter: ['==', ['get', 'drawType'], ItvDrawType.TEXT],
          layout: {
            'text-field': ['coalesce', ['get', 'drawText'], ''],
            'text-font': ['Noto Sans Regular'],
            'text-size': ['coalesce', ['get', 'drawSize'], 12],
            'text-letter-spacing': 0,
            'text-offset': [0, -1.2],
            'text-anchor': 'top',
            'text-allow-overlap': false,
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
  }, [map])

  useEffect(() => {
    if (!map) return

    // initial
    if (map.isStyleLoaded()) {
      ensureDrawLayer()
    }

    const handlerId = 'itv-draw-handler'
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler

    const handler = (m: maplibregl.Map) => {
      ensureDrawLayer()

      const source = m.getSource(sourceId) as maplibregl.GeoJSONSource
      const items = layerInfo?.features || []
      if (source && items.length > 0) {
        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: items.map((item) => ({
            type: 'Feature',
            geometry: item.geometry,
            properties: {
              id: item.id,
              drawType: item.drawType,
              drawSize: item.drawSize,
              drawBorderSize: item.drawBorderSize,
              drawBorderColor: item.drawBorderColor,
              drawFillColor: item.drawFillColor,
              drawPolygonType: item.drawPolygonType,
              drawDegree: item.drawDegree,
              drawText: item.drawText,
              drawTextColor: item.drawTextColor,
              drawTextHaloColor: item.drawTextHaloColor,
              drawTextHaloSize: item.drawTextHaloSize,
              fillOpacity: 0.6,
            },
          })),
        }
        source.setData(geojson)
      }
    }

    register(map, handlerId, handler)

    return () => {
      unregister(map, handlerId)
      if (map.getLayer(textLayerId)) map.removeLayer(textLayerId)
      if (map.getLayer(polygonOutlineLayerId)) map.removeLayer(polygonOutlineLayerId)
      if (map.getLayer(polygonLayerId)) map.removeLayer(polygonLayerId)
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId)
      if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
  }, [map, ensureDrawLayer, layerInfo?.features])

  useEffect(() => {
    if (!map) return

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource
    if (!source) return

    const items = layerInfo?.features || []

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: items.map((item) => ({
        type: 'Feature',
        geometry: item.geometry,
        properties: {
          id: item.id,
          drawType: item.drawType,
          drawSize: item.drawSize,
          drawBorderSize: item.drawBorderSize,
          drawBorderColor: item.drawBorderColor,
          drawFillColor: item.drawFillColor,
          drawPolygonType: item.drawPolygonType,
          drawDegree: item.drawDegree,
          drawText: item.drawText,
          drawTextColor: item.drawTextColor,
          drawTextHaloColor: item.drawTextHaloColor,
          drawTextHaloSize: item.drawTextHaloSize,
          fillOpacity: 0.6,
        },
      })),
    }

    source.setData(geojson)
  }, [map, layerInfo?.features])

  useEffect(() => {
    if (itvMode === ItvMode.Add || editingLayerName) {
      setShowDialog(true)
    } else {
      setShowDialog(false)
    }
  }, [itvMode, editingLayerName])

  useEffect(() => {
    if (itvMode === ItvMode.Add) {
      setShowForm(false)
    } else {
      setShowForm(true)
    }
  }, [itvMode])

  const onSaveLayerName = useCallback(
    async (values: { name: string }) => {
      if (itvMode === ItvMode.Add) {
        const param: CreateItvLayerDtoIn = {
          projectId,
          name: values.name,
          layerType: ItvLayerType.DRAW,
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
    [showAlert, projectId, onSaveComplete, t, itvMode, layerInfo, setEditingLayerName, setLayerInfo],
  )

  const editValue = useMemo(() => {
    return {
      name: layerInfo?.name || '',
    }
  }, [layerInfo])

  const onCancelDialog = useCallback(() => {
    if (itvMode === ItvMode.Add) {
      onClose()
    } else {
      setEditingLayerName(false)
    }
  }, [itvMode, onClose, setEditingLayerName])

  const featureList = useMemo(() => {
    return layerInfo?.features || []
  }, [layerInfo])

  const onSave = useCallback(() => {
    if (!layerInfo) return
    showAlert({
      status: 'confirm-save',
      showCancel: true,
      async onConfirm() {
        const param: UpdateItvLayerDtoIn = {
          projectId: layerInfo.projectId,
          id: layerInfo.id,
          features: featureList,
          name: layerInfo.name,
        }
        try {
          await importToVisualize.updateLayer(param)
          const newLayer = { ...layerInfo, features: featureList }
          setLayerInfo(newLayer)
          setEditingLayerName(false)
          showAlert({
            status: 'success',
            title: t('alert.saveSuccess'),
            onConfirm() {
              onClose()
            },
          })
        } catch (error: any) {
          showAlert({
            status: 'error',
            errorCode: error?.message,
          })
        }
      },
    })
  }, [featureList, layerInfo, showAlert, setLayerInfo, t, onClose, setEditingLayerName])

  const handleClose = () => {
    setOpenDrawMenu(false)
  }

  const onMenuItemClick = (value: ItvDrawType) => {
    setDrawType(value)
    setOpenDrawMenu(false)
  }

  const onDelete = useCallback(
    (id: string) => {
      if (!layerInfo) return

      const newFeatures = layerInfo.features?.filter((item) => item.id !== id) || []
      const newLayer: ItvLayer = {
        ...layerInfo,
        features: newFeatures,
      } as ItvLayer
      setLayerInfo(newLayer)
    },
    [layerInfo, setLayerInfo],
  )

  return (
    <div className='flex h-full w-full flex-col'>
      {showDialog && (
        <ItvDialog
          projectId={projectId}
          onSave={onSaveLayerName}
          onCancel={onCancelDialog}
          mode={itvMode}
          layerType={ItvLayerType.DRAW}
          values={editValue}
        />
      )}

      {showForm && (
        <div className='flex h-full w-full flex-col'>
          {drawType === null ? (
            <div className='flex h-full w-full flex-col'>
              {/* Btn Control */}
              <div className='flex shrink-0 flex-col'>
                <div className='py-2 pt-0 pl-0'>
                  {profile?.roleId !== Roles.viewer && (
                    <Button
                      ref={anchorRef}
                      id={addMenuBtnId}
                      variant='outlined'
                      className='ml-1! border-transparent! px-1! py-0! text-[#0B76C8]!'
                      size='large'
                      startIcon={<AddCircleIcon />}
                      onClick={() => setOpenDrawMenu(true)}
                    >
                      {t('itv.button.addDraw')}
                    </Button>
                  )}
                  <Menu id={menuId} open={openDrawMenu} onClose={handleClose} anchorEl={anchorRef.current}>
                    {Object.values(itvDrawConfig).map((item) => (
                      <MenuItem key={item.value} className='h-10' onClick={() => onMenuItemClick(item.value)}>
                        <ListItemIcon className='text-(--color-text-icon)'>{item.icon}</ListItemIcon>
                        <ListItemText>{t(item.label)}</ListItemText>
                      </MenuItem>
                    ))}
                  </Menu>
                </div>
              </div>

              {/* Lists */}
              <div className='flex-1 overflow-y-auto px-1 pb-4'>
                {layerInfo && <DrawList mapId={mapId} features={featureList} onDelete={onDelete} />}
              </div>

              {/* Buttons */}
              <div className='m-4 mt-0 mb-0 flex shrink-0 justify-center gap-4 border-(--color-gray-border) border-t p-0 pt-4 pb-2'>
                <Divider />
                <div className={`flex w-full gap-4 md:w-auto`}>
                  <Button variant='outlined' className={`flex-1`} onClick={onClose} startIcon={<CloseIcon />}>
                    {t('button.cancel')}
                  </Button>
                  <Button
                    variant='contained'
                    color='primary'
                    className={`flex-1`}
                    onClick={onSave}
                    startIcon={<SaveIcon />}
                  >
                    {t('button.save')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <DrawForm
              mapId={mapId}
              drawType={drawType}
              setDrawType={setDrawType}
              onSubmit={(data) => {
                if (!layerInfo) return

                const newFeature: ItvDrawFeature = {
                  id: nanoid(),
                  drawType: drawType,
                  drawSize: data?.properties?.drawSize ? Number(data.properties.drawSize) : null,
                  drawBorderSize: data?.properties?.drawBorderSize ? Number(data.properties.drawBorderSize) : null,
                  drawBorderColor: (data?.properties?.drawBorderColor as string) || null,
                  drawFillColor: (data?.properties?.drawFillColor as string) || null,
                  drawPolygonType: (data?.properties?.drawPolygonType as string) || null,
                  drawDegree: data?.properties?.drawDegree ? Number(data.properties.drawDegree) : null,
                  drawText: (data?.properties?.drawText as string) || null,
                  drawTextColor: (data?.properties?.drawTextColor as string) || null,
                  drawTextHaloColor: (data?.properties?.drawTextHaloColor as string) || null,
                  drawTextHaloSize: data?.properties?.drawTextHaloSize
                    ? Number(data.properties.drawTextHaloSize)
                    : null,
                  geometry: data.geometry as Point | LineString | Polygon | null,
                }

                const newLayer: ItvLayer = {
                  ...layerInfo,
                  features: [...(layerInfo.features || []), newFeature],
                } as ItvLayer

                setLayerInfo(newLayer)
                setDrawType(null)
                setShowForm(true)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ItvDraw
