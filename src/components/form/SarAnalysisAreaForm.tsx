'use client'

import React, { useMemo, useState, useId, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useSettings } from '@/hook/useSettings'
import { useMapStore } from '@/components/common/map/store/map'
import {
  useMediaQuery,
  Button,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogActions,
} from '@mui/material'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import AddIcon from '@mui/icons-material/Add'
import BorderAllIcon from '@mui/icons-material/BorderAll'
import InboxIcon from '@mui/icons-material/Inbox'
import LocationPinIcon from '@mui/icons-material/LocationPin'
import * as turf from '@turf/turf'
import proj4 from 'proj4'
import { MapView } from '@/components/common/map/MapView'
import InputLabel from '@/components/common/input/InputLabel'
import { convertArea, convertLength } from '@/utils/convert'
import { LOCALE_STRING_OPTIONS } from '@/utils/formatNumber'
import { GetResultImageDtoOut } from '@interfaces/dto/tasks'
import { PolygonIcon, PolylineIcon } from '@/icons'
import useResponsive from '@/hook/responsive'
import * as mgrs from 'mgrs'
import { layerIdConfig } from '../common/map/config/map'
import { LngLatBoundsLike } from 'maplibre-gl'
import { nanoid } from 'nanoid'

const pinSvg = `<svg width="21" height="29" viewBox="0 0 21 29" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.333 0.5C15.769 0.5 20.1668 4.89702 20.167 10.333C20.167 12.7528 19.4703 15.0176 18.1973 17.0518L18.1963 17.0508C17.5474 18.1089 16.7997 19.0853 16.0674 20.0352C15.4214 20.8731 14.7893 21.6906 14.2227 22.5488L13.9834 22.9189C13.5277 23.6462 13.1731 24.3384 12.8164 25.0938L12.4551 25.874C12.3775 26.0447 12.3088 26.2331 12.2109 26.4756C12.1191 26.7031 12.0081 26.9591 11.8662 27.1973C11.5803 27.6771 11.1123 28.167 10.333 28.167C9.55417 28.1669 9.08691 27.6776 8.7998 27.1992C8.65735 26.9618 8.54552 26.706 8.45215 26.4795C8.35292 26.2388 8.28066 26.048 8.20117 25.8799L8.19629 25.8701C7.72064 24.7999 7.2786 23.8903 6.66992 22.9189L6.66895 22.918C6.04441 21.9161 5.32372 20.9823 4.58594 20.0254C3.85324 19.075 3.10328 18.1012 2.4541 17.0488V17.0479C1.1962 15.0152 0.5 12.752 0.5 10.333C0.500175 4.89712 4.89712 0.500175 10.333 0.5ZM10.333 7.83301C8.7693 7.83318 7.5 9.10324 7.5 10.667C7.50018 12.2306 8.76941 13.4998 10.333 13.5C11.8968 13.5 13.1668 12.2307 13.167 10.667C13.167 9.10313 11.8969 7.83301 10.333 7.83301Z" fill="#0B76C8" stroke="white"/></svg>`

const MAP_ID = 'sar-analysis-area-form-map'
const fitBoundsOptions = { padding: 40, duration: 1000 }

type Props = {
  imageBefore: GetResultImageDtoOut
  imageAfter: GetResultImageDtoOut
  viewOnly?: boolean
  loading?: boolean
  // Optional controlled features list. If provided, component acts controlled
  // and will call `onFeaturesChange` when it wants to update the list.
  features?: FeatureItem[]
  onFeaturesChange?: (items: FeatureItem[]) => void
}

