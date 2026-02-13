'use client'

// React
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'

// Third-party libraries
import { useTranslation, I18nextProvider } from 'react-i18next'
import { AppBar, Button, Dialog, DialogProps, IconButton, Toolbar } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import FlipIcon from '@mui/icons-material/Flip'
import MultipleStopIcon from '@mui/icons-material/MultipleStop'
import maplibregl, { LngLatBoundsLike } from 'maplibre-gl'
import type { Geometry } from 'geojson'

// Components
import MapCompare from '@/components/map/MapCompare'
import SyncedMaps from '@/components/map/SyncedMaps'
import MapTooltip from '@/components/common/map/utils/Tooltip'

// Utilities
import createMapLibreLayersFromConfig from '@/components/shared/ProjectMapView/utils/maplibreLayerCreator'
import {
  buildDisplayModelName,
  extractConfidenceNum,
  extractCoordinatesFromObject,
  extractPropertiesFromObject,
} from '@/components/shared/ProjectMapView/utils/helpers'
import { zoomToGeometries, zoomToThaiExtent } from '@/utils/geometry'

// Types and Interfaces
import { MapType, type LayerConfig } from '@interfaces/config'
import type { GetModelAllDtoOut } from '@interfaces/index'

// Configuration and Theme
import { layerIdConfig } from '../common/map/config/map'
import theme from '@/styles/theme'
import i18nInstance from '@/i18n/i18next'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export type MapCompareDialogProps = DialogProps & {
  layerConfigs: LayerConfig[]
  layerVisibility: Record<string, boolean>
  modelAll?: GetModelAllDtoOut[]
  /**
   * Controlled mode. When provided, the dialog will reflect this mode.
   * 'ChangeDetection' renders MapCompare, 'Compare' renders SyncedMaps.
   */
  mode?: 'ChangeDetection' | 'Compare'
  /**
   * Uncontrolled default mode if `mode` is not provided.
   */
  defaultMode?: 'ChangeDetection' | 'Compare'
  /**
   * Called when the mode changes due to internal button click.
   */
  onModeChange?: (mode: 'ChangeDetection' | 'Compare') => void /**
   * Initial extent to zoom the map to on load
   */
  initialExtent?: LngLatBoundsLike | null
}

