import { useCallback } from 'react'
import * as turf from '@turf/turf'
import { useTranslation } from 'react-i18next'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { convertArea, convertLength } from '@/utils/convert'
import { LOCALE_STRING_OPTIONS } from '@/utils/formatNumber'
import { useSettings } from '@/hook/useSettings'
import { Geometry, GeometryCollection, Position } from 'geojson'
import { nanoid } from 'nanoid'

export type VectorGeometry = Exclude<Geometry, GeometryCollection>

export type VectorFeatureItem = {
  id: string
  geomType: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon'
  coords: Position | Position[] | Position[][] | Position[][][]
  label: string
  metric?: number // length (meters) or area (sqm)
  source?: string
  sourceData?: any
  geometry: VectorGeometry
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Helper id
const getId = () => nanoid()

// ─── KML coordinate parser ────────────────────────────────────────────────────

const parseCoords = (text: string): Position[] =>
  text
    .trim()
    .split(/\s+/)
    .map((c) => {
      const parts = c.split(',')
      return [Number.parseFloat(parts[0]), Number.parseFloat(parts[1])]
    })
    .filter((p) => !Number.isNaN(p[0]) && !Number.isNaN(p[1]))

// ─── GeoJSON geometry extractors ──────────────────────────────────────────────

const collectGeometries = (json: any): VectorGeometry[] => {
  if (json?.type === 'FeatureCollection' && Array.isArray(json.features)) {
    return json.features.map((f: any) => f.geometry)
  }
  if (json?.type === 'Feature' && json.geometry) {
    return [json.geometry]
  }
  if (json?.type && json.coordinates) {
    return [json]
  }
  return []
}

const buildPointItem = (geometry: VectorGeometry, sourceType?: string, sourcePayload?: any): VectorFeatureItem => {
  const center = turf.center(geometry)
  return {
    id: getId(),
    geomType: geometry.type as VectorFeatureItem['geomType'],
    coords: geometry.coordinates,
    label: `${center.geometry.coordinates[1].toFixed(6)}, ${center.geometry.coordinates[0].toFixed(6)}`,
    source: sourceType,
    sourceData: sourcePayload,
    geometry,
  }
}

const calcLineLength = (geometry: VectorGeometry & { type: 'LineString' | 'MultiLineString' }): number => {
  if (geometry.type === 'LineString') {
    return turf.length(turf.lineString(geometry.coordinates), { units: 'meters' })
  }
  return (geometry.coordinates as Position[][]).reduce(
    (acc, coords) => acc + turf.length(turf.lineString(coords), { units: 'meters' }),
    0,
  )
}

const calcPolygonArea = (geometry: VectorGeometry & { type: 'Polygon' | 'MultiPolygon' }): number => {
  if (geometry.type === 'Polygon') {
    return turf.area(turf.polygon(geometry.coordinates))
  }
  return (geometry.coordinates as Position[][][]).reduce((acc, coords) => acc + turf.area(turf.polygon(coords)), 0)
}

const buildLineItem = (
  geometry: VectorGeometry,
  lengthUnit: string,
  sourceType?: string,
  sourcePayload?: any,
): VectorFeatureItem => {
  const len = calcLineLength(geometry as VectorGeometry & { type: 'LineString' | 'MultiLineString' })
  return {
    id: getId(),
    geomType: geometry.type as VectorFeatureItem['geomType'],
    coords: geometry.coordinates,
    label: `${convertLength(len, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`,
    metric: len,
    source: sourceType,
    sourceData: sourcePayload,
    geometry,
  }
}

const buildPolygonItem = (
  geometry: VectorGeometry,
  areaUnit: string,
  sourceType?: string,
  sourcePayload?: any,
): VectorFeatureItem => {
  const area = calcPolygonArea(geometry as VectorGeometry & { type: 'Polygon' | 'MultiPolygon' })
  return {
    id: getId(),
    geomType: geometry.type as VectorFeatureItem['geomType'],
    coords: geometry.coordinates,
    label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
    metric: area,
    source: sourceType,
    sourceData: sourcePayload,
    geometry,
  }
}

// ─── KML helpers ──────────────────────────────────────────────────────────────

const isDefined = <T>(v: T | null | undefined): v is T => v != null

const parseMultiGeometryItems = (
  multiGeom: Element,
  lengthUnit: string,
  areaUnit: string,
  sourceType?: string,
  sourcePayload?: any,
): VectorFeatureItem[] => {
  const items: VectorFeatureItem[] = []

  // MultiPoint
  const points = Array.from(multiGeom.getElementsByTagName('Point'))
  if (points.length > 0) {
    const multiCoords = points
      .map((p) => p.getElementsByTagName('coordinates')[0]?.textContent)
      .filter(isDefined)
      .map((txt) => parseCoords(txt)[0])
      .filter(isDefined)
    if (multiCoords.length > 0) {
      const geom: Geometry = { type: 'MultiPoint', coordinates: multiCoords }
      const center = turf.center(geom)
      items.push({
        id: getId(),
        geomType: 'MultiPoint',
        coords: multiCoords,
        label: `${center.geometry.coordinates[1].toFixed(6)}, ${center.geometry.coordinates[0].toFixed(6)}`,
        source: sourceType,
        sourceData: sourcePayload,
        geometry: { ...geom, bbox: turf.bbox(geom) } as VectorGeometry,
      })
    }
  }

  // MultiLineString
  const lines = Array.from(multiGeom.getElementsByTagName('LineString'))
  if (lines.length > 0) {
    const multiCoords = lines
      .map((l) => l.getElementsByTagName('coordinates')[0]?.textContent)
      .filter(isDefined)
      .map((txt) => parseCoords(txt))
      .filter((c) => c.length > 0)
    if (multiCoords.length > 0) {
      const geom: Geometry = { type: 'MultiLineString', coordinates: multiCoords }
      const len = multiCoords.reduce((acc, c) => acc + turf.length(turf.lineString(c), { units: 'meters' }), 0)
      items.push({
        id: getId(),
        geomType: 'MultiLineString',
        coords: multiCoords,
        label: `${convertLength(len, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`,
        metric: len,
        source: sourceType,
        sourceData: sourcePayload,
        geometry: { ...geom, bbox: turf.bbox(geom) } as VectorGeometry,
      })
    }
  }

  // MultiPolygon
  const polys = Array.from(multiGeom.getElementsByTagName('Polygon'))
  if (polys.length > 0) {
    const multiCoords = polys
      .map((poly) => poly.getElementsByTagName('LinearRing')[0]?.getElementsByTagName('coordinates')[0]?.textContent)
      .filter(isDefined)
      .map((txt) => parseCoords(txt))
      .filter((c) => c.length > 0)
      .map((c) => [c])
    if (multiCoords.length > 0) {
      const geom: Geometry = { type: 'MultiPolygon', coordinates: multiCoords }
      const area = multiCoords.reduce((acc, polyCoords) => acc + turf.area(turf.polygon(polyCoords)), 0)
      items.push({
        id: getId(),
        geomType: 'MultiPolygon',
        coords: multiCoords,
        label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
        metric: area,
        source: sourceType,
        sourceData: sourcePayload,
        geometry: { ...geom, bbox: turf.bbox(geom) } as VectorGeometry,
      })
    }
  }

  return items
}

const parseSingleGeometryItems = (
  pm: Element,
  lengthUnit: string,
  areaUnit: string,
  sourceType?: string,
  sourcePayload?: any,
): VectorFeatureItem[] => {
  const items: VectorFeatureItem[] = []

  const pointEl = pm.getElementsByTagName('Point')[0]
  if (pointEl) {
    const txt = pointEl.getElementsByTagName('coordinates')[0]?.textContent
    const c = txt ? parseCoords(txt)[0] : null
    if (c) {
      const geom: Geometry = { type: 'Point', coordinates: c }
      items.push({
        id: getId(),
        geomType: 'Point',
        coords: c,
        label: `${c[1].toFixed(6)}, ${c[0].toFixed(6)}`,
        source: sourceType,
        sourceData: sourcePayload,
        geometry: { ...geom, bbox: turf.bbox(geom) } as VectorGeometry,
      })
    }
  }

  const lineEl = pm.getElementsByTagName('LineString')[0]
  if (lineEl) {
    const txt = lineEl.getElementsByTagName('coordinates')[0]?.textContent
    const c = txt ? parseCoords(txt) : []
    if (c.length > 0) {
      const geom: Geometry = { type: 'LineString', coordinates: c }
      const len = turf.length(turf.lineString(c), { units: 'meters' })
      items.push({
        id: getId(),
        geomType: 'LineString',
        coords: c,
        label: `${convertLength(len, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`,
        metric: len,
        source: sourceType,
        sourceData: sourcePayload,
        geometry: { ...geom, bbox: turf.bbox(geom) } as VectorGeometry,
      })
    }
  }

  const polyEl = pm.getElementsByTagName('Polygon')[0]
  if (polyEl) {
    const txt = polyEl.getElementsByTagName('LinearRing')[0]?.getElementsByTagName('coordinates')[0]?.textContent
    const c = txt ? parseCoords(txt) : []
    if (c.length > 0) {
      const geom: Geometry = { type: 'Polygon', coordinates: [c] }
      const area = turf.area(turf.polygon([c]))
      items.push({
        id: getId(),
        geomType: 'Polygon',
        coords: [c],
        label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
        metric: area,
        source: sourceType,
        sourceData: sourcePayload,
        geometry: { ...geom, bbox: turf.bbox(geom) } as VectorGeometry,
      })
    }
  }

  return items
}

const parsePlacemarkItems = (
  pm: Element,
  lengthUnit: string,
  areaUnit: string,
  sourceType?: string,
  sourcePayload?: any,
): VectorFeatureItem[] => {
  const multiGeom = pm.getElementsByTagName('MultiGeometry')[0]
  if (multiGeom) {
    return parseMultiGeometryItems(multiGeom, lengthUnit, areaUnit, sourceType, sourcePayload)
  }
  return parseSingleGeometryItems(pm, lengthUnit, areaUnit, sourceType, sourcePayload)
}

// ─── File-type handlers ───────────────────────────────────────────────────────

const parseGeoJSONFile = async (
  file: File,
  extractGeoJSONFeatures: (
    json: unknown,
    sourceType?: string,
    sourcePayload?: any,
  ) => { items: VectorFeatureItem[]; excludedByArea: number },
): Promise<VectorFeatureItem[] | null> => {
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    const { items } = extractGeoJSONFeatures(json, 'import', { fileName: file.name })
    return items
  } catch (e) {
    console.error(e)
    return null
  }
}

