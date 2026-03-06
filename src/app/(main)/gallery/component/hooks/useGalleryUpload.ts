import thaicom from "@/api/thaicom"
import { ImageUploadStep } from "@/components/common/images/images"
import { useImages } from "@/components/common/images/use-images"
import { useProfileStore } from "@/hook/useProfileStore"
import { useGlobalUI } from "@/providers/global-ui/GlobalUIContext"
import { formatDateTimeFromMillis } from "@/utils/formatDate"
import { ImageStatus } from "@interfaces/config"
import axios from "axios"
import dayjs from "dayjs"
import image from "@/api/image"
import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { UploadPartContext, uploadPart, validateMetadata } from "../utils/galleryUploader.utils"

const MULTIPART_THRESHOLD = 100 * 1024 * 1024 // 100MB
const DEFAULT_CHUNK_SIZE = 128 * 1024 * 1024 // 128MB
// run with concurrency pool of at least 10
const CONCURRENCY = 4

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

interface ResumeState {
  uploadId: string
  itemId: string
  imageId: string
  serviceId: string
  chunkSize: number
  completedParts: { ETag: string; PartNumber: number }[]
}

const getResumeKey = (userId: string, file: File) =>
  `gallery_uploader_resume_${userId}_${file.name}_${file.size}_${file.lastModified}`

const getResumeState = (key: string): ResumeState | null => {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as ResumeState) : null
  } catch {
    return null
  }
}

const clearAllResumeStates = () => {
  if (typeof window === 'undefined') return
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('gallery_uploader_resume_')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => {
    localStorage.removeItem(key)
  })
}

const saveResumeState = (key: string, state: ResumeState) => {
  localStorage.setItem(key, JSON.stringify(state))
}

const clearResumeState = (key: string) => {
  // clear on complete
  // clear on cancel
  // clear on new upload with another file
  localStorage.removeItem(key)
}

