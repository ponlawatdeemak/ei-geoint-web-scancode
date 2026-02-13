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
      const list: VectorFeatureItem[] = []
      const excludedByArea = 0
      const geometryList: VectorGeometry[] = []
      const j = json as any
      if (j?.type === 'FeatureCollection' && Array.isArray(j.features)) {
        for (const f of j.features) {
          geometryList.push(f.geometry)
        }
      } else if (j?.type === 'Feature' && j.geometry) {
        geometryList.push(j.geometry)
      } else if (j?.type && j.coordinates) {
        geometryList.push(j)
      }

      for (const geometry of geometryList) {
        if (!geometry.type) continue
        const result: VectorFeatureItem = {
          id: getId(),
          geomType: geometry.type,
          coords: geometry.coordinates,
          source: sourceType,
          sourceData: sourcePayload,
          label: '',
          metric: undefined,
          geometry,
        }
        if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
          const center = turf.center(geometry)
          result.label = `${center.geometry.coordinates[1].toFixed(6)}, ${center.geometry.coordinates[0].toFixed(6)}`
          list.push(result)
        } else if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
          let len = 0
          if (geometry.type === 'LineString') {
            len = turf.length(turf.lineString(geometry.coordinates), { units: 'meters' })
          } else {
            len = geometry.coordinates.reduce((acc: number, coords) => {
              return acc + turf.length(turf.lineString(coords), { units: 'meters' })
            }, 0)
          }
          result.label = `${convertLength(len, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`
          result.metric = len
          list.push(result)
        } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
          let area = 0
          if (geometry.type === 'Polygon') {
            area = turf.area(turf.polygon(geometry.coordinates))
          } else {
            area = geometry.coordinates.reduce((acc: number, coords) => {
              return acc + turf.area(turf.polygon(coords))
            }, 0)
          }
          result.label = `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`
          result.metric = area
          list.push(result)
        }
      }
      return { items: list, excludedByArea }
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
      const out: VectorFeatureItem[] = []
      const excludedByArea = 0

      const parseCoords = (text: string): Position[] => {
        return text
          .trim()
          .split(/\s+/)
          .map((c) => {
            const parts = c.split(',')
            return [Number.parseFloat(parts[0]), Number.parseFloat(parts[1])]
          })
          .filter((p) => !Number.isNaN(p[0]) && !Number.isNaN(p[1]))
      }

      for (const pm of placemarks) {
        const multiGeom = pm.getElementsByTagName('MultiGeometry')[0]
        if (multiGeom) {
          // MultiPoint
          const points = Array.from(multiGeom.getElementsByTagName('Point'))
          if (points.length > 0) {
            const multiCoords: Position[] = []
            for (const p of points) {
              const txt = p.getElementsByTagName('coordinates')[0]?.textContent
              if (txt) {
                const c = parseCoords(txt)[0]
                if (c) multiCoords.push(c)
              }
            }
            if (multiCoords.length > 0) {
              const geom: Geometry = { type: 'MultiPoint', coordinates: multiCoords }
              const center = turf.center(geom)
              out.push({
                id: getId(),
                geomType: 'MultiPoint',
                coords: multiCoords,
                label: `${center.geometry.coordinates[1].toFixed(6)}, ${center.geometry.coordinates[0].toFixed(6)}`,
                source: sourceType,
                sourceData: sourcePayload,
                geometry: {
                  ...geom,
                  bbox: turf.bbox(geom),
                } as VectorGeometry,
              })
            }
          }

          // MultiLineString
          const lines = Array.from(multiGeom.getElementsByTagName('LineString'))
          if (lines.length > 0) {
            const multiCoords: Position[][] = []
            for (const l of lines) {
              const txt = l.getElementsByTagName('coordinates')[0]?.textContent
              if (txt) {
                const c = parseCoords(txt)
                if (c.length > 0) multiCoords.push(c)
              }
            }
            if (multiCoords.length > 0) {
              const geom: Geometry = { type: 'MultiLineString', coordinates: multiCoords }
              let len = 0
              multiCoords.forEach((c) => {
                len += turf.length(turf.lineString(c), { units: 'meters' })
              })
              out.push({
                id: getId(),
                geomType: 'MultiLineString',
                coords: multiCoords,
                label: `${convertLength(len, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`,
                metric: len,
                source: sourceType,
                sourceData: sourcePayload,
                geometry: {
                  ...geom,
                  bbox: turf.bbox(geom),
                } as VectorGeometry,
              })
            }
          }

          // MultiPolygon
          const polys = Array.from(multiGeom.getElementsByTagName('Polygon'))
          if (polys.length > 0) {
            const multiCoords: Position[][][] = []
            for (const poly of polys) {
              const lr = poly.getElementsByTagName('LinearRing')[0]
              const txt = lr?.getElementsByTagName('coordinates')[0]?.textContent
              if (txt) {
                const c = parseCoords(txt)
                if (c.length > 0) multiCoords.push([c]) // Wrap as single ring polygon
              }
            }
            if (multiCoords.length > 0) {
              const geom: Geometry = { type: 'MultiPolygon', coordinates: multiCoords }
              let area = 0
              multiCoords.forEach((polyCoords) => {
                area += turf.area(turf.polygon(polyCoords))
              })
              out.push({
                id: getId(),
                geomType: 'MultiPolygon',
                coords: multiCoords,
                label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
                metric: area,
                source: sourceType,
                sourceData: sourcePayload,
                geometry: {
                  ...geom,
                  bbox: turf.bbox(geom),
                } as VectorGeometry,
              })
            }
          }
        } else {
          // Single Geometries
          const p = pm.getElementsByTagName('Point')[0]
          if (p) {
            const txt = p.getElementsByTagName('coordinates')[0]?.textContent
            if (txt) {
              const c = parseCoords(txt)[0]
              if (c) {
                const geom: Geometry = { type: 'Point', coordinates: c }
                out.push({
                  id: getId(),
                  geomType: 'Point',
                  coords: c,
                  label: `${c[1].toFixed(6)}, ${c[0].toFixed(6)}`,
                  source: sourceType,
                  sourceData: sourcePayload,
                  geometry: {
                    ...geom,
                    bbox: turf.bbox(geom),
                  } as VectorGeometry,
                })
              }
            }
          }
          const ls = pm.getElementsByTagName('LineString')[0]
          if (ls) {
            const txt = ls.getElementsByTagName('coordinates')[0]?.textContent
            if (txt) {
              const c = parseCoords(txt)
              if (c.length > 0) {
                const geom: Geometry = { type: 'LineString', coordinates: c }
                const len = turf.length(turf.lineString(c), { units: 'meters' })
                out.push({
                  id: getId(),
                  geomType: 'LineString',
                  coords: c,
                  label: `${convertLength(len, lengthUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${lengthUnit}`,
                  metric: len,
                  source: sourceType,
                  sourceData: sourcePayload,
                  geometry: {
                    ...geom,
                    bbox: turf.bbox(geom),
                  } as VectorGeometry,
                })
              }
            }
          }
          const poly = pm.getElementsByTagName('Polygon')[0]
          if (poly) {
            const lr = poly.getElementsByTagName('LinearRing')[0]
            const txt = lr?.getElementsByTagName('coordinates')[0]?.textContent
            if (txt) {
              const c = parseCoords(txt)
              if (c.length > 0) {
                const geom: Geometry = { type: 'Polygon', coordinates: [c] }
                const area = turf.area(turf.polygon([c]))
                out.push({
                  id: getId(),
                  geomType: 'Polygon',
                  coords: [c], // Consistent with GeoJSON: Polygon coordinates is Position[][] (array of rings)
                  label: `${convertArea(area, areaUnit).toLocaleString(undefined, LOCALE_STRING_OPTIONS)} ${areaUnit}`,
                  metric: area,
                  source: sourceType,
                  sourceData: sourcePayload,
                  geometry: {
                    ...geom,
                    bbox: turf.bbox(geom),
                  } as VectorGeometry,
                })
              }
            }
          }
        }
      }
      return { items: out, excludedByArea }
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
          try {
            const text = await file.text()
            const json = JSON.parse(text)
            const { items } = extractGeoJSONFeatures(json, 'import', { fileName: file.name })

            return items
          } catch (e) {
            console.error(e)
            showImportError()
            return []
          }
        }

        if (name.endsWith('.kml')) {
          try {
            const text = await file.text()
            const { items } = parseKml(text, 'import', { fileName: file.name })
            return items
          } catch {
            showImportError()
            return []
          }
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
              return []
            }
            const fileObj = zip.file(kmlName)
            if (!fileObj) {
              showImportError()
              return []
            }
            const kmlText = await fileObj.async('string')
            const { items } = parseKml(kmlText, 'import', { fileName: file.name })
            return items
          } catch {
            showImportError()
            return []
          }
        }

        // Shapefile ZIP (.zip)
        if (name.endsWith('.zip')) {
          try {
            const arrayBuffer = await file.arrayBuffer()
            const shpjsMod = await import('shpjs')
            const shp = shpjsMod.default || shpjsMod
            // shpjs accepts ArrayBuffer and returns GeoJSON
            const geojson = await shp(arrayBuffer)
            const { items } = extractGeoJSONFeatures(geojson, 'import', { fileName: file.name })
            return items
          } catch (e) {
            console.error(e)
            showImportError()
            return []
          }
        }
        showImportError()
        return []
      } catch (error) {
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
