import { Box, useMediaQuery, useTheme } from '@mui/material'
import classNames from 'classnames'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PrintMapDialog from './PrintMapDialog'
import { exportPdf } from '@/utils/export-pdf'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'

import { LngLatBoundsLike } from 'maplibre-gl'
import useMapStore from '@/components/common/map/store/map'

import { captureMapWithControl } from '@/utils/capture'
import { thaiExtent } from '@/components/common/map/config/map'
import { fromDecimalDegree } from '@/utils/coordinate'
import { useSettings } from '@/hook/useSettings'

export interface GridType {
  key: string
  percent: number
  value: string
  exportValue?: string
}

export interface EndBoundsType {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

export const MAP_EXPORT = 'map-export'
export const MINI_MAP_EXPORT = 'mini-map-export'

export const LONGITUDE_OFFSET = 0.5
export const LATITUDE_OFFSET = 0.25

const GRID_COLS = 4
const GRID_ROWS = 3

const MAP_WIDTH = 688
const MAP_HEIGHT = 423
const MINI_MAP_WIDTH = 215
const MINI_MAP_HEIGHT = 287

interface PrintMapExportMainProps {
  className?: string
  id: string
  printDetails?: {
    displayDialogTitle?: string | null
    organization?: {
      th: string
      en: string
    } | null
  } | null
  defaultMapEndBounds: EndBoundsType
  defaultMiniMapExtent: LngLatBoundsLike | null
  mapGeometry: LngLatBoundsLike | null
  loading?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  sourceMapId?: string
}

const PrintMapExportMain: React.FC<PrintMapExportMainProps> = ({
  className = '',
  id,
  printDetails,
  defaultMapEndBounds,
  defaultMiniMapExtent,
  mapGeometry,
  loading,
  isOpen,
  onOpenChange,
  sourceMapId,
}) => {
  const { mapLibre } = useMapStore()
  const { showLoading, hideLoading } = useGlobalUI()
  const { copyLocationType } = useSettings()

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [openPrintMapDialog, setOpenPrintMapDialog] = useState<boolean>(isOpen ?? false)

  const [mapEndBounds, setMapEndBounds] = useState<EndBoundsType>(defaultMapEndBounds)
  const [isCapturing, setIsCapturing] = useState<boolean>(false)
  const hasFitBoundsRef = useRef(false)

  // Sync external isOpen state with internal state
  useEffect(() => {
    if (isOpen !== undefined) {
      setOpenPrintMapDialog(isOpen)
    }
  }, [isOpen])

  // Notify parent when dialog state changes
  const handleDialogClose = useCallback(() => {
    setOpenPrintMapDialog(false)
    onOpenChange?.(false)
  }, [onOpenChange])

  // const [mapDetail, setMapDetail] = useState<BurntMapDetailType | PlantMapDetailType | null>(null)

  const mapExport = useMemo(() => mapLibre[`${id}-${MAP_EXPORT}`], [id, mapLibre])
  const miniMapExport = useMemo(() => mapLibre[`${id}-${MINI_MAP_EXPORT}`], [id, mapLibre])

  // map event
  useEffect(() => {
    if (!mapExport) return

    const handleMoveEnd = () => {
      const bound = mapExport.getBounds()

      if (!miniMapExport) return

      miniMapExport.fitBounds(bound, { padding: 90, duration: 800 }).once('moveend', () => {})

      setMapEndBounds({
        xmin: bound.getWest(),
        xmax: bound.getEast(),
        ymin: bound.getSouth(),
        ymax: bound.getNorth(),
      })
    }

    mapExport.on('moveend', handleMoveEnd)

    return () => {
      mapExport.off('moveend', handleMoveEnd)
    }
  }, [mapExport, miniMapExport])

  useEffect(() => {
    // Add bbox polygon to mini map
    const bboxSourceId = 'mini-map-bbox-source'
    const bboxLayerId = 'mini-map-bbox-layer'

    if (!miniMapExport) return

    const bboxGeoJson: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [mapEndBounds.xmin, mapEndBounds.ymax],
            [mapEndBounds.xmax, mapEndBounds.ymax],
            [mapEndBounds.xmax, mapEndBounds.ymin],
            [mapEndBounds.xmin, mapEndBounds.ymin],
            [mapEndBounds.xmin, mapEndBounds.ymax],
          ],
        ],
      },
    }

    if (miniMapExport.getSource(bboxSourceId)) {
      ;(miniMapExport.getSource(bboxSourceId) as maplibregl.GeoJSONSource).setData(bboxGeoJson)
    } else {
      miniMapExport.addSource(bboxSourceId, {
        type: 'geojson',
        data: bboxGeoJson,
      })
      miniMapExport.addLayer({
        id: bboxLayerId,
        type: 'line',
        source: bboxSourceId,
        layout: {},
        paint: {
          'line-color': '#ffcc00',
          'line-width': 2,
        },
      })
    }

    return () => {
      // Cleanup bbox layer from mini map when unmounting or changing
      if (miniMapExport?.style && miniMapExport.getLayer(bboxLayerId)) {
        miniMapExport?.removeLayer(bboxLayerId)
        miniMapExport?.removeSource(bboxSourceId)
      }
    }
  }, [miniMapExport, mapEndBounds])

  // initial map zoom
  // fit to provided bounds once per dialog open
  useEffect(() => {
    if (!mapExport || !openPrintMapDialog || hasFitBoundsRef.current) return
    if (mapGeometry) {
      mapExport.fitBounds(mapGeometry, { padding: 0 })
      hasFitBoundsRef.current = true
    }
  }, [mapExport, mapGeometry, openPrintMapDialog])

  // reset flag when dialog closes
  useEffect(() => {
    if (!openPrintMapDialog) {
      hasFitBoundsRef.current = false
    }
  }, [openPrintMapDialog])

  // initial mini map zoom
  useEffect(() => {
    if (miniMapExport) {
      if (defaultMiniMapExtent) {
        miniMapExport.fitBounds(defaultMiniMapExtent, { padding: 0 })
      } else {
        miniMapExport.fitBounds(thaiExtent, { padding: 0 })
      }
    }
  }, [miniMapExport, defaultMiniMapExtent])

  const gridColsArray: GridType[] = useMemo(
    () =>
      Array.from({ length: GRID_COLS - 1 }).map((_, index) => {
        const gap = mapEndBounds.xmax - mapEndBounds.xmin
        const lng = mapEndBounds.xmin + ((index + 1) / GRID_COLS) * gap
        const type = (copyLocationType as any) || 'DD'

        let label = ''
        let exportLabel = ''
        const coordString = fromDecimalDegree(lng, mapEndBounds.ymin, type)
        if (type === 'DD') {
          label = lng.toFixed(4)
          exportLabel = coordString.split(',')[1]?.trim() || ''
        } else if (type === 'MGRS') {
          label = coordString
          exportLabel = coordString
        } else {
          // UTM returns "easting, northing" -> take easting with no decimals
          label = coordString.split(',')[0]?.trim().split('.')[0] || ''
          exportLabel = coordString.split(',')[0]?.trim() || ''
        }

        return {
          key: `col${index}`,
          percent: ((index + 1) / GRID_COLS) * 100,
          value: isMobile ? label || lng.toFixed(4) : exportLabel || lng.toFixed(5),
          exportValue: exportLabel || lng.toFixed(5),
        }
      }),
    [mapEndBounds.xmax, mapEndBounds.xmin, mapEndBounds.ymin, copyLocationType, isMobile],
  )

  const gridRowsArray: GridType[] = useMemo(
    () =>
      Array.from({ length: GRID_ROWS - 1 }).map((_, index) => {
        const gap = mapEndBounds.ymax - mapEndBounds.ymin
        const lat = mapEndBounds.ymin + ((index + 1) / GRID_ROWS) * gap
        const type = (copyLocationType as any) || 'DD'

        let label = ''
        let exportLabel = ''
        const coordString = fromDecimalDegree(mapEndBounds.xmin, lat, type)
        if (type === 'DD') {
          label = lat.toFixed(4)
          exportLabel = coordString.split(',')[0]?.trim() || ''
        } else if (type === 'MGRS') {
          label = coordString
          exportLabel = coordString
        } else {
          // UTM returns "easting, northing" -> take northing with no decimals
          label = coordString.split(',')[1]?.trim().split('.')[0] || ''
          exportLabel = coordString.split(',')[1]?.trim() || ''
        }

        return {
          key: `row${index}`,
          percent: ((index + 1) / GRID_ROWS) * 100,
          value: isMobile ? label || lat.toFixed(4) : exportLabel || lat.toFixed(5),
          exportValue: exportLabel || lat.toFixed(5),
        }
      }),
    [mapEndBounds.ymax, mapEndBounds.ymin, mapEndBounds.xmin, copyLocationType, isMobile],
  )

  const handleMapPdfExport = useCallback(async () => {
    try {
      showLoading()
      setIsCapturing(true)

      const style = document.createElement('style')
      document.head.appendChild(style)
      style.sheet?.insertRule('body > div:last-child img { display: inline-block; }')

      const mapElement = document.getElementById(`${id}-map-export-container`)
      const miniMapElement = document.getElementById(`${id}-mini-map-export-container`)
      if (!mapElement || !miniMapElement) {
        console.error('Map export container not found!')
        return
      }

      const mapControlElement = mapElement.querySelector('.maplibregl-ctrl-bottom-right') as HTMLElement
      const miniMapControlElement = miniMapElement.querySelector('.maplibregl-ctrl-bottom-right') as HTMLElement

      if (mapExport && miniMapExport && mapControlElement && miniMapControlElement) {
        // Use MapLibre's canvas directly instead of html2canvas
        const mapImage = mapExport.getCanvas().toDataURL('image/png')
        const miniMapImage = miniMapExport.getCanvas().toDataURL('image/png')

        const mapCapturedImage = await captureMapWithControl(mapImage, '', MAP_WIDTH, MAP_HEIGHT)
        const miniMapCapturedImage = await captureMapWithControl(miniMapImage, '', MINI_MAP_WIDTH, MINI_MAP_HEIGHT)

        const capturedMapElement = document.querySelector('.captured-map-image') as HTMLImageElement
        const capturedMiniMapElement = document.querySelector('.captured-mini-map-image') as HTMLImageElement

        if (capturedMapElement && capturedMiniMapElement) {
          capturedMapElement.src = mapCapturedImage
          capturedMiniMapElement.src = miniMapCapturedImage
          await new Promise((resolve) => setTimeout(resolve, 100))
        } else {
          console.error('Image element not found!')
        }

        const dialogDiv: HTMLDivElement | null = document.querySelector('.hidden-dialog .MuiDialog-paper')

        if (dialogDiv) {
          await exportPdf({ dialogDiv: dialogDiv, fileName: `${id}_map` })
        }
      } else {
        console.error('Map is not loaded yet!')
      }
    } catch (error) {
      console.error('Error capturing map:', error)
    } finally {
      setIsCapturing(false)
      hideLoading()
    }
  }, [id, mapExport, miniMapExport, showLoading, hideLoading])

  return (
    <Box className={classNames('absolute right-4 z-10 flex md:right-20 [&_button]:bg-white', className)}>
      <PrintMapDialog
        id={id}
        printDetails={printDetails}
        open={openPrintMapDialog}
        gridColsArray={gridColsArray}
        gridRowsArray={gridRowsArray}
        loading={loading}
        disabled={isCapturing}
        handleMapPdfExport={handleMapPdfExport}
        onClose={handleDialogClose}
        sourceMapId={sourceMapId}
      />
    </Box>
  )
}

export default PrintMapExportMain