const parseKmlFile = async (
  file: File,
  parseKml: (
    kmlText: string,
    sourceType?: string,
    sourcePayload?: any,
  ) => { items: VectorFeatureItem[]; excludedByArea: number },
): Promise<VectorFeatureItem[] | null> => {
  try {
    const text = await file.text()
    const { items } = parseKml(text, 'import', { fileName: file.name })
    return items
  } catch {
    return null
  }
}

const parseKmzFile = async (
  file: File,
  parseKml: (
    kmlText: string,
    sourceType?: string,
    sourcePayload?: any,
  ) => { items: VectorFeatureItem[]; excludedByArea: number },
): Promise<VectorFeatureItem[] | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const jszipMod = await import('jszip')
    const JSZip = jszipMod.default || jszipMod
    const zip = await JSZip.loadAsync(arrayBuffer)
    const kmlName = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.kml'))
    if (!kmlName) return null
    const fileObj = zip.file(kmlName)
    if (!fileObj) return null
    const kmlText = await fileObj.async('string')
    const { items } = parseKml(kmlText, 'import', { fileName: file.name })
    return items
  } catch {
    return null
  }
}

const parseShapefileZip = async (
  file: File,
  extractGeoJSONFeatures: (
    json: unknown,
    sourceType?: string,
    sourcePayload?: any,
  ) => { items: VectorFeatureItem[]; excludedByArea: number },
): Promise<VectorFeatureItem[] | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const shpjsMod = await import('shpjs')
    const shp = shpjsMod.default || shpjsMod
    const geojson = await shp(arrayBuffer)
    const { items } = extractGeoJSONFeatures(geojson, 'import', { fileName: file.name })
    return items
  } catch (e) {
    console.error(e)
    return null
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useVectorUploader = () => {
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const { areaUnit, lengthUnit } = useSettings()

  const showImportError = useCallback(() => {
    showAlert({
      status: 'warning',
      title: t('form.taskForm.sarAnalysisAreaForm.cannotUploadFile'),
      content: t('form.taskForm.sarAnalysisAreaForm.cannotUploadFileInfo'),
    })
  }, [showAlert, t])

  const extractGeoJSONFeatures = useCallback(
    (
      json: unknown,
      sourceType?: string,
      sourcePayload?: any,
    ): { items: VectorFeatureItem[]; excludedByArea: number } => {
      const excludedByArea = 0
      const items = collectGeometries(json)
        .filter((g) => g.type)
        .flatMap((geometry) => {
          if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
            return [buildPointItem(geometry, sourceType, sourcePayload)]
          }
          if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
            return [buildLineItem(geometry, lengthUnit, sourceType, sourcePayload)]
          }
          if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
            return [buildPolygonItem(geometry, areaUnit, sourceType, sourcePayload)]
          }
          return []
        })
      return { items, excludedByArea }
    },
    [areaUnit, lengthUnit],
  )

  const parseKml = useCallback(
    (
      kmlText: string,
      sourceType?: string,
      sourcePayload?: any,
    ): { items: VectorFeatureItem[]; excludedByArea: number } => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(kmlText, 'text/xml')
      const placemarks = Array.from(doc.getElementsByTagName('Placemark'))
      const excludedByArea = 0
      const parsePlacemark = (pm: Element): VectorFeatureItem[] =>
        parsePlacemarkItems(pm, lengthUnit, areaUnit, sourceType, sourcePayload)
      const items = placemarks.flatMap(parsePlacemark)
      return { items, excludedByArea }
    },
    [areaUnit, lengthUnit],
  )

  const handleFile = useCallback(
    async (file: File): Promise<VectorFeatureItem[]> => {
      try {
        if (file.size > MAX_FILE_SIZE) {
          showImportError()
          return []
        }

        const name = file.name.toLowerCase()

        if (name.endsWith('.geojson') || name.endsWith('.json')) {
          const items = await parseGeoJSONFile(file, extractGeoJSONFeatures)
          if (!items) {
            showImportError()
            return []
          }
          return items
        }

        if (name.endsWith('.kml')) {
          const items = await parseKmlFile(file, parseKml)
          if (!items) {
            showImportError()
            return []
          }
          return items
        }

        if (name.endsWith('.kmz')) {
          const items = await parseKmzFile(file, parseKml)
          if (!items) {
            showImportError()
            return []
          }
          return items
        }

        if (name.endsWith('.zip')) {
          const items = await parseShapefileZip(file, extractGeoJSONFeatures)
          if (!items) {
            showImportError()
            return []
          }
          return items
        }

        showImportError()
        return []
      } catch {
        showImportError()
        return []
      }
    },
    [extractGeoJSONFeatures, parseKml, showImportError],
  )

  return {
    handleFile,
  }
}