type FeatureItem = {
  id: string
  geomType: 'Point' | 'LineString' | 'Polygon'
  coords: number[] | number[][]
  label: string
  metric?: number // length (meters) or area (sqm)
  // source information: one of 'aoiCoordinates'|'aoiGeometryCollections'|'aoiVectors'|'import'|'draw'|'extent'
  source?: string
  // original source payload (e.g. the aoiCoordinates / aoiVectors item)
  sourceData?: any
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FEATURES = 50
const MAX_AREA_SQM = 3_000_000 // 3 sq.km in square meters

// Helper id
const getId = () => nanoid()

const SarAnalysisAreaForm: React.FC<Props> = ({
  imageBefore,
  imageAfter,
  viewOnly,
  loading,
  features: featuresProp,
  onFeaturesChange,
}) => {
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const { areaUnit, lengthUnit } = useSettings()
  const { mapLibre } = useMapStore()
  const { isMd } = useResponsive()

  const map = useMemo(() => mapLibre[MAP_ID], [mapLibre])

  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Refs for basemap persistence
  const rasterSourcesRef = useRef<{ before?: string; after?: string }>({})
  const featuresDataRef = useRef<FeatureItem[]>([])
  const drawingStateRef = useRef<{
    points: [number, number][]
    mouseLngLat: [number, number] | null
  }>({
    points: [],
    mouseLngLat: null,
  })
  const pinImageRef = useRef<HTMLImageElement | null>(null)
  const pinImageLoadedRef = useRef<boolean>(false)

  const [tab, setTab] = useState<number>(0)
  const [showFormDialog, setShowFormDialog] = useState<boolean>(false)

  // Shared features across tabs. Support both controlled (props.features)
  // and uncontrolled (internal state) modes.
  const [featuresState, setFeaturesState] = useState<FeatureItem[]>(featuresProp ?? [])
  const isControlled = typeof featuresProp !== 'undefined'
  const features = isControlled ? (featuresProp as FeatureItem[]) : featuresState

  // Helper to update features consistently and notify parent when provided.
  const updateFeaturesInternal = useCallback(
    (updater: (prev: FeatureItem[]) => FeatureItem[]) => {
      if (isControlled) {
        const base = featuresProp ?? []
        const next = updater(base)
        // Avoid notifying parent if nothing meaningful changed (prevent re-render loops)
        const isEqual = (() => {
          if (base === next) return true
          if (base.length !== next.length) return false
          for (let i = 0; i < base.length; i++) {
            const a = base[i]
            const b = next[i]
            if (a === b) continue
            // fallback: compare ids and JSON representation
            if (a.id !== b.id) return false
            try {
              if (JSON.stringify(a) !== JSON.stringify(b)) return false
            } catch {
              return false
            }
          }
          return true
        })()
        if (!isEqual) {
          try {
            onFeaturesChange?.(next)
          } catch {}
        }
      } else {
        setFeaturesState((prev) => {
          const next = updater(prev)
          try {
            onFeaturesChange?.(next)
          } catch {}
          return next
        })
      }
    },
    [isControlled, featuresProp, onFeaturesChange],
  )

  // --- Extent (coordinates) state ---
  const [coordSystem, setCoordSystem] = useState<'GCS' | 'UTM47N' | 'UTM48N' | 'MGRS'>('GCS')
  const [xmin, setXmin] = useState('')
  const [xmax, setXmax] = useState('')
  const [ymin, setYmin] = useState('')
  const [ymax, setYmax] = useState('')
  const [mgrsMin, setMgrsMin] = useState('')
  const [mgrsMax, setMgrsMax] = useState('')

  // --- Draw state (map integration deferred) ---
  const [drawingMode, setDrawingMode] = useState<'none' | 'point' | 'polygon'>('none')
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([])
  const [mouseLngLat, setMouseLngLat] = useState<[number, number] | null>(null)
  const currentFeatureId = useRef<string | null>(null)

  const remainingSlots = useMemo(() => MAX_FEATURES - features.length, [features.length])

  // image layer visibility
  const [beforeVisible, setBeforeVisible] = useState<boolean>(true)
  const [afterVisible, setAfterVisible] = useState<boolean>(true)

  const IMAGE_BEFORE_SOURCE = 'sar-image-before-src'
  const IMAGE_BEFORE_LAYER = 'sar-image-before-layer'
  const IMAGE_AFTER_SOURCE = 'sar-image-after-src'
  const IMAGE_AFTER_LAYER = 'sar-image-after-layer'

  const showImportError = () =>
    showAlert({
      status: 'warning',
      title: t('form.taskForm.sarAnalysisAreaForm.cannotUploadFile'),
      content: t('form.taskForm.sarAnalysisAreaForm.cannotUploadFileInfo'),
    })

  const showNoRemainingSlotsError = () =>
    showAlert({
      status: 'warning',
      title: t('form.taskForm.sarAnalysisAreaForm.noRemainingSlots'),
      content: t('form.taskForm.sarAnalysisAreaForm.noRemainingSlotsInfo'),
    })

  // --- File parsing ---
  const handleFile = async (file?: File) => {
    if (!file) {
      try {
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch {}
      return
    }

    try {
      if (file.size > MAX_FILE_SIZE) {
        showImportError()
        return
      }
      const name = file.name.toLowerCase()
      if (name.endsWith('.geojson') || name.endsWith('.json')) {
        try {
          const text = await file.text()
          const json = JSON.parse(text)
          const { items, excludedByArea } = extractGeoJSONFeatures(json, 'import', { fileName: file.name })
          addExtractedFeatures(items, { excludedByArea })
        } catch {
          showImportError()
        }
        return
      }

      if (name.endsWith('.kml')) {
        try {
          const text = await file.text()
          const { items, excludedByArea } = parseKml(text, 'import', {
            fileName: file.name,
          })
          addExtractedFeatures(items, { excludedByArea })
        } catch {
          showImportError()
        }
        return
      }

      // KMZ (zipped KML)
      if (name.endsWith('.kmz')) {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const jszipMod = await import('jszip')
          const JSZip = jszipMod.default || jszipMod
          const zip = await JSZip.loadAsync(arrayBuffer)
          // find first .kml file
          const kmlName = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.kml'))
          if (!kmlName) {
            showImportError()
            return
          }
          const fileObj = zip.file(kmlName)
          if (!fileObj) {
            showImportError()
            return
          }
          const kmlText = await fileObj.async('string')
          const { items, excludedByArea } = parseKml(kmlText, 'import', {
            fileName: file.name,
          })
          addExtractedFeatures(items, { excludedByArea })
        } catch {
          showImportError()
        }
        return
      }

      // Shapefile ZIP (.zip)
      if (name.endsWith('.zip')) {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const shpjsMod = await import('shpjs')
          const shp = shpjsMod.default || shpjsMod
          // shpjs accepts ArrayBuffer and returns GeoJSON
          const geojson = await shp(arrayBuffer)
          const { items, excludedByArea } = extractGeoJSONFeatures(geojson, 'import', { fileName: file.name })
          addExtractedFeatures(items, { excludedByArea })
        } catch {
          showImportError()
        }
        return
      }
      showImportError()
    } finally {
      try {
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch {}
    }
  }

  const extractGeoJSONFeatures = (
    json: unknown,
    sourceType?: string,
    sourcePayload?: any,
  ): { items: FeatureItem[]; excludedByArea: number } => {
    const list: FeatureItem[] = []
    let excludedByArea = 0
    const geoms: unknown[] = []
    const j = json as any
    if (j?.type === 'FeatureCollection' && Array.isArray(j.features)) {
      for (const f of j.features) {
        geoms.push(f.geometry)
      }
    } else if (j?.type === 'Feature' && j.geometry) {
      geoms.push(j.geometry)
    } else if (j?.type && j.coordinates) {
      geoms.push(j)
    }

    for (const g of geoms) {
      if (!g || !(g as any).type) continue
      // Only accept Point, LineString, Polygon
      const gg = g as any
      if (gg.type === 'Point') {
        const c = gg.coordinates as number[]
        list.push({
          id: getId(),
          geomType: 'Point',
          coords: c,
          label: `${c[1].toFixed(6)}, ${c[0].toFixed(6)}`,
          source: sourceType,
          sourceData: sourcePayload,
        })
      } else if (gg.type === 'LineString') {
        const len = turf.length(turf.lineString(gg.coordinates), {
          units: 'meters',
        })
        list.push({
          id: getId(),
          geomType: 'LineString',
          coords: gg.coordinates,
          label: `${convertLength(len, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`,
          metric: len,
          source: sourceType,
          sourceData: sourcePayload,
        })
      } else if (gg.type === 'Polygon') {
        const area = turf.area(turf.polygon(gg.coordinates))
        if (area > MAX_AREA_SQM) {
          excludedByArea += 1
        } else {
          list.push({
            id: getId(),
            geomType: 'Polygon',
            coords: gg.coordinates[0],
            label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
            metric: area,
            source: sourceType,
            sourceData: sourcePayload,
          })
        }
      }
      if (list.length >= remainingSlots) break
    }
    return { items: list, excludedByArea }
  }

  // Minimal KML parser for Point/LineString/Polygon coordinates
  const parseKml = (
    kmlText: string,
    sourceType?: string,
    sourcePayload?: any,
  ): { items: FeatureItem[]; excludedByArea: number } => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(kmlText, 'text/xml')
    const placemarks = Array.from(doc.getElementsByTagName('Placemark'))
    const out: FeatureItem[] = []
    let excludedByArea = 0
    for (const pm of placemarks) {
      // Point
      const p = pm.getElementsByTagName('Point')[0]
      if (p) {
        const coords = p.getElementsByTagName('coordinates')[0]?.textContent?.trim()
        if (coords) {
          const [lon, lat] = coords.split(',').map((s) => Number.parseFloat(s))
          out.push({
            id: getId(),
            geomType: 'Point',
            coords: [lon, lat],
            label: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
            source: sourceType,
            sourceData: sourcePayload,
          })
        }
        if (out.length >= remainingSlots) break
      }
      const ls = pm.getElementsByTagName('LineString')[0]
      if (ls) {
        const coords = ls.getElementsByTagName('coordinates')[0]?.textContent?.trim()
        if (coords) {
          const parts = coords.split(/\s+/).map((c) => c.split(',').map((s) => Number.parseFloat(s)))
          const coordsArr = parts.map((p) => [p[0], p[1]])
          const len = turf.length(turf.lineString(coordsArr), {
            units: 'meters',
          })
          out.push({
            id: getId(),
            geomType: 'LineString',
            coords: coordsArr,
            label: `${convertLength(len, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`,
            metric: len,
            source: sourceType,
            sourceData: sourcePayload,
          })
        }
        if (out.length >= remainingSlots) break
      }
      const poly = pm.getElementsByTagName('Polygon')[0]
      if (poly) {
        const lr = poly.getElementsByTagName('LinearRing')[0]
        const coords = lr?.getElementsByTagName('coordinates')[0]?.textContent?.trim()
        if (coords) {
          const parts = coords.split(/\s+/).map((c) => c.split(',').map((s) => Number.parseFloat(s)))
          const coordsArr = parts.map((p) => [p[0], p[1]])
          const area = turf.area(turf.polygon([coordsArr]))
          if (area > MAX_AREA_SQM) {
            excludedByArea += 1
          } else {
            out.push({
              id: getId(),
              geomType: 'Polygon',
              coords: coordsArr,
              label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
              metric: area,
              source: sourceType,
              sourceData: sourcePayload,
            })
          }
        }
        if (out.length >= remainingSlots) break
      }
    }
    return { items: out, excludedByArea }
  }

  const addExtractedFeatures = (items: FeatureItem[], opts?: { excludedByArea?: number }) => {
    if (!items || items.length === 0) {
      showAlert({
        status: 'warning',
        title: t('form.taskForm.sarAnalysisAreaForm.noSupportedGeometries'),
        content: t('form.taskForm.sarAnalysisAreaForm.noSupportedGeometriesInfo'),
      })
      return
    }
    updateFeaturesInternal((prev) => {
      const space = MAX_FEATURES - prev.length
      const toAdd = items.slice(0, space)
      return [...prev, ...toAdd]
    })
  }

  // --- Extent add handler ---
  const handleAddExtent = () => {
    // Only support GCS numeric xmin/xmax/ymin/ymax for now and UTM similar; MGRS as free text
    if (coordSystem === 'MGRS') {
      if (!mgrsMin || !mgrsMax) return
      try {
        // Convert MGRS grid refs to lon/lat points (returned as [lon, lat])
        const pA = mgrs.toPoint(mgrsMin.trim()) as [number, number]
        const pB = mgrs.toPoint(mgrsMax.trim()) as [number, number]

        // Build axis-aligned rectangle from the two points
        const minLon = Math.min(pA[0], pB[0])
        const maxLon = Math.max(pA[0], pB[0])
        const minLat = Math.min(pA[1], pB[1])
        const maxLat = Math.max(pA[1], pB[1])

        const coords: [number, number][] = [
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ]
        const polygon = turf.polygon([coords])
        const area = turf.area(polygon)
        const id = getId()
        if (area > MAX_AREA_SQM) {
          showAlert({
            status: 'warning',
            title: t('form.taskForm.sarAnalysisAreaForm.cannotAddAnalysisArea'),
            content: t('form.taskForm.sarAnalysisAreaForm.maxAreaInfo'),
          })
        } else {
          updateFeaturesInternal((prev) =>
            prev.length < MAX_FEATURES
              ? [
                  ...prev,
                  {
                    id,
                    geomType: 'Polygon',
                    coords,
                    label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
                    metric: area,
                    source: 'extent',
                    sourceData: {
                      coordinateTypeId: 4,
                      mgrsMin,
                      mgrsMax,
                    },
                  },
                ]
              : prev,
          )
          const bbox = turf.bbox(polygon)
          map?.fitBounds(bbox as LngLatBoundsLike, fitBoundsOptions)
        }
      } catch {}

      setMgrsMin('')
      setMgrsMax('')
      return
    }
    const xn = Number(xmin)
    const xx = Number(xmax)
    const yn = Number(ymin)
    const yx = Number(ymax)
    if (Number.isNaN(xn) || Number.isNaN(xx) || Number.isNaN(yn) || Number.isNaN(yx)) return

    // If UTM zones are selected, interpret values as eastings/northings and convert to WGS84 lon/lat
    let coords: [number, number][] = []
    let coordinateTypeId = 1 // GCS by default
    let zoneId: number | null = null
    if (coordSystem === 'UTM47N' || coordSystem === 'UTM48N') {
      coordinateTypeId = coordSystem === 'UTM47N' ? 2 : 3
      zoneId = coordSystem === 'UTM47N' ? 1 : 2
      const zone = coordSystem === 'UTM47N' ? 47 : 48
      const utmDef = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`
      const cornersUTM: [number, number][] = [
        [xn, yn],
        [xx, yn],
        [xx, yx],
        [xn, yx],
        [xn, yn],
      ]
      coords = cornersUTM.map(([e, n]) => {
        // proj4 returns [lon, lat]
        const p = proj4(utmDef, 'WGS84', [e, n]) as [number, number]
        return [p[0], p[1]]
      })
    } else {
      // Create square polygon from extent (use [lng,lat])
      coords = [
        [xn, yn],
        [xx, yn],
        [xx, yx],
        [xn, yx],
        [xn, yn],
      ]
    }
    const polygon = turf.polygon([coords])
    const area = turf.area(polygon)
    const id = getId()
    if (area > MAX_AREA_SQM) {
      showAlert({
        status: 'warning',
        title: t('form.taskForm.sarAnalysisAreaForm.cannotAddAnalysisArea'),
        content: t('form.taskForm.sarAnalysisAreaForm.maxAreaInfo'),
      })
    } else {
      updateFeaturesInternal((prev) =>
        prev.length < MAX_FEATURES
          ? [
              ...prev,
              {
                id,
                geomType: 'Polygon',
                coords,
                label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
                metric: area,
                source: 'extent',
                sourceData: {
                  coordinateTypeId,
                  zoneId,
                  xMin: xn,
                  xMax: xx,
                  yMin: yn,
                  yMax: yx,
                },
              },
            ]
          : prev,
      )
      const bbox = turf.bbox(polygon)
      map?.fitBounds(bbox as LngLatBoundsLike, fitBoundsOptions)
    }
    setXmin('')
    setXmax('')
    setYmin('')
    setYmax('')
  }

  // --- Draw handlers (map integration deferred) ---
  const startDraw = (mode: 'point' | 'polygon') => {
    setDrawingMode(mode)
    setCurrentPoints([])
    drawingStateRef.current.points = []
    currentFeatureId.current = getId()
  }

  const cancelDraw = () => setDrawingMode('none')

  const finishDrawing = useCallback(() => {
    if (drawingMode === 'point' && currentPoints.length === 1) {
      const c = currentPoints[0]
      const id = getId()
      const label = `${c[1].toFixed(6)}, ${c[0].toFixed(6)}`
      updateFeaturesInternal((prev) =>
        prev.length < MAX_FEATURES
          ? [
              ...prev,
              {
                id,
                geomType: 'Point',
                coords: c,
                label,
                source: 'draw',
                sourceData: { mode: 'point' },
              },
            ]
          : prev,
      )
    }
    if (drawingMode === 'polygon' && currentPoints.length > 2) {
      const coords = [...currentPoints, currentPoints[0]]
      const area = turf.area(turf.polygon([coords]))
      if (area > MAX_AREA_SQM) {
        showAlert({
          status: 'warning',
          title: t('form.taskForm.sarAnalysisAreaForm.cannotAddAnalysisArea'),
          content: t('form.taskForm.sarAnalysisAreaForm.maxAreaInfo'),
        })
      } else {
        const id = getId()
        const label = `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`
        updateFeaturesInternal((prev) =>
          prev.length < MAX_FEATURES
            ? [
                ...prev,
                {
                  id,
                  geomType: 'Polygon',
                  coords: currentPoints,
                  label,
                  metric: area,
                  source: 'draw',
                  sourceData: { mode: 'polygon' },
                },
              ]
            : prev,
        )
      }
    }
    drawingStateRef.current.mouseLngLat = null
    drawingStateRef.current.points = []
    setCurrentPoints([])
    setMouseLngLat(null)
    setDrawingMode('none')
    currentFeatureId.current = null
  }, [drawingMode, currentPoints, areaUnit, showAlert, t])

  // Map preview layer ids
  const CURRENT_POLYGON_ID = 'sar-area-current-polygon'
  const CURRENT_POINT_ID = 'sar-area-current-point'
  const CURRENT_LINE_ID = 'sar-area-current-line'
  const CURRENT_VERTICES_ID = 'sar-area-current-vertices'

  const addPreviewPolygonLayer = useCallback((mapInstance: any, coords: [number, number][]) => {
    if (!mapInstance.getSource(CURRENT_POLYGON_ID)) {
      mapInstance.addSource(CURRENT_POLYGON_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...coords, coords[0]]],
          },
        },
      })
      mapInstance.addLayer(
        {
          id: CURRENT_POLYGON_ID,
          type: 'fill',
          source: CURRENT_POLYGON_ID,
          paint: {
            'fill-color': '#0E94FA',
            'fill-opacity': 0.3,
          },
        },
        layerIdConfig.customReferer,
      )
    } else {
      ;(mapInstance.getSource(CURRENT_POLYGON_ID) as any).setData({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
      })
    }
  }, [])

  const addPreviewPointLayer = useCallback((mapInstance: any, coord: [number, number]) => {
    // Use a symbol layer with a pin icon created from the embedded `pinSvg` string.
    const ICON_NAME = 'sar-pin-icon'
    try {
      // Load image once and cache it
      if (!pinImageLoadedRef.current && !pinImageRef.current) {
        const svgText = pinSvg
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          pinImageRef.current = img
          pinImageLoadedRef.current = true
          try {
            if (typeof mapInstance.hasImage !== 'function' || !mapInstance.hasImage(ICON_NAME)) {
              mapInstance.addImage(ICON_NAME, img)
            }
          } catch {}
        }
        img.onerror = () => {}
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText)
      } else if (pinImageLoadedRef.current && pinImageRef.current) {
        try {
          if (typeof mapInstance.hasImage !== 'function' || !mapInstance.hasImage(ICON_NAME)) {
            mapInstance.addImage(ICON_NAME, pinImageRef.current)
          }
        } catch {}
      }
    } catch {}

    if (mapInstance.getSource(CURRENT_POINT_ID)) {
      mapInstance.getSource(CURRENT_POINT_ID).setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coord },
      })
    } else {
      mapInstance.addSource(CURRENT_POINT_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coord },
        },
      })
      // symbol icon layer (will render once image is available)
      mapInstance.addLayer(
        {
          id: CURRENT_POINT_ID,
          type: 'symbol',
          source: CURRENT_POINT_ID,
          layout: {
            'icon-image': ICON_NAME,
            'icon-size': 0.8,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
          },
        },
        layerIdConfig.customReferer,
      )
    }
  }, [])

  const addPreviewLineLayer = useCallback((mapInstance: any, coords: [number, number][]) => {
    if (mapInstance.getSource(CURRENT_LINE_ID)) {
      mapInstance.getSource(CURRENT_LINE_ID).setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
      })
    } else {
      mapInstance.addSource(CURRENT_LINE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
        },
      })
      mapInstance.addLayer(
        {
          id: CURRENT_LINE_ID,
          type: 'line',
          source: CURRENT_LINE_ID,
          paint: {
            'line-color': '#0E94FA',
            'line-width': 2,
          },
        },
        layerIdConfig.customReferer,
      )
    }
  }, [])

  const addPreviewVerticesLayer = useCallback((mapInstance: any, coords: [number, number][]) => {
    const fc = {
      type: 'FeatureCollection',
      features: coords.map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: c },
        properties: {},
      })),
    }
    if (mapInstance.getSource(CURRENT_VERTICES_ID)) {
      mapInstance.getSource(CURRENT_VERTICES_ID).setData(fc)
    } else {
      mapInstance.addSource(CURRENT_VERTICES_ID, {
        type: 'geojson',
        data: fc,
      })
      mapInstance.addLayer(
        {
          id: CURRENT_VERTICES_ID,
          type: 'circle',
          source: CURRENT_VERTICES_ID,
          paint: { 'circle-radius': 4, 'circle-color': '#0E94FA' },
        },
        layerIdConfig.customReferer,
      )
    }
  }, [])

  const removePreviewLayers = useCallback((mapInstance: any) => {
    if (!mapInstance) return
    if (mapInstance.getLayer(CURRENT_POLYGON_ID)) mapInstance.removeLayer(CURRENT_POLYGON_ID)
    if (mapInstance.getSource(CURRENT_POLYGON_ID)) mapInstance.removeSource(CURRENT_POLYGON_ID)
    if (mapInstance.getLayer(CURRENT_POINT_ID)) mapInstance.removeLayer(CURRENT_POINT_ID)
    if (mapInstance.getSource(CURRENT_POINT_ID)) mapInstance.removeSource(CURRENT_POINT_ID)
    if (mapInstance.getLayer(CURRENT_LINE_ID)) mapInstance.removeLayer(CURRENT_LINE_ID)
    if (mapInstance.getSource(CURRENT_LINE_ID)) mapInstance.removeSource(CURRENT_LINE_ID)
    if (mapInstance.getLayer(CURRENT_VERTICES_ID)) mapInstance.removeLayer(CURRENT_VERTICES_ID)
    if (mapInstance.getSource(CURRENT_VERTICES_ID)) mapInstance.removeSource(CURRENT_VERTICES_ID)
  }, [])

  // Register style-data handler to restore raster and feature layers after basemap change
  useEffect(() => {
    if (!map) return

    const SAR_HANDLER_ID = 'sar-analysis-area-form-handler'
    const registerHandler = useMapStore.getState().registerStyleDataHandler
    const unregisterHandler = useMapStore.getState().unregisterStyleDataHandler

    const handleStyleData = () => {
      // Restore raster layers
      const ensureRaster = (sourceId: string, layerId: string, tileUrl?: string) => {
        if (!tileUrl) return
        try {
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
              type: 'raster',
              tiles: [tileUrl],
              tileSize: 256,
            })
          }
          if (!map.getLayer(layerId)) {
            map.addLayer(
              {
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: { 'raster-opacity': 1 },
              },
              layerIdConfig.customReferer,
            )
          }
        } catch {}
      }

      // Restore raster tiles
      if (rasterSourcesRef.current.before) {
        ensureRaster(IMAGE_BEFORE_SOURCE, IMAGE_BEFORE_LAYER, rasterSourcesRef.current.before)
        if (map.getLayer(IMAGE_BEFORE_LAYER)) {
          map.setLayoutProperty(IMAGE_BEFORE_LAYER, 'visibility', beforeVisible ? 'visible' : 'none')
        }
      }
      if (rasterSourcesRef.current.after) {
        ensureRaster(IMAGE_AFTER_SOURCE, IMAGE_AFTER_LAYER, rasterSourcesRef.current.after)
        if (map.getLayer(IMAGE_AFTER_LAYER)) {
          map.setLayoutProperty(IMAGE_AFTER_LAYER, 'visibility', afterVisible ? 'visible' : 'none')
        }
      }

      // Restore preview layers if drawing
      if (drawingMode !== 'none') {
        const previewCoords = drawingStateRef.current.points
        const mouseLngLat = drawingStateRef.current.mouseLngLat

        if (drawingMode === 'polygon') {
          let allCoords = [...previewCoords]
          if (mouseLngLat) allCoords = [...allCoords, mouseLngLat]

          if (allCoords.length > 0) {
            addPreviewVerticesLayer(map, allCoords)
          }
          if (allCoords.length > 1) {
            addPreviewLineLayer(map, allCoords)
          }
          if (allCoords.length > 2) {
            addPreviewPolygonLayer(map, allCoords)
          }
        }
        if (drawingMode === 'point' && mouseLngLat) {
          addPreviewPointLayer(map, mouseLngLat)
        }
      }

      // Restore finished features
      featuresDataRef.current.forEach((feature) => {
        try {
          if (feature.geomType === 'Point') {
            const pointId = `sar-area-point-${feature.id}`
            if (!map.getSource(pointId)) {
              map.addSource(pointId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: feature.coords as any,
                  },
                  properties: {},
                },
              })

              const ICON_NAME = 'sar-pin-icon'
              if (pinImageLoadedRef.current && pinImageRef.current) {
                try {
                  if (!map.hasImage(ICON_NAME)) {
                    map.addImage(ICON_NAME, pinImageRef.current)
                  }
                } catch {}
              }

              const iconLayerId = `${pointId}-icon`
              if (!map.getLayer(iconLayerId)) {
                map.addLayer(
                  {
                    id: iconLayerId,
                    type: 'symbol',
                    source: pointId,
                    layout: {
                      'icon-image': ICON_NAME,
                      'icon-size': 0.8,
                      'icon-anchor': 'bottom',
                      'icon-allow-overlap': true,
                    },
                  },
                  layerIdConfig.customReferer,
                )
              }
            }
          }
          if (feature.geomType === 'LineString') {
            const lineId = `sar-area-line-${feature.id}`
            if (!map.getSource(lineId)) {
              map.addSource(lineId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: feature.coords as any,
                  },
                  properties: {},
                },
              })
              map.addLayer(
                {
                  id: lineId,
                  type: 'line',
                  source: lineId,
                  paint: {
                    'line-color': '#0E94FA',
                    'line-width': 2,
                  },
                },
                layerIdConfig.customReferer,
              )
            }
          }
          if (feature.geomType === 'Polygon') {
            const polygonId = `sar-area-polygon-${feature.id}`
            if (!map.getSource(polygonId)) {
              const polyCoords = feature.coords as number[][]
              map.addSource(polygonId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'Polygon',
                    coordinates: [[...polyCoords, polyCoords[0]]],
                  },
                  properties: {},
                },
              })
              map.addLayer(
                {
                  id: `${polygonId}-fill`,
                  type: 'fill',
                  source: polygonId,
                  paint: {
                    'fill-color': '#0E94FA',
                    'fill-opacity': 0.3,
                  },
                },
                layerIdConfig.customReferer,
              )
              map.addLayer(
                {
                  id: `${polygonId}-outline`,
                  type: 'line',
                  source: polygonId,
                  paint: {
                    'line-color': '#0E94FA',
                    'line-width': 2,
                  },
                },
                layerIdConfig.customReferer,
              )
            }
          }
        } catch {}
      })
    }

    registerHandler(map, SAR_HANDLER_ID, handleStyleData)
    return () => unregisterHandler(map, SAR_HANDLER_ID)
  }, [
    map,
    drawingMode,
    beforeVisible,
    afterVisible,
    addPreviewPolygonLayer,
    addPreviewPointLayer,
    addPreviewLineLayer,
    addPreviewVerticesLayer,
  ])

  const zoomToImage = useCallback(
    (img: GetResultImageDtoOut | undefined) => {
      if (!map || !img) return
      try {
        const geo = img.geometry
        if (!geo) return
        // If it's a Point
        if (geo.type === 'Point' && Array.isArray(geo.coordinates)) {
          const c = geo.coordinates as number[]
          map.easeTo({ center: [c[0], c[1]], zoom: 14 })
          return
        }
        // For other geometries use bbox
        const b = turf.bbox(geo)
        map.fitBounds(
          [
            [b[0], b[1]],
            [b[2], b[3]],
          ],
          fitBoundsOptions,
        )
        setShowFormDialog(false)
      } catch {}
    },
    [map],
  )

  // Manage raster tile layers for imageBefore/imageAfter: keep sources/layers present and toggle visibility
  useEffect(() => {
    if (!map) return

    const ensureRaster = (sourceId: string, layerId: string, tileUrl?: string) => {
      if (!tileUrl) return
      try {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
          })
        }
        if (!map.getLayer(layerId)) {
          map.addLayer(
            {
              id: layerId,
              type: 'raster',
              source: sourceId,
              paint: { 'raster-opacity': 1 },
            },
            layerIdConfig.customReferer,
          )
          if (tileUrl === imageBefore.tileUrl) {
            zoomToImage(imageBefore)
          }
        }
      } catch {}
    }

    const setVisibility = (layerId: string, visible: boolean) => {
      try {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
        }
      } catch {}
    }

    // Store raster URLs in refs for basemap restoration
    if (imageBefore.tileUrl) rasterSourcesRef.current.before = imageBefore.tileUrl
    if (imageAfter.tileUrl) rasterSourcesRef.current.after = imageAfter.tileUrl

    // Ensure sources/layers exist when tileUrl present
    if (imageBefore.tileUrl) ensureRaster(IMAGE_BEFORE_SOURCE, IMAGE_BEFORE_LAYER, imageBefore.tileUrl)
    if (imageAfter.tileUrl) ensureRaster(IMAGE_AFTER_SOURCE, IMAGE_AFTER_LAYER, imageAfter.tileUrl)

    // Toggle visibility
    setVisibility(IMAGE_BEFORE_LAYER, !!(beforeVisible && imageBefore.tileUrl))
    setVisibility(IMAGE_AFTER_LAYER, !!(afterVisible && imageAfter.tileUrl))

    // Cleanup: remove sources/layers only if tileUrl absent on unmount
    return () => {
      try {
        if (!imageBefore.tileUrl) {
          if (map.getLayer(IMAGE_BEFORE_LAYER)) map.removeLayer(IMAGE_BEFORE_LAYER)
          if (map.getSource(IMAGE_BEFORE_SOURCE)) map.removeSource(IMAGE_BEFORE_SOURCE)
          rasterSourcesRef.current.before = undefined
        }
        if (!imageAfter.tileUrl) {
          if (map.getLayer(IMAGE_AFTER_LAYER)) map.removeLayer(IMAGE_AFTER_LAYER)
          if (map.getSource(IMAGE_AFTER_SOURCE)) map.removeSource(IMAGE_AFTER_SOURCE)
          rasterSourcesRef.current.after = undefined
        }
      } catch {}
    }
  }, [map, beforeVisible, afterVisible, imageBefore, imageAfter, zoomToImage])

  // Attach map event handlers for drawing
  useEffect(() => {
    if (!map) return
    const handleMapClick = (e: any) => {
      if (drawingMode === 'none') return
      const lnglat: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      if (drawingMode === 'point') {
        // directly create point feature here to avoid stale state in finishDrawing
        const id = getId()
        const label = `${lnglat[1].toFixed(6)}, ${lnglat[0].toFixed(6)}`
        updateFeaturesInternal((prev) =>
          prev.length < MAX_FEATURES
            ? [
                ...prev,
                {
                  id,
                  geomType: 'Point',
                  coords: lnglat,
                  label,
                  source: 'draw',
                  sourceData: { mode: 'point' },
                },
              ]
            : prev,
        )
        drawingStateRef.current.mouseLngLat = null
        drawingStateRef.current.points = []
        setMouseLngLat(null)
        setCurrentPoints([])
        setDrawingMode('none')
        currentFeatureId.current = null
        return
      }
      // polygon mode
      setCurrentPoints((prev) => {
        const next = [...prev, lnglat]
        drawingStateRef.current.points = next
        return next
      })
    }

    const handleMapDblClick = (e: any) => {
      if (drawingMode !== 'polygon') return
      e.preventDefault()
      finishDrawing()
    }

    const handleMapMouseMove = (e: any) => {
      if (drawingMode === 'none') return
      const newMouseLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      setMouseLngLat(newMouseLngLat)
      drawingStateRef.current.mouseLngLat = newMouseLngLat

      let previewCoords = [...drawingStateRef.current.points]
      if (drawingStateRef.current.mouseLngLat) previewCoords = [...previewCoords, drawingStateRef.current.mouseLngLat]
      if (drawingMode === 'polygon') {
        // always show vertex markers so the user sees feedback on first/second clicks
        if (previewCoords.length > 0) {
          addPreviewVerticesLayer(map, previewCoords)
        }
        // show connecting line when at least two points
        if (previewCoords.length > 1) {
          addPreviewLineLayer(map, previewCoords)
        }
        // show filled polygon when more than 2
        if (previewCoords.length > 2) {
          addPreviewPolygonLayer(map, previewCoords)
        }
      }
      if (drawingMode === 'point' && drawingStateRef.current.mouseLngLat) {
        addPreviewPointLayer(map, drawingStateRef.current.mouseLngLat)
      }
    }

    map.on('click', handleMapClick)
    map.on('dblclick', handleMapDblClick)
    map.on('mousemove', handleMapMouseMove)
    return () => {
      map.off('click', handleMapClick)
      map.off('dblclick', handleMapDblClick)
      map.off('mousemove', handleMapMouseMove)
    }
  }, [
    map,
    drawingMode,
    finishDrawing,
    updateFeaturesInternal,
    addPreviewPolygonLayer,
    addPreviewPointLayer,
    addPreviewLineLayer,
    addPreviewVerticesLayer,
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: -- Drawing mode change: remove preview layers
  useEffect(() => {
    if (!map) return
    removePreviewLayers(map)
    if (drawingMode === 'none') {
      map.getCanvas().style.cursor = ''
    } else {
      map.getCanvas().style.cursor = 'crosshair'
    }
  }, [map, removePreviewLayers, drawingMode])

  // Draw finished features onto the map
  useEffect(() => {
    if (!map) return

    // Store features in ref for basemap restoration
    featuresDataRef.current = features

    // remove existing sar-area layers/sources
    try {
      map.getStyle().layers?.forEach((layer: any) => {
        if (layer.id.startsWith('sar-area-') && map.getLayer(layer.id)) {
          map.removeLayer(layer.id)
        }
      })
    } catch {}
    try {
      Object.keys(map.getStyle().sources || {}).forEach((sourceId) => {
        if (sourceId.startsWith('sar-area-') && map.getSource(sourceId)) {
          map.removeSource(sourceId)
        }
      })
    } catch {}

    // add features
    features.forEach((feature) => {
      if (feature.geomType === 'Point') {
        const pointId = `sar-area-point-${feature.id}`
        map.addSource(pointId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: feature.coords as any },
            properties: {},
          },
        })

        // create an Image from the embedded `pinSvg` and add it to the map, then add a symbol layer
        try {
          const ICON_NAME = 'sar-pin-icon'
          // Load image once and cache it
          if (!pinImageLoadedRef.current && !pinImageRef.current) {
            const svgText = pinSvg
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              pinImageRef.current = img
              pinImageLoadedRef.current = true
              try {
                if (typeof map.hasImage !== 'function' || !map.hasImage(ICON_NAME)) {
                  map.addImage(ICON_NAME, img)
                }
              } catch {}
              const iconLayerId = `${pointId}-icon`
              if (!map.getLayer(iconLayerId)) {
                map.addLayer(
                  {
                    id: iconLayerId,
                    type: 'symbol',
                    source: pointId,
                    layout: {
                      'icon-image': ICON_NAME,
                      'icon-size': 0.8,
                      'icon-anchor': 'bottom',
                      'icon-allow-overlap': true,
                    },
                  },
                  layerIdConfig.customReferer,
                )
              }
            }
            img.onerror = () => {}
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText)
          } else if (pinImageLoadedRef.current && pinImageRef.current) {
            try {
              if (typeof map.hasImage !== 'function' || !map.hasImage(ICON_NAME)) {
                map.addImage(ICON_NAME, pinImageRef.current)
              }
            } catch {}
            const iconLayerId = `${pointId}-icon`
            if (!map.getLayer(iconLayerId)) {
              map.addLayer(
                {
                  id: iconLayerId,
                  type: 'symbol',
                  source: pointId,
                  layout: {
                    'icon-image': ICON_NAME,
                    'icon-size': 0.8,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                  },
                },
                layerIdConfig.customReferer,
              )
            }
          }
        } catch {}
      }
      if (feature.geomType === 'LineString') {
        const lineId = `sar-area-line-${feature.id}`
        map.addSource(lineId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: feature.coords as any,
            },
            properties: {},
          },
        })
        map.addLayer(
          {
            id: lineId,
            type: 'line',
            source: lineId,
            paint: {
              'line-color': '#0E94FA',
              'line-width': 2,
            },
          },
          layerIdConfig.customReferer,
        )
      }
      if (feature.geomType === 'Polygon') {
        const polygonId = `sar-area-polygon-${feature.id}`
        const polyCoords = feature.coords as number[][]
        map.addSource(polygonId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[...polyCoords, polyCoords[0]]],
            },
            properties: {},
          },
        })
        map.addLayer(
          {
            id: `${polygonId}-fill`,
            type: 'fill',
            source: polygonId,
            paint: {
              'fill-color': '#0E94FA',
              'fill-opacity': 0.3,
            },
          },
          layerIdConfig.customReferer,
        )
        map.addLayer(
          {
            id: `${polygonId}-outline`,
            type: 'line',
            source: polygonId,
            paint: {
              'line-color': '#0E94FA',
              'line-width': 2,
            },
          },
          layerIdConfig.customReferer,
        )
      }
    })
  }, [map, features])

  // --- Delete ---
  const confirmRemove = (item: FeatureItem) => {
    showAlert({
      status: 'confirm-delete',
      showCancel: true,
      onConfirm: () => updateFeaturesInternal((prev) => prev.filter((f) => f.id !== item.id)),
    })
  }

  const zoomToFeature = useCallback(
    (feature: FeatureItem) => {
      if (!map) return
      try {
        if (feature.geomType === 'Point') {
          const c = feature.coords as number[]
          map.easeTo({ center: [c[0], c[1]], zoom: 14 })
          return
        }

        let geo: any
        if (feature.geomType === 'LineString') {
          geo = turf.lineString(feature.coords as number[][])
        } else if (feature.geomType === 'Polygon') {
          const coords = feature.coords as number[][]
          geo = turf.polygon([[...coords, coords[0]]])
        }
        if (!geo) return
        const b = turf.bbox(geo) // [minX, minY, maxX, maxY]
        map.fitBounds(
          [
            [b[0], b[1]],
            [b[2], b[3]],
          ],
          fitBoundsOptions,
        )
        setShowFormDialog(false)
      } catch {}
    },
    [map],
  )

  // Recompute labels when units change
  // biome-ignore lint/correctness/useExhaustiveDependencies: only update on unit changes
  useEffect(() => {
    if (!features || features.length === 0) return
    updateFeaturesInternal((prev) =>
      prev.map((f) => {
        if (f.geomType === 'Point') {
          const c = f.coords as number[]
          return { ...f, label: `${c[1].toFixed(6)}, ${c[0].toFixed(6)}` }
        }
        if (f.geomType === 'LineString') {
          let len = f.metric ?? 0
          if (!len || len === 0) {
            try {
              len = turf.length(turf.lineString(f.coords as any), {
                units: 'meters',
              })
            } catch {
              len = 0
            }
          }
          const converted = convertLength(len, lengthUnit)
          return {
            ...f,
            metric: len,
            label: `${converted.toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`,
          }
        }
        if (f.geomType === 'Polygon') {
          let area = f.metric ?? 0
          if (!area || area === 0) {
            try {
              const coords = f.coords as any
              area = turf.area(turf.polygon([[...coords, coords[0]]]))
            } catch {
              area = 0
            }
          }
          const converted = convertArea(area, areaUnit)
          return {
            ...f,
            metric: area,
            label: `${converted.toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
          }
        }
        return f
      }),
    )
  }, [areaUnit, lengthUnit, updateFeaturesInternal])

  const renderForm = () => (
    <div className='h-full overflow-y-auto p-4 md:w-sm'>
      <div className='mb-2 hidden font-medium md:block'>
        {t('form.taskForm.sarAnalysisAreaForm.defineAnalysisArea')}
      </div>
      {!viewOnly && (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='fullWidth'>
            <Tab label={t('form.taskForm.sarAnalysisAreaForm.importVector')} />
            <Tab label={t('form.taskForm.sarAnalysisAreaForm.enterCoordinates')} />
            <Tab label={t('form.taskForm.sarAnalysisAreaForm.drawArea')} />
          </Tabs>
          <div className='mt-3'>
            {tab === 0 && (
              <div>
                <div className='rounded-lg border border-primary border-dashed p-6 text-center'>
                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type='file'
                    accept='.zip,.geojson,.json,.kml,.kmz'
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor={fileInputId}>
                    <Button
                      variant='contained'
                      startIcon={<CloudUploadIcon />}
                      component='span'
                      onClick={
                        remainingSlots === 0
                          ? (e) => {
                              e.preventDefault()
                              showNoRemainingSlotsError()
                            }
                          : undefined
                      }
                      disabled={loading}
                    >
                      {t('form.taskForm.sarAnalysisAreaForm.chooseFile')}
                    </Button>
                  </label>
                  <div className='mt-2 text-(--color-text-secondary) text-sm'>
                    {t('form.taskForm.sarAnalysisAreaForm.uploadHint')}
                  </div>
                </div>
              </div>
            )}

            {tab === 1 && (
              <div className='space-y-2'>
                <div>
                  <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.coordinateSystem')}</InputLabel>
                  <Select
                    value={coordSystem}
                    onChange={(e) => setCoordSystem(e.target.value)}
                    size='small'
                    disabled={loading}
                  >
                    <MenuItem value='GCS'>GCS</MenuItem>
                    <MenuItem value='UTM47N'>WGS 1984 UTM Zone 47N</MenuItem>
                    <MenuItem value='UTM48N'>WGS 1984 UTM Zone 48N</MenuItem>
                    <MenuItem value='MGRS'>MGRS</MenuItem>
                  </Select>
                </div>
                {coordSystem === 'GCS' && (
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.latitudeMin')}</InputLabel>
                      <TextField
                        size='small'
                        placeholder={t('form.taskForm.sarAnalysisAreaForm.latitudeMin')}
                        value={ymin}
                        type='number'
                        onChange={(e) => setYmin(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.longitudeMin')}</InputLabel>
                      <TextField
                        size='small'
                        placeholder={t('form.taskForm.sarAnalysisAreaForm.longitudeMin')}
                        value={xmin}
                        type='number'
                        onChange={(e) => setXmin(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.latitudeMax')}</InputLabel>
                      <TextField
                        size='small'
                        placeholder={t('form.taskForm.sarAnalysisAreaForm.latitudeMax')}
                        value={ymax}
                        type='number'
                        onChange={(e) => setYmax(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.longitudeMax')}</InputLabel>
                      <TextField
                        size='small'
                        placeholder={t('form.taskForm.sarAnalysisAreaForm.longitudeMax')}
                        value={xmax}
                        type='number'
                        onChange={(e) => setXmax(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
                {(coordSystem === 'UTM47N' || coordSystem === 'UTM48N') && (
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.xMin')}</InputLabel>
                      <TextField
                        size='small'
                        placeholder={t('form.taskForm.sarAnalysisAreaForm.xMin')}
                        value={xmin}
                        type='number'
                        onChange={(e) => setXmin(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.yMin')}</InputLabel>
                      <TextField
                        size='small'
                        placeholder={t('form.taskForm.sarAnalysisAreaForm.yMin')}
                        value={ymin}
                        type='number'
                        onChange={(e) => setYmin(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.xMax')}</InputLabel>
                      <TextField
                        size='small'
                        placeholder={t('form.taskForm.sarAnalysisAreaForm.xMax')}
                        value={xmax}
                        type='number'
                        onChange={(e) => setXmax(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.yMax')}</InputLabel>
                      <TextField
                        size='small'
                        placeholder={t('form.taskForm.sarAnalysisAreaForm.yMax')}
                        value={ymax}
                        type='number'
                        onChange={(e) => setYmax(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
                {coordSystem === 'MGRS' && (
                  <div>
                    <InputLabel>{t('form.taskForm.sarAnalysisAreaForm.mgrsMin')}</InputLabel>
                    <TextField
                      placeholder={t('form.taskForm.sarAnalysisAreaForm.mgrsMin')}
                      size='small'
                      value={mgrsMin}
                      onChange={(e) => setMgrsMin(e.target.value)}
                      disabled={loading}
                      fullWidth
                    />
                    <InputLabel className='mt-2'>{t('form.taskForm.sarAnalysisAreaForm.mgrsMax')}</InputLabel>
                    <TextField
                      placeholder={t('form.taskForm.sarAnalysisAreaForm.mgrsMax')}
                      size='small'
                      value={mgrsMax}
                      onChange={(e) => setMgrsMax(e.target.value)}
                      disabled={loading}
                      fullWidth
                    />
                  </div>
                )}
                <div className='mt-4 flex justify-center'>
                  <Button
                    variant='contained'
                    onClick={remainingSlots === 0 ? showNoRemainingSlotsError : handleAddExtent}
                    startIcon={<AddIcon />}
                    disabled={
                      loading ||
                      (coordSystem === 'MGRS'
                        ? mgrsMin.trim() === '' || mgrsMax.trim() === ''
                        : xmin.trim() === '' || xmax.trim() === '' || ymin.trim() === '' || ymax.trim() === '')
                    }
                  >
                    {t('button.add')}
                  </Button>
                </div>
              </div>
            )}

            {tab === 2 && (
              <div className='flex gap-2'>
                <Button
                  className='flex-1'
                  variant={drawingMode === 'point' ? 'contained' : 'outlined'}
                  startIcon={<LocationPinIcon />}
                  onClick={
                    remainingSlots === 0
                      ? showNoRemainingSlotsError
                      : drawingMode === 'point'
                        ? cancelDraw
                        : () => startDraw('point')
                  }
                  disabled={loading}
                >
                  {t('form.taskForm.sarAnalysisAreaForm.drawPoint')}
                </Button>
                <Button
                  className='flex-1'
                  variant={drawingMode === 'polygon' ? 'contained' : 'outlined'}
                  startIcon={<PolygonIcon />}
                  onClick={
                    remainingSlots === 0
                      ? showNoRemainingSlotsError
                      : drawingMode === 'polygon'
                        ? cancelDraw
                        : () => startDraw('polygon')
                  }
                  disabled={loading}
                >
                  {t('form.taskForm.sarAnalysisAreaForm.drawArea')}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      <div className='mt-4 flex h-10 items-center bg-(--color-background-default) px-3 font-medium text-sm'>
        {`${t('form.taskForm.sarAnalysisAreaForm.analysisArea')} (${features.length}/${MAX_FEATURES})`}
      </div>
      <div className='flex flex-col gap-0.5 border-(--color-background-default) border-x p-3'>
        {features.map((f) => (
          <Tooltip key={f.id} title={f.label} arrow>
            <button
              className='flex cursor-pointer items-center rounded-xs bg-(--color-background-default) px-2 py-0.5 hover:bg-(--color-background-dark) hover:text-white'
              type='button'
              onClick={() => zoomToFeature(f)}
            >
              <div className='flex items-center'>
                {f.geomType === 'Point' && <LocationPinIcon />}
                {f.geomType === 'LineString' && <PolylineIcon />}
                {f.geomType === 'Polygon' && <PolygonIcon />}
              </div>
              <div className='mx-2 flex-1 truncate text-left text-sm'>{f.label}</div>
              {!viewOnly && (
                <IconButton
                  size='small'
                  color='error'
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmRemove(f)
                  }}
                  disabled={loading}
                >
                  <DeleteIcon fontSize='small' />
                </IconButton>
              )}
            </button>
          </Tooltip>
        ))}
        {features.length === 0 && (
          <div className='m-auto flex flex-col items-center text-(--color-action-disabled)'>
            <InboxIcon className='mb-2 text-[80px]! opacity-(--opacity-disabled)' />
            {t('form.taskForm.sarAnalysisAreaForm.noAnalysisAreaSelected')}
          </div>
        )}
      </div>
      <Tooltip title={imageBefore.image.name} arrow>
        <button
          className='flex w-full cursor-pointer items-center overflow-hidden bg-(--color-background-default) hover:bg-(--color-background-dark) hover:text-white'
          type='button'
          onClick={() => zoomToImage(imageBefore)}
        >
          <Checkbox
            checked={beforeVisible}
            onChange={(e) => {
              e.stopPropagation()
              setBeforeVisible(e.target.checked)
            }}
            size='small'
            onClick={(e) => e.stopPropagation()}
          />
          <BorderAllIcon fontSize='small' />
          <div className='mx-1 truncate text-sm'>{imageBefore.image.name}</div>
        </button>
      </Tooltip>
      <Tooltip title={imageAfter.image.name} arrow>
        <button
          className='mt-0.5 flex w-full cursor-pointer items-center overflow-hidden bg-(--color-background-default) hover:bg-(--color-background-dark) hover:text-white'
          type='button'
          onClick={() => zoomToImage(imageAfter)}
        >
          <Checkbox
            checked={afterVisible}
            onChange={(e) => {
              e.stopPropagation()
              setAfterVisible(e.target.checked)
            }}
            size='small'
            onClick={(e) => e.stopPropagation()}
          />
          <BorderAllIcon fontSize='small' />
          <div className='mx-1 truncate text-sm'>{imageAfter.image.name}</div>
        </button>
      </Tooltip>
    </div>
  )

  const isMobileLandscape = useMediaQuery('(max-height: 500px) and (orientation: landscape)')
  const showSidePanel = isMd && !isMobileLandscape

  return (
    <div className='flex min-h-0 flex-1 flex-col items-center pt-4'>
      <div className='flex h-full w-[calc(100vw-32px)] border-(--color-divider) border-t'>
        {showSidePanel && <div className='overflow-hidden'>{renderForm()}</div>}
        <div className='relative flex-1'>
          <MapView mapId={MAP_ID} />
          <div
            className={`!rounded-lg !bg-white !shadow-sm flex !h-10 !w-10 items-center justify-center border border-(--color-gray-border) absolute top-16 left-4 !z-50 ${showSidePanel ? 'hidden' : ''}`}
          >
            <IconButton className='!h-8 !w-8 !rounded-none !p-1.5 grow' onClick={() => setShowFormDialog(true)}>
              <PlaylistAddIcon width={24} height={24} />
            </IconButton>
          </div>
        </div>
      </div>
      {!showSidePanel && (
        <Dialog
          className={showSidePanel ? 'hidden' : 'md:hidden'}
          open={showFormDialog}
          onClose={() => setShowFormDialog(false)}
          fullScreen
        >
          <DialogTitle>{t('form.taskForm.sarAnalysisAreaForm.defineAnalysisArea')}</DialogTitle>
          <div className='flex-1 overflow-hidden'>{renderForm()}</div>
          <DialogActions>
            <Button onClick={() => setShowFormDialog(false)}>{t('button.close')}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  )
}

export default SarAnalysisAreaForm
