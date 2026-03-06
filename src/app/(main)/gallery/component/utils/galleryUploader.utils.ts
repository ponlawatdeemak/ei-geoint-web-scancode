import thaicom from '@/api/thaicom'
import { formatDateTimeFromMillis } from '@/utils/formatDate'
import axios from 'axios'
import { nanoid } from 'nanoid'

const MAX_PART_RETRIES = 3

interface ResumeState {
  uploadId: string
  itemId: string
  imageId: string
  serviceId: string
  chunkSize: number
  completedParts: { ETag: string; PartNumber: number }[]
}

interface SelectedFile {
  id: string
  file: File
  url?: string
  kind: 'tiff' | 'zip' | 'other'
  imagingDate?: string | null
  title?: string
  tags?: string
  metadata?: string
  uploadProgress?: number
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'failed'
}

export const getResumeState = (key: string): ResumeState | null => {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as ResumeState) : null
  } catch {
    return null
  }
}

export const saveResumeState = (key: string, state: ResumeState) => {
  localStorage.setItem(key, JSON.stringify(state))
}

export const clearResumeState = (key: string) => {
  localStorage.removeItem(key)
}

export const getResumeKey = (fileName: string, chunkSize: number) => {
  return `upload_resume_${fileName}_${chunkSize}`
}

export const decodeTiffToUrl = async (
  file: File,
  createdUrlsRef: React.MutableRefObject<string[]>,
): Promise<string | undefined> => {
  try {
    const ab = await file.arrayBuffer()
    const UTIF = await import('utif')
    const ifds = UTIF.decode(ab)
    if (ifds && ifds.length > 0) {
      try {
        UTIF.decodeImages(ab, ifds)
      } catch (e) {
        console.warn('Failed to decode TIFF images:', e)
      }
      const first = ifds[0]
      const width = (first.width as number) || (first.t256 as number) || (first.ImageWidth as number) || 0
      const height = (first.height as number) || (first.t257 as number) || (first.ImageLength as number) || 0
      const raw = UTIF.toRGBA8(first) as Uint8Array
      if (raw && width > 0 && height > 0) {
        const clamped = new Uint8ClampedArray(raw)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          const imageData = new ImageData(clamped, width, height)
          ctx.putImageData(imageData, 0, 0)
          const url = canvas.toDataURL('image/png')
          createdUrlsRef.current.push(url)
          return url
        }
      }
    }
  } catch (e) {
    console.warn('Failed to decode TIFF file:', e)
  }
  return undefined
}

export const toSelectedFile = async (
  file: File,
  index: number,
  createdUrlsRef: React.MutableRefObject<string[]>,
): Promise<SelectedFile> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const kind: SelectedFile['kind'] = ext === 'zip' ? 'zip' : ext === 'tiff' || ext === 'tif' ? 'tiff' : 'other'
  const id = `${Date.now()}-${index}-${nanoid()}`

  let url: string | undefined

  if (kind === 'tiff') {
    url = await decodeTiffToUrl(file, createdUrlsRef)
  }

  if (!url) {
    url = kind === 'zip' ? undefined : URL.createObjectURL(file)
    if (url?.startsWith('blob:')) createdUrlsRef.current.push(url)
  }

  const imagingDate = formatDateTimeFromMillis(file.lastModified, false)
  return { id, file, url, kind, imagingDate, title: file.name, metadata: '' }
}

export const validateMetadata = (
  fileData: SelectedFile,
  showAlert: (opts: any) => void,
  t: (key: string, opts?: any) => string,
) => {
  if (!fileData.metadata) return

  const metaSize = new Blob([fileData.metadata]).size
  const MAX_META = 1024 * 1024
  if (metaSize > MAX_META) {
    showAlert({
      status: 'error',
      errorCode: t('gallery.uploadDialog.error.metadataTooLarge', { size: Math.round(MAX_META / 1024) }),
    })
    throw new Error('Metadata too large')
  }

  const mt = fileData.metadata.trim()
  try {
    if (mt.startsWith('{') || mt.startsWith('[')) {
      JSON.parse(mt)
    } else if (mt.startsWith('<')) {
      const doc = new DOMParser().parseFromString(mt, 'application/xml')
      const errs = doc.getElementsByTagName('parsererror')
      if (errs && errs.length > 0) throw new Error('XML parse error')
    }
  } catch (e) {
    showAlert({ status: 'error', errorCode: t('gallery.uploadDialog.error.metadataInvalid') })
    throw e
  }
}

export type UploadPartContext = {
  file: File
  uploadId: string
  chunkSize: number
  fileIndex: number
  filesLength: number
  bytesByPart: Record<number, number>
  completedParts: { ETag: string; PartNumber: number }[]
  storageKey: string
  itemId: string
  imageId: string
  serviceId: string
  abortControllerRef: React.MutableRefObject<AbortController | null>
  abortedByUserRef: React.MutableRefObject<boolean>
  setUploadProgress: (p: number) => void
}

export const uploadPart = async (
  partNumber: number,
  ctx: UploadPartContext,
  retryCount = 0,
): Promise<void> => {
  const {
    file, uploadId, chunkSize, fileIndex, filesLength,
    bytesByPart, completedParts, storageKey, itemId, imageId,
    serviceId, abortControllerRef, abortedByUserRef, setUploadProgress,
  } = ctx

  try {
    const start = (partNumber - 1) * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)

    const upRes = await thaicom.postUploadMultipartUpload({
      file_name: file.name,
      part_number: partNumber,
      upload_id: uploadId,
    })

    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController()
    }

    const putResp = await axios.put(upRes.url, chunk, {
      headers: { 'Content-Type': 'application/octet-stream' },
      signal: abortControllerRef.current.signal,
      onUploadProgress: (ev) => {
        if (typeof ev.loaded === 'number') {
          bytesByPart[partNumber] = ev.loaded
          const totalLoaded = Object.values(bytesByPart).reduce((a, b) => a + b, 0)
          const fileFraction = totalLoaded / file.size
          const overall = Math.round(((fileIndex + fileFraction) / filesLength) * 100)
          setUploadProgress(Math.min(99, overall))
        }
      },
    })

    const etag = (putResp.headers?.etag as string) || ''

    await thaicom.postUploadMultipartConfirm({
      etag,
      file_name: file.name,
      part_number: partNumber,
      upload_id: uploadId,
    })

    if (etag) {
      const partInfo = { ETag: etag, PartNumber: partNumber }
      completedParts.push(partInfo)

      const currentResumeState = getResumeState(storageKey)
      const existingParts = currentResumeState?.completedParts || []
      const isExists = existingParts.some((p) => p.PartNumber === partNumber)

      saveResumeState(storageKey, {
        uploadId, itemId, imageId, serviceId, chunkSize,
        completedParts: isExists ? existingParts : [...existingParts, partInfo],
      })
    }
  } catch (error: any) {
    if (axios.isCancel(error) || error?.name === 'CanceledError' || abortedByUserRef.current) {
      throw error
    }
    if (retryCount < MAX_PART_RETRIES) {
      console.warn(`Part ${partNumber} failed, retrying (${retryCount + 1}/${MAX_PART_RETRIES})...`, error)
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** retryCount))
      bytesByPart[partNumber] = 0
      return uploadPart(partNumber, ctx, retryCount + 1)
    } else {
      console.error(`Part ${partNumber} failed after ${MAX_PART_RETRIES} retries`)
      throw error
    }
  }
}