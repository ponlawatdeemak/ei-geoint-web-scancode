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

export function useCreateMapThumbnail({ mapId, mapLibre, pageLevel, id }: UseCreateMapThumbnailParams) {
  useEffect(() => {
    const map = mapLibre[mapId]
    if (!map) return

    map.once('idle', async () => {
      const MAX_SIZE_KB = 250
      const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024
      const quality = 0.8
      const scale = 1

      const isSafari = (): boolean => {
        if (typeof window === 'undefined') return false
        const ua = navigator.userAgent
        const vendor = navigator.vendor
        return /Safari/.test(ua) && /Apple/.test(vendor) && !/Chrome|Chromium|Edg/.test(ua)
      }

      const canvas = isSafari()
        ? map.getCanvas()
        : await html2canvas(map.getContainer(), {
            useCORS: true,
            logging: false,
            backgroundColor: null,
          })

      const originalWidth = canvas.width
      const originalHeight = canvas.height

      // const img = canvas.toDataURL('image/jpeg')
      // const a = document.createElement('a')
      // a.href = img
      // a.download = 'map.png'
      // a.click()

      // Convert canvas to blob
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

      const uploadThumbnail = (blob: Blob) => {
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

      const compressBlob = async (canvas: HTMLCanvasElement, quality: number, scale: number): Promise<void> => {
        const blob = await canvasToBlob(canvas, quality)

        if (!blob) {
          console.warn('Failed to create blob')
          return
        }

        if (blob.size <= MAX_SIZE_BYTES) {
          uploadThumbnail(blob)
          return
        }

        // ลด quality
        if (quality > 0.1) {
          quality -= 0.1
          await compressBlob(canvas, quality, scale)
        }
        // ถ้า quality ต่ำสุดแล้ว ลดขนาด dimension
        else if (scale > 0.5) {
          scale -= 0.1
          quality = 0.8 // reset quality เมื่อลดขนาด

          // สร้าง canvas ใหม่ที่เล็กลง
          const tempCanvas = document.createElement('canvas')
          const newWidth = Math.round(originalWidth * scale)
          const newHeight = Math.round(originalHeight * scale)
          tempCanvas.width = newWidth
          tempCanvas.height = newHeight

          const ctx = tempCanvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, newWidth, newHeight)
            await compressBlob(tempCanvas, quality, scale)
          } else {
            uploadThumbnail(blob)
          }
        }
        // กรณีลดไม่ได้แล้ว upload เลย
        else {
          uploadThumbnail(blob)
        }
      }

      await compressBlob(canvas, quality, scale)
    })
  }, [mapId, mapLibre, id, pageLevel])
}
