import { useCallback, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import maplibregl, { LngLatLike } from 'maplibre-gl'
import { ThemeProvider } from '@mui/material/styles'
import { I18nextProvider } from 'react-i18next'
import theme from '@/styles/theme'
import i18nInstance from '@/i18n/i18next'
import MapTooltip from '@/components/common/map/utils/Tooltip'
import {
  buildDisplayModelName,
  extractConfidenceNum,
  extractCoordinatesFromObject,
  extractPropertiesFromObject,
} from '../utils/helpers'
import { MapType, ProjectMapViewGroup, ServiceConfig, TaskStatus, type GetModelAllDtoOut } from '@interfaces/index'
import PhotoPopup from '../LeftPanel/ImportToVisualize/PhotoPopup'
import { ItvFeatureProperties } from '@interfaces/entities'

export function useFeaturePopup(params: {
  mapLibre: Record<string, maplibregl.Map | null>
  mapId: string
  modelAll?: GetModelAllDtoOut[]
  language: string
  layerList: ProjectMapViewGroup[]
  isMobile: boolean
  setIsPanelOpen: (v: boolean) => void
  setSelectedGroup: (g: ProjectMapViewGroup | null) => void
}) {
  const { mapLibre, mapId, modelAll, language, layerList, isMobile, setIsPanelOpen, setSelectedGroup } = params

  const activePopupRef = useRef<maplibregl.Popup | null>(null)
  const activePopupRootRef = useRef<Root | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const closeActivePopup = useCallback(() => {
    try {
      if (activePopupRootRef.current && typeof activePopupRootRef.current.unmount === 'function') {
        activePopupRootRef.current.unmount()
      }
    } catch {
      /* ignore */
    }
    try {
      if (activePopupRef.current) activePopupRef.current.remove()
    } catch {
      /* ignore */
    }
    activePopupRef.current = null
    activePopupRootRef.current = null
  }, [])

  const autoOpenGroupPanel = useCallback(
    (data: Record<string, unknown>) => {
      const task = (data.task ?? {}) as Record<string, unknown> | undefined
      const taskId = task?.id ?? undefined
      const thaicomTaskId = task?.thaicomTaskId ?? undefined
      const foundGroup = (layerList ?? []).find(
        (g) => g.groupId === `${taskId}-${thaicomTaskId}` || String(g.taskId) === String(taskId ?? ''),
      )

      if (foundGroup) {
        if (foundGroup.serviceId === ServiceConfig.sar && foundGroup.statusId !== TaskStatus.completed) return
        setSelectedGroup(foundGroup)
        if (!isMobile) setIsPanelOpen(true)
      }
    },
    [layerList, isMobile, setIsPanelOpen, setSelectedGroup],
  )

  const renderPopup = useCallback(
    (coord: [number, number], data: Record<string, unknown>, map: maplibregl.Map) => {
      const node = document.createElement('div')
      node.style.minWidth = '240px'

      const displayModelName = buildDisplayModelName(data, modelAll, language)
      const confidenceNum = extractConfidenceNum(data)
      const areaValue = (data.area as number) ?? 0
      const sarDamageLevel = (data.damage_level as number) ?? null

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 40 })
        .setLngLat(coord)
        .setDOMContent(node)
        .addTo(map)

      const root = createRoot(node)

      const task = (data.task ?? {}) as Record<string, unknown> | undefined
      const hoverInfo = {
        x: 0,
        y: 0,
        modelName: displayModelName,
        taskName: typeof task?.name === 'string' ? task.name : '',
        confidence: confidenceNum,
        area: areaValue,
        damage_level: sarDamageLevel
      }

      root.render(
        <ThemeProvider theme={theme}>
          <I18nextProvider i18n={i18nInstance}>
            <MapTooltip
              hoverInfo={hoverInfo}
              onClose={() => {
                try {
                  popup.remove()
                } catch {
                  /* ignore */
                }
                try {
                  root.unmount()
                } catch {
                  /* ignore */
                }
                activePopupRef.current = null
                activePopupRootRef.current = null
              }}
            />
          </I18nextProvider>
        </ThemeProvider>,
      )

      activePopupRef.current = popup
      activePopupRootRef.current = root

      try {
        const popupAny = popup as unknown as { on?: (event: string, cb: () => void) => void }
        if (typeof popupAny.on === 'function') popupAny.on('close', () => root.unmount())
      } catch {
        /* ignore */
      }
    },
    [modelAll, language],
  )

  const handleVectorFeatureClick = useCallback(
    (lngLat: [number, number] | undefined, object: Record<string, unknown>, map: maplibregl.Map) => {
      closeActivePopup()

      let coord = lngLat
      if (coord?.length !== 2) coord = extractCoordinatesFromObject(object)
      if (coord?.length !== 2) return

      try {
        const data = extractPropertiesFromObject(object)
        autoOpenGroupPanel(data)
        renderPopup(coord, data, map)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to show popup', e)
      }
    },
    [closeActivePopup, autoOpenGroupPanel, renderPopup],
  )

  const handleItvPhotoFeatureClick = useCallback(
    (lngLat: [number, number] | undefined, object: Record<string, unknown>, map: maplibregl.Map) => {
      if (object.geometry) {
        object.geometry = JSON.parse(object.geometry as string)
      }
      if (object.childList) {
        object.childList = JSON.parse(object.childList as string)
      }

      if (popupRef.current) popupRef.current.remove()

      const popupContent = document.createElement('div')
      const root = createRoot(popupContent)

      const featureList = object.photoGroupId
        ? (object.childList as ItvFeatureProperties[])
        : [object as unknown as ItvFeatureProperties]
      root.render(<PhotoPopup featureList={featureList} />)

      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        maxWidth: '1200px',
      })
        .setLngLat(lngLat as LngLatLike)
        .setDOMContent(popupContent)
        .addTo(map)
    },
    [],
  )

  const handleFeatureClick = useCallback(
    (lngLat: [number, number] | undefined, object: Record<string, unknown> | null) => {
      if (!object) return

      const map = mapLibre[mapId]
      if (!map) return

      if (object.type === MapType.vector) {
        handleVectorFeatureClick(lngLat, object, map)
      } else if (object.type === MapType.itvPhoto) {
        handleItvPhotoFeatureClick(lngLat, object, map)
      }
    },
    [mapLibre, mapId, handleVectorFeatureClick, handleItvPhotoFeatureClick],
  )

  return { handleFeatureClick, closeActivePopup, popupRef }
}