const MapCompareDialog: React.FC<MapCompareDialogProps> = ({
  layerConfigs,
  layerVisibility,
  modelAll,
  onClose,
  fullScreen = true,
  mode,
  defaultMode,
  onModeChange,
  open,
  initialExtent,
  ...dialogProps
}) => {
  const { t, i18n } = useTranslation('common')

  type Mode = 'ChangeDetection' | 'Compare'
  const [currentMode, setCurrentMode] = useState<Mode>((mode as Mode) ?? (defaultMode as Mode) ?? 'ChangeDetection')
  const activePopupRef = useRef<maplibregl.Popup | null>(null)
  const activePopupRootRef = useRef<Root | null>(null)

  // Sync when controlled `mode` prop changes
  useEffect(() => {
    if (mode !== undefined) {
      setCurrentMode(mode as Mode)
    }
  }, [mode])

  // When uncontrolled (no `mode` prop), reset to `defaultMode` whenever
  // the dialog is opened or the defaultMode changes. This ensures that
  // reopening the dialog reflects the latest intended default.
  useEffect(() => {
    if (mode === undefined && open) {
      setCurrentMode((defaultMode as Mode) ?? 'ChangeDetection')
    }
  }, [open, defaultMode, mode])

  const handleOnStyleData = useCallback((event: maplibregl.MapStyleDataEvent) => {
    // add reference layer for all deck.gl layer under this layer and display draw layer to top
    const map = event.target

    const refSource = map.getSource('custom-referer-source')
    if (!refSource) {
      map.addSource('custom-referer-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
    }
    const refLayer = map.getLayer(layerIdConfig.customReferer)
    if (!refLayer) {
      map.addLayer({
        id: layerIdConfig.customReferer,
        type: 'symbol',
        source: 'custom-referer-source',
        layout: { visibility: 'none' },
      })
    }
  }, [])

  const { leftTileConfig, rightTileConfig, vectorConfigs, geometries } = useMemo(() => {
    const leftTile = layerConfigs.find((cfg) => cfg.type === 'tile' && cfg.index === 1)
    const rightTile = layerConfigs.find((cfg) => cfg.type === 'tile' && cfg.index === 2)
    const vectors = layerConfigs.filter((cfg) => cfg.type === 'vector')
    const geoms = layerConfigs
      .map((cfg) => (cfg as LayerConfig & { geometry?: Geometry }).geometry)
      .filter(Boolean) as Geometry[]
    return { leftTileConfig: leftTile, rightTileConfig: rightTile, vectorConfigs: vectors, geometries: geoms }
  }, [layerConfigs])

  const applyInitialZoom = useCallback(
    (map: maplibregl.Map) => {
      const extentToUse = initialExtent ?? null
      if (extentToUse) {
        map.fitBounds(extentToUse, { padding: 20, animate: false })
        return
      }

      const zoomResult = zoomToGeometries(geometries, map)
      if (!zoomResult.success) {
        zoomToThaiExtent(map)
      }
    },
    [initialExtent, geometries],
  )

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

  const renderPopup = useCallback(
    (coord: [number, number], data: Record<string, unknown>, map: maplibregl.Map) => {
      const node = document.createElement('div')
      node.style.minWidth = '240px'

      const displayModelName = buildDisplayModelName(data, modelAll, i18n.language)
      const confidenceNum = extractConfidenceNum(data)
      const areaValue = (data.area as number) ?? 0

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
    [modelAll, i18n.language],
  )

  const handleFeatureClick = useCallback(
    (lngLat: [number, number] | undefined, object: Record<string, unknown> | null, map: maplibregl.Map) => {
      if (object?.type === MapType.vector) {
        closeActivePopup()

        if (!map) return

        let coord = lngLat
        if (coord?.length !== 2) coord = extractCoordinatesFromObject(object)
        if (coord?.length !== 2) return

        try {
          const data = extractPropertiesFromObject(object)
          // autoOpenGroupPanel(data)
          renderPopup(coord, data, map)
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to show popup', e)
        }
      }
    },
    [closeActivePopup, renderPopup],
  )

  const handleOnLeftMapLoad = useCallback(
    (map: maplibregl.Map) => {
      if (leftTileConfig) {
        createMapLibreLayersFromConfig(leftTileConfig, { map, layerVisibility })
      }
      for (const cfg of vectorConfigs) {
        createMapLibreLayersFromConfig(cfg, {
          map,
          layerVisibility,
          getClickInfo: (lngLat, object) => handleFeatureClick(lngLat, object, map),
        })
      }

      applyInitialZoom(map)
    },
    [leftTileConfig, vectorConfigs, applyInitialZoom, layerVisibility, handleFeatureClick],
  )

  const handleOnRightMapLoad = useCallback(
    (map: maplibregl.Map) => {
      if (rightTileConfig) {
        createMapLibreLayersFromConfig(rightTileConfig, { map, layerVisibility })
      }
      for (const cfg of vectorConfigs) {
        createMapLibreLayersFromConfig(cfg, {
          map,
          layerVisibility,
          getClickInfo: (lngLat, object) => handleFeatureClick(lngLat, object, map),
        })
      }

      applyInitialZoom(map)
    },
    [rightTileConfig, vectorConfigs, applyInitialZoom, layerVisibility, handleFeatureClick],
  )

  const googleMapStyle = useMemo<maplibregl.StyleSpecification>(
    () => ({
      version: 8,
      glyphs: '/maplibre-glyphs/{fontstack}/{range}.pbf',
      sources: {
        'google-2d': {
          type: 'raster',
          tiles: [`https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${GOOGLE_MAPS_API_KEY}`],
          tileSize: 256,
          attribution: '© Google',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'google-2d',
          type: 'raster',
          source: 'google-2d',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    }),
    [],
  )
  const handleModeChange = (m: Mode) => {
    if (mode === undefined) {
      // uncontrolled, update internal state
      setCurrentMode(m)
    }
    // notify parent in either controlled or uncontrolled modes
    onModeChange?.(m)
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} {...dialogProps}>
      <AppBar position='relative'>
        <Toolbar variant='dense'>
          <IconButton edge='start' color='inherit' onClick={(e) => onClose?.(e as unknown as object, 'escapeKeyDown')}>
            <CloseIcon />
          </IconButton>
          <div className='px-4'>{t('dialog.mapCompare.title')}</div>
        </Toolbar>
      </AppBar>
      <div className='flex gap-2 p-2'>
        <Button
          variant={currentMode === 'ChangeDetection' ? 'contained' : 'outlined'}
          className='border-(--color-gray-border)!'
          startIcon={<FlipIcon />}
          onClick={() => handleModeChange('ChangeDetection')}
        >
          {t('dialog.mapCompare.changeDetectionButton')}
        </Button>
        <Button
          variant={currentMode === 'Compare' ? 'contained' : 'outlined'}
          className='border-(--color-gray-border)!'
          startIcon={<MultipleStopIcon />}
          onClick={() => handleModeChange('Compare')}
        >
          {t('dialog.mapCompare.compareButton')}
        </Button>
      </div>
      <div className='flex h-full w-full'>
        {currentMode === 'ChangeDetection' ? (
          <MapCompare
            leftMapStyle={googleMapStyle}
            rightMapStyle={googleMapStyle}
            leftMapLabel={
              leftTileConfig ? `${(leftTileConfig as LayerConfig & { label?: string }).label ?? ''}` : undefined
            }
            rightMapLabel={
              rightTileConfig ? `${(rightTileConfig as LayerConfig & { label?: string }).label ?? ''}` : undefined
            }
            onLeftMapLoad={handleOnLeftMapLoad}
            onRightMapLoad={handleOnRightMapLoad}
            onLeftMapStyleData={handleOnStyleData}
            onRightMapStyleData={handleOnStyleData}
          />
        ) : (
          <SyncedMaps
            leftMapStyle={googleMapStyle}
            rightMapStyle={googleMapStyle}
            leftMapLabel={
              leftTileConfig ? `${(leftTileConfig as LayerConfig & { label?: string }).label ?? ''}` : undefined
            }
            rightMapLabel={
              rightTileConfig ? `${(rightTileConfig as LayerConfig & { label?: string }).label ?? ''}` : undefined
            }
            onLeftMapLoad={handleOnLeftMapLoad}
            onRightMapLoad={handleOnRightMapLoad}
            onLeftMapStyleData={handleOnStyleData}
            onRightMapStyleData={handleOnStyleData}
          />
        )}
      </div>
    </Dialog>
  )
}

export default MapCompareDialog