export const useGalleryUpload = ({
  serviceId,
  searchParamsOrgId,
  files,
  updateMeta,
}: {
  serviceId: number | undefined
  searchParamsOrgId: string | undefined
  files: SelectedFile[]
  updateMeta: (id: string, patch: Partial<SelectedFile>) => void
}) => {
  const { showAlert } = useGlobalUI()
  const {
    setUploadStep, setUploadProgress, searchInProgressImage,
    imageProcessData, setImageProcessData, setUploadProgress: _sp,
  } = useImages()
  const profile = useProfileStore((state) => state.profile)
  const { t } = useTranslation('common')

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentMultipartRef = useRef<{ uploadId?: string; fileName?: string; imageId?: string } | null>(null)
  const abortedByUserRef = useRef(false)

  const [imageCreateParam, setImageCreateParam] = useState<any>(null)
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tempResumeKey, setTempResumeKey] = useState<string | null>(null)

  const uploadMultipart = async (
    file: File,
    fileData: SelectedFile,
    fileIndex: number,
    userId: string,
    orgId: string,
  ): Promise<string> => {
    const chunkSize = DEFAULT_CHUNK_SIZE
    const totalParts = Math.ceil(file.size / chunkSize)
    const storageKey = getResumeKey(userId, file)
    setTempResumeKey(storageKey)
    const resumeState = getResumeState(storageKey)

    let uploadId: string
    let itemId: string
    let id: string
    let completedParts: { ETag: string; PartNumber: number }[] = []

    const isResumable =
      resumeState && resumeState.serviceId === String(serviceId) && resumeState.chunkSize === chunkSize

    if (isResumable) {
      uploadId = resumeState.uploadId
      itemId = resumeState.itemId
      id = resumeState.imageId
      completedParts = resumeState.completedParts || []
      currentMultipartRef.current = { uploadId, fileName: file.name, imageId: id }
      setImageCreateParam({
        serviceId: String(serviceId), name: fileData.title || file.name,
        userId, organizationId: orgId, itemId, uploadId, id,
      })
    } else {
      if (imageProcessData) {
        await cancelValidate()
        setImageProcessData(null)
      }
      clearAllResumeStates()

      const startRes = await thaicom.postUploadMultipartStart({
        file_name: file.name, file_size: file.size, file_type: file.type,
        imaging_date: dayjs(fileData.imagingDate).utc().format() || formatDateTimeFromMillis(file.lastModified),
        metadata: fileData.metadata || '', image_type: serviceId as number,
        name: fileData.title || file.name, org_id: orgId,
        tags: fileData.tags ? fileData.tags.split(',').map((t) => t.trim()) : [],
        user_id: userId, chunk_size: chunkSize,
      })
      uploadId = startRes.upload_id
      itemId = startRes.item_id

      const param = {
        serviceId: String(serviceId), name: fileData.title || file.name,
        metadata: fileData.metadata || '',
        photoDate: dayjs(fileData.imagingDate).utc().format() || formatDateTimeFromMillis(file.lastModified),
        chunkSize, chunkAmount: totalParts, fileName: file.name,
        fileSize: file.size, fileType: file.type, userId, organizationId: orgId,
        itemId, uploadId,
        hashtags: fileData.tags ? fileData.tags.split(',').map((t) => t.trim()) : [],
      }
      const created = await image.postUpload(param)
      setImageCreateParam({ ...param, id: created.id })
      id = created.id
      currentMultipartRef.current = { uploadId, fileName: file.name, imageId: id }
      saveResumeState(storageKey, {
        uploadId, itemId, imageId: id, serviceId: String(serviceId), chunkSize, completedParts: [],
      })
    }

    const bytesByPart: Record<number, number> = {}
    completedParts.forEach((p) => {
      const isLast = p.PartNumber === totalParts
      const size = isLast ? file.size % chunkSize || chunkSize : chunkSize
      bytesByPart[p.PartNumber] = size
    })

    const completedPartNumbers = new Set(completedParts.map((p) => p.PartNumber))
    const remainingParts = Array.from({ length: totalParts }, (_, i) => i + 1).filter(
      (num) => !completedPartNumbers.has(num),
    )

    searchInProgressImage?.()
    setLoading(false)

    const partCtx: UploadPartContext = {
      file, uploadId, chunkSize, fileIndex, filesLength: files.length,
      bytesByPart, completedParts, storageKey, itemId, imageId: id,
      serviceId: String(serviceId), abortControllerRef, abortedByUserRef, setUploadProgress,
    }

    const workers = new Array(Math.min(CONCURRENCY, totalParts)).fill(null).map(async () => {
      while (remainingParts.length > 0) {
        const part = remainingParts.shift()
        if (!part) break
        await uploadPart(part, partCtx)
      }
    })

    await Promise.all(workers)

    await thaicom.postUploadMultipartComplete({
      file_name: file.name, upload_id: uploadId,
      parts: completedParts.sort((a, b) => a.PartNumber - b.PartNumber),
    })

    currentMultipartRef.current = null
    clearResumeState(storageKey)
    await image.updateStatus({ id, statusId: String(ImageStatus.inProgress) })
    updateMeta(fileData.id, { uploadProgress: 100, uploadStatus: 'success' })

    return id
  }

  const uploadSinglePart = async (
    file: File,
    fileData: SelectedFile,
    fileIndex: number,
    userId: string,
    orgId: string,
  ): Promise<string> => {
    if (imageProcessData) {
      await cancelValidate()
      setImageProcessData(null)
    }
    clearAllResumeStates()
    currentMultipartRef.current = null

    const uploadResponse = await thaicom.postUpload({
      file_name: file.name, file_size: file.size, file_type: file.type,
      imaging_date: dayjs(fileData.imagingDate).utc().format() || formatDateTimeFromMillis(file.lastModified),
      metadata: fileData.metadata || '', image_type: serviceId as number,
      name: fileData.title || file.name, org_id: orgId,
      tags: fileData.tags ? fileData.tags.split(',').map((t) => t.trim()) : [],
      user_id: userId,
    })

    if (!uploadResponse?.data) throw new Error('Failed to get upload URL')

    const { upload_id, url } = uploadResponse.data

    const param = {
      serviceId: String(serviceId), name: fileData.title || file.name,
      metadata: fileData.metadata || '',
      photoDate: dayjs(fileData.imagingDate).utc().format() || formatDateTimeFromMillis(file.lastModified),
      chunkSize: file.size, chunkAmount: 1, fileName: file.name,
      fileSize: file.size, fileType: file.type, userId, organizationId: orgId,
      itemId: uploadResponse.data.item_id, uploadId: uploadResponse.data.upload_id,
      hashtags: fileData.tags ? fileData.tags.split(',').map((t) => t.trim()) : [],
    }
    const res = await image.postUpload(param)
    setImageCreateParam({ ...param, id: res.id })
    const id = res.id

    searchInProgressImage?.()
    currentMultipartRef.current = { uploadId: uploadResponse.data.upload_id, fileName: file.name, imageId: id }

    if (!abortControllerRef.current) abortControllerRef.current = new AbortController()
    setLoading(false)

    await axios.put(url, file, {
      headers: { 'Content-Type': file.type },
      signal: abortControllerRef.current.signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round(((fileIndex + progressEvent.loaded / progressEvent.total) / files.length) * 100)
          setUploadProgress(progress)
        }
      },
    })

    await thaicom.postUploadComplete({ upload_id })
    await image.updateStatus({ id, statusId: String(ImageStatus.inProgress) })
    updateMeta(fileData.id, { uploadProgress: 100, uploadStatus: 'success' })

    return id
  }

  const cancelValidate = useCallback(async () => {
    if (imageProcessData?.id) {
      try {
        await image.abortImage(imageProcessData.id)
      } catch (err: any) {
        showAlert({ status: 'error', errorCode: err?.message })
      }
    }
  }, [imageProcessData, showAlert])

  const handleUpload = async () => {
    if (files.length === 0 || !serviceId) return

    setUploadProgress(0)
    setIsUploadingFiles(true)

    let id = ''
    setLoading(true)
    try {
      abortedByUserRef.current = false
      if (!profile) {
        showAlert({ status: 'error', errorCode: t('gallery.uploadDialog.error.userNotFound') })
        setUploadStep(null)
        return
      }

      setUploadStep(ImageUploadStep.Upload)
      const userId = profile.id
      const orgId = searchParamsOrgId ? searchParamsOrgId : profile.organizationId

      for (let i = 0; i < files.length; i++) {
        const fileData = files[i]
        const file = fileData.file

        validateMetadata(fileData, showAlert, t)

        if (file.size >= MULTIPART_THRESHOLD) {
          id = await uploadMultipart(file, fileData, i, userId, orgId)
          continue
        } else {
          id = await uploadSinglePart(file, fileData, i, userId, orgId)
        }

        setUploadProgress(100)
      }

      setUploadStep(ImageUploadStep.Validate)
      searchInProgressImage?.()
    } catch (error) {
      console.error('Upload failed:', error)
      if (id && !abortedByUserRef.current) {
        await image.updateStatus({ id, statusId: String(ImageStatus.failed) })
        showAlert({ status: 'error', errorCode: t('gallery.uploadDialog.error.uploadFailed') })
      }
      setUploadStep(null)
    } finally {
      setUploadProgress(0)
      setIsUploadingFiles(false)
    }
  }

  return {
    handleUpload, cancelValidate,
    abortControllerRef, currentMultipartRef, abortedByUserRef,
    imageCreateParam, isUploadingFiles, loading, setLoading, tempResumeKey,
  }
}