import { useEffect } from 'react'
import html2canvas from 'html2canvas'
import type maplibregl from 'maplibre-gl'
import service from '@/api'
import { ProjectMapViewPageLevel } from '@interfaces/config/app.config'

type UseCreateMapThumbnailParams = {
  mapId: string
  mapLibre: Record<string, maplibregl.Map | null>
  pageLevel: ProjectMapViewPageLevel
  id: string
}

const MAX_SIZE_BYTES = 250 * 1024
const DEFAULT_QUALITY = 0.8
const DEFAULT_SCALE = 1
const MIN_QUALITY = 0.1
const MIN_SCALE = 0.5
const QUALITY_STEP = 0.1
const SCALE_STEP = 0.1

const isSafariBrowser = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const vendor = navigator.vendor
  return /Safari/.test(ua) && /Apple/.test(vendor) && !/Chrome|Chromium|Edg/.test(ua)
}

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> => {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

const uploadThumbnail = (pageLevel: ProjectMapViewPageLevel, id: string, blob: Blob) => {
  const file = new File([blob], 'map-thumbnail.jpg', { type: 'image/jpeg' })

  if (pageLevel === ProjectMapViewPageLevel.project) {
    service.projects.postThumbnails(id, file).catch((err: unknown) => {
      console.error('Failed to upload thumbnail:', err)
    })
  } else if (pageLevel === ProjectMapViewPageLevel.task) {
    service.tasks.postThumbnails(id, file).catch((err: unknown) => {
      console.error('Failed to upload thumbnail:', err)
    })
  }
}

const getThumbnailCanvas = async (map: maplibregl.Map): Promise<HTMLCanvasElement> => {
  if (isSafariBrowser()) return map.getCanvas()

  return await html2canvas(map.getContainer(), {
    useCORS: true,
    logging: false,
    backgroundColor: null,
  })
}

type CompressParams = {
  canvas: HTMLCanvasElement
  originalWidth: number
  originalHeight: number
  quality: number
  scale: number
  pageLevel: ProjectMapViewPageLevel
  id: string
}

const compressAndUpload = async ({
  canvas,
  originalWidth,
  originalHeight,
  quality,
  scale,
  pageLevel,
  id,
}: CompressParams): Promise<void> => {
  const blob = await canvasToBlob(canvas, quality)

  if (!blob) {
    console.warn('Failed to create blob')
    return
  }

  if (blob.size <= MAX_SIZE_BYTES) {
    uploadThumbnail(pageLevel, id, blob)
    return
  }

  // ลด quality
  if (quality > MIN_QUALITY) {
    await compressAndUpload({
      canvas,
      originalWidth,
      originalHeight,
      quality: quality - QUALITY_STEP,
      scale,
      pageLevel,
      id,
    })
    return
  }

  // ถ้า quality ต่ำสุดแล้ว ลดขนาด dimension
  if (scale > MIN_SCALE) {
    const nextScale = scale - SCALE_STEP
    const tempCanvas = document.createElement('canvas')
    const newWidth = Math.round(originalWidth * nextScale)
    const newHeight = Math.round(originalHeight * nextScale)
    tempCanvas.width = newWidth
    tempCanvas.height = newHeight

    const ctx = tempCanvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, newWidth, newHeight)
      await compressAndUpload({
        canvas: tempCanvas,
        originalWidth,
        originalHeight,
        quality: DEFAULT_QUALITY,
        scale: nextScale,
        pageLevel,
        id,
      })
      return
    }

    uploadThumbnail(pageLevel, id, blob)
    return
  }

  // กรณีลดไม่ได้แล้ว upload เลย
  uploadThumbnail(pageLevel, id, blob)
}

const createMapThumbnail = async (
  map: maplibregl.Map,
  pageLevel: ProjectMapViewPageLevel,
  id: string,
): Promise<void> => {
  const canvas = await getThumbnailCanvas(map)
  const originalWidth = canvas.width
  const originalHeight = canvas.height

  await compressAndUpload({
    canvas,
    originalWidth,
    originalHeight,
    quality: DEFAULT_QUALITY,
    scale: DEFAULT_SCALE,
    pageLevel,
    id,
  })
}

export function useCreateMapThumbnail({ mapId, mapLibre, pageLevel, id }: UseCreateMapThumbnailParams) {
  useEffect(() => {
    const map = mapLibre[mapId]
    if (!map) return

    map.once('idle', () => {
      void createMapThumbnail(map, pageLevel, id)
    })
  }, [mapId, mapLibre, id, pageLevel])
}
