'use client'

import React, { useId, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Button,
  Box,
  TextField,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import ImageIcon from '@mui/icons-material/Image'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import InputLabel from '@/components/common/input/InputLabel'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useTranslation } from 'react-i18next'
import thaicom from '@/api/thaicom'
import image from '@/api/image'
import axios from 'axios'
import MetadataEditor from '@/components/common/editor/MetadataEditor'
import { ImageStatus, ServiceConfig } from '@interfaces/config'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import Autocomplete from '@mui/material/Autocomplete'
// Checkbox removed - not used in this component anymore
import ListItemText from '@mui/material/ListItemText'
import { useProfileStore } from '@/hook/useProfileStore'
import { formatDateTimeFromMillis } from '@/utils/formatDate'
import { useImages } from '@/components/common/images/use-images'
import { ImageUploadStep } from '@/components/common/images/images'
import { SearchImagesResultItem } from '@interfaces/dto/images'
import LinearProgressWithLabel from '@/components/common/display/UploadProgress/LinearProgressWithLabel'
import { ThaicomImageStatus } from '@interfaces/config/thaicom.config'
import { nanoid } from 'nanoid'

dayjs.extend(utc)
dayjs.extend(timezone)

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

type TagOption = { id: string; name: string } | string

interface GalleryUploaderProps {
  serviceId: ServiceConfig | null
  open: boolean
  onClose: () => void
  searchParamsOrgId?: string | null
}
// 100MB
const MULTIPART_THRESHOLD = 100 * 1024 * 1024 // 100MB
const DEFAULT_CHUNK_SIZE = 128 * 1024 * 1024 // 128MB
// run with concurrency pool of at least 10
const CONCURRENCY = 4
const MAX_PART_RETRIES = 3 // Max retry attempts per part

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

const saveResumeState = (key: string, state: ResumeState) => {
  localStorage.setItem(key, JSON.stringify(state))
}

const clearResumeState = (key: string) => {
  // clear on complete
  // clear on cancel
  // clear on new upload with another file
  localStorage.removeItem(key)
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

const GalleryUploader: React.FC<GalleryUploaderProps> = ({ serviceId, open, onClose, searchParamsOrgId }) => {
  const inputId = useId()
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'))
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [tempResumeKey, setTempResumeKey] = useState<string | null>(null)

  const [imageCreateParam, setImageCreateParam] = useState<any>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  // Track the current multipart upload so we can abort it server-side if user cancels
  const currentMultipartRef = useRef<{
    uploadId?: string
    fileName?: string
    imageId?: string
  } | null>(null)
  // Flag to indicate cancel was initiated by user to avoid marking image as failed
  const abortedByUserRef = useRef(false)
  const { showAlert, showLoading, hideLoading } = useGlobalUI()
  const {
    uploadStep,
    setUploadStep,
    uploadProgress,
    setUploadProgress,
    setSelectSearchItem,
    searchInProgressImage,
    setCancelUpload,
    imageProcessData,
    setImageProcessData,
    searchImage,
    setAction,
    setSelectedImage,
    wssImageData,
    setWssImageData,
    selectedImage,
  } = useImages()

  const accept = '.tiff,.tif,.zip'
  const createdUrlsRef = useRef<string[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [tagSuggestions, setTagSuggestions] = useState<Array<{ id: string; name: string }>>([])
  const tagFetchTimerRef = useRef<number | null>(null)
  const profile = useProfileStore((state) => state.profile)
  const { t, i18n } = useTranslation('common')

  const serviceLabel =
    serviceId === ServiceConfig.optical
      ? `Optical ${t('gallery.uploadDialog.and')}${t('gallery.uploadDialog.aerial')}`
      : 'SAR'

  const isUploading = useMemo(() => uploadStep !== null, [uploadStep])

  // Warn user before closing/refreshing browser during file upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploadingFiles) {
        e.preventDefault()
        // Chrome requires returnValue to be set
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isUploadingFiles])

  useEffect(() => {
    return () => {
      for (const u of createdUrlsRef.current) {
        try {
          URL.revokeObjectURL(u)
        } catch (_) {
          // ignore
        }
      }
    }
  }, [])

  /* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TIFF decoding and preview logic requires branching; refactor later */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    setLoading(true)
    const newFiles: SelectedFile[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const kind: SelectedFile['kind'] = ext === 'zip' ? 'zip' : ext === 'tiff' || ext === 'tif' ? 'tiff' : 'other'
      const id = `${Date.now()}-${i}-${nanoid()}`

      let url: string | undefined

      if (kind === 'tiff') {
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
              const ctx = canvas.getContext('2d')
              if (ctx) {
                const imageData = new ImageData(clamped, width, height)
                ctx.putImageData(imageData, 0, 0)
                url = canvas.toDataURL()
              }
            }
          }
        } catch {
          // decoding failed; we'll fall back to object URL below
        }
      }

      if (!url) {
        url = kind === 'zip' ? undefined : URL.createObjectURL(file)
        if (url?.startsWith('blob:')) createdUrlsRef.current.push(url)
      }
      const imagingDate = formatDateTimeFromMillis(file.lastModified, false)
      newFiles.push({
        id,
        file,
        url,
        kind,
        imagingDate,
        title: file.name,
        metadata: '',
      })
    }

    setFiles((s) => [...s, ...newFiles])
    if (inputRef.current) inputRef.current.value = ''
    setLoading(false)
  }

  const removeFile = (id: string) => {
    setFiles((s) => {
      const toRemove = s.find((f) => f.id === id)
      if (toRemove?.url?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(toRemove.url)
        } catch {
          // Ignore revoke errors
        }
        createdUrlsRef.current = createdUrlsRef.current.filter((u) => u !== toRemove.url)
      }
      const updated = s.filter((f) => f.id !== id)
      if (updated.length === 0 && inputRef.current) inputRef.current.value = ''
      return updated
    })
  }

  const updateMeta = useCallback((id: string, patch: Partial<SelectedFile>) => {
    setFiles((s) => s.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  /* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multipart orchestration is inherently multi-step; will modularize later */
  const handleUpload = async () => {
    if (files.length === 0) return
    if (!serviceId) return

    setUploadProgress(0)
    setWssImageData(null)
    setIsUploadingFiles(true)

    let id = ''
    setLoading(true)
    try {
      abortedByUserRef.current = false
      if (!profile) {
        showAlert({
          status: 'error',
          errorCode: t('gallery.uploadDialog.error.userNotFound'),
        })
        setUploadStep(null)
        return
      }
      setUploadStep(ImageUploadStep.Upload)
      const userId = profile.id
      const orgId = searchParamsOrgId ? searchParamsOrgId : profile.organizationId

      for (let i = 0; i < files.length; i++) {
        const fileData = files[i]
        const file = fileData.file

        // Validate metadata if present: size limit and basic well-formed check
        if (fileData.metadata) {
          const metaSize = new Blob([fileData.metadata]).size
          const MAX_META = 1024 * 1024 // 1MB
          if (metaSize > MAX_META) {
            showAlert({
              status: 'error',
              errorCode: t('gallery.uploadDialog.error.metadataTooLarge', {
                size: Math.round(MAX_META / 1024),
              }),
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
            showAlert({
              status: 'error',
              errorCode: t('gallery.uploadDialog.error.metadataInvalid'),
            })
            throw e
          }
        }

        // Step 3: Check file size and choose flow
        if (file.size >= MULTIPART_THRESHOLD) {
          // ===== Multipart upload flow =====
          const chunkSize = DEFAULT_CHUNK_SIZE
          const totalParts = Math.ceil(file.size / chunkSize)
          const storageKey = getResumeKey(userId, file)
          setTempResumeKey(storageKey)
          const resumeState = getResumeState(storageKey)

          let uploadId: string
          let itemId: string
          // Track completed parts from resume state or start fresh
          // Resume if we have a matching uploadId and completed parts
          const isResumable =
            resumeState && resumeState.serviceId === String(serviceId) && resumeState.chunkSize === chunkSize

          let completedParts: { ETag: string; PartNumber: number }[] = []

          if (isResumable) {
            uploadId = resumeState.uploadId
            itemId = resumeState.itemId
            id = resumeState.imageId
            completedParts = resumeState.completedParts || []

            // Set for context (cancellation)
            currentMultipartRef.current = {
              uploadId,
              fileName: file.name,
              imageId: id,
            }

            // Restore Image Create Param for UI closure if needed
            setImageCreateParam({
              serviceId: String(serviceId),
              name: fileData.title || file.name,
              userId,
              organizationId: orgId,
              itemId: itemId,
              uploadId: uploadId,
              id: id,
            })
          } else {
            if (imageProcessData) {
              // cancel ของที่เคยอัปโหลดแต่โดน hard reload หรือ error ระหว่างอัปโหลดไฟล์
              await cancelValidate()
              setImageProcessData(null)
            }
            // Start multipart to receive upload_id and item_id
            clearAllResumeStates()
            const paramTC = {
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              imaging_date: dayjs(fileData.imagingDate).utc().format() || formatDateTimeFromMillis(file.lastModified),
              metadata: fileData.metadata || '',
              image_type: serviceId,
              name: fileData.title || file.name,
              org_id: orgId,
              tags: fileData.tags ? fileData.tags.split(',').map((t) => t.trim()) : [],
              user_id: userId,
              chunk_size: chunkSize,
            }
            const startRes = await thaicom.postUploadMultipartStart(paramTC)

            uploadId = startRes.upload_id
            itemId = startRes.item_id

            // Create image entity (track status and parts)
            const param = {
              serviceId: String(serviceId),
              name: fileData.title || file.name,
              metadata: fileData.metadata || '',
              photoDate: dayjs(fileData.imagingDate).utc().format() || formatDateTimeFromMillis(file.lastModified),
              chunkSize: chunkSize,
              chunkAmount: totalParts,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              userId,
              organizationId: orgId,
              itemId: itemId,
              uploadId: uploadId,
              hashtags: fileData.tags ? fileData.tags.split(',').map((t) => t.trim()) : [],
            }
            const created = await image.postUpload(param)
            setImageCreateParam({
              ...param,
              id: created.id,
            })

            id = created.id

            // store current multipart upload info so cancel can call abort on server
            currentMultipartRef.current = {
              uploadId,
              fileName: file.name,
              imageId: id,
            }

            // Validate start state
            saveResumeState(storageKey, {
              uploadId,
              itemId,
              imageId: id,
              serviceId: String(serviceId),
              chunkSize,
              completedParts: [],
            })
          }

          const bytesByPart: Record<number, number> = {}

          // Initialize progress for resumed parts
          completedParts.forEach((p) => {
            const isLast = p.PartNumber === totalParts
            const size = isLast ? file.size % chunkSize || chunkSize : chunkSize
            bytesByPart[p.PartNumber] = size
          })

          const uploadPart = async (partNumber: number, retryCount = 0): Promise<void> => {
            try {
              const start = (partNumber - 1) * chunkSize
              const end = Math.min(start + chunkSize, file.size)
              const chunk = file.slice(start, end)

              const upRes = await thaicom.postUploadMultipartUpload({
                file_name: file.name,
                part_number: partNumber,
                upload_id: uploadId,
              })

              const url = upRes.url
              if (!abortControllerRef.current) {
                abortControllerRef.current = new AbortController()
              }
              const putResp = await axios.put(url, chunk, {
                headers: { 'Content-Type': 'application/octet-stream' },
                signal: abortControllerRef.current.signal,
                onUploadProgress: (ev) => {
                  // track bytes uploaded per-part; ev.loaded is absolute for this request
                  if (typeof ev.loaded === 'number') {
                    bytesByPart[partNumber] = ev.loaded
                    const totalLoaded = Object.values(bytesByPart).reduce((a, b) => a + b, 0)
                    const fileFraction = totalLoaded / file.size
                    const overall = Math.round(((i + fileFraction) / files.length) * 100)
                    const progress = Math.min(99, overall)
                    setUploadProgress(progress)
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

                // Save progress with read-modify-write to support concurrent updates
                const currentResumeState = getResumeState(storageKey)
                const existingParts = currentResumeState?.completedParts || []
                const isExists = existingParts.some((p) => p.PartNumber === partNumber)

                saveResumeState(storageKey, {
                  uploadId,
                  itemId,
                  imageId: id,
                  serviceId: String(serviceId),
                  chunkSize,
                  completedParts: isExists ? existingParts : [...existingParts, partInfo],
                })
              }
            } catch (error: any) {
              // Check if error is due to user abort
              if (axios.isCancel(error) || error?.name === 'CanceledError' || abortedByUserRef.current) {
                throw error
              }

              // Retry logic for part upload
              if (retryCount < MAX_PART_RETRIES) {
                console.warn(`Part ${partNumber} failed, retrying (${retryCount + 1}/${MAX_PART_RETRIES})...`, error)
                // Exponential backoff: wait 1s, 2s, 4s before retry
                await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** retryCount))
                // Reset progress for this part before retry
                bytesByPart[partNumber] = 0
                return uploadPart(partNumber, retryCount + 1)
              } else {
                console.error(`Part ${partNumber} failed after ${MAX_PART_RETRIES} retries`)
                throw error // Re-throw after max retries
              }
            }
          }

          const completedPartNumbers = new Set(completedParts.map((p) => p.PartNumber))
          const remainingParts = Array.from({ length: totalParts }, (_, i) => i + 1).filter(
            (num) => !completedPartNumbers.has(num),
          )
          searchInProgressImage?.()
          setLoading(false) // enable close button
          const workers = new Array(Math.min(CONCURRENCY, totalParts)).fill(null).map(async () => {
            while (remainingParts.length > 0) {
              const part = remainingParts.shift()
              if (!part) break
              await uploadPart(part)
            }
          })

          await Promise.all(workers)

          // Complete multipart
          await thaicom.postUploadMultipartComplete({
            file_name: file.name,
            upload_id: uploadId,
            parts: completedParts.sort((a, b) => a.PartNumber - b.PartNumber),
          })

          // clear current multipart tracking after completion
          currentMultipartRef.current = null
          clearResumeState(storageKey)

          // Set to inProgress for backend pipeline
          await image.updateStatus({
            id,
            statusId: String(ImageStatus.inProgress),
          })

          updateMeta(fileData.id, {
            uploadProgress: 100,
            uploadStatus: 'success',
          })
          continue // proceed to next file
        } else {
          if (imageProcessData) {
            // cancel ของที่เคยอัปโหลดแต่โดน hard reload หรือ error ระหว่างอัปโหลดไฟล์
            await cancelValidate()
            setImageProcessData(null)
          }
          clearAllResumeStates()
          currentMultipartRef.current = null
          // Step 4: Get upload URL from API
          const uploadResponse = await thaicom.postUpload({
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            imaging_date: dayjs(fileData.imagingDate).utc().format() || formatDateTimeFromMillis(file.lastModified),
            metadata: fileData.metadata || '',
            image_type: serviceId,
            name: fileData.title || file.name,
            org_id: orgId,
            tags: fileData.tags ? fileData.tags.split(',').map((t) => t.trim()) : [],
            user_id: userId,
          })

          if (!uploadResponse?.data) {
            throw new Error('Failed to get upload URL')
          }

          const { upload_id, url } = uploadResponse.data

          // Step 5: Create entity in images (handled by backend in postUpload)
          // The backend should create the record with status = uploadPending
          const param = {
            serviceId: String(serviceId),
            name: fileData.title || file.name,
            metadata: fileData.metadata || '',
            photoDate: dayjs(fileData.imagingDate).utc().format() || formatDateTimeFromMillis(file.lastModified),
            chunkSize: file.size,
            chunkAmount: 1,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            userId,
            organizationId: orgId,
            itemId: uploadResponse.data.item_id,
            uploadId: uploadResponse.data.upload_id,
            hashtags: fileData.tags ? fileData.tags.split(',').map((t) => t.trim()) : [],
          }
          const res = await image.postUpload(param)
          setImageCreateParam({
            ...param,
            id: res.id,
          })
          id = res.id

          searchInProgressImage?.()
          // track that we've created the image entity (id) so cancel will update status
          currentMultipartRef.current = {
            uploadId: uploadResponse.data.upload_id,
            fileName: file.name,
            imageId: id,
          }

          // Step 6: Upload file to S3 using presigned URL
          if (!abortControllerRef.current) {
            abortControllerRef.current = new AbortController()
          }
          setLoading(false) // enable close button
          await axios.put(url, file, {
            headers: { 'Content-Type': file.type },
            signal: abortControllerRef.current.signal,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round(((i + progressEvent.loaded / progressEvent.total) / files.length) * 100)
                setUploadProgress(progress)
              }
            },
          })

          await thaicom.postUploadComplete({ upload_id })
          await image.updateStatus({
            id,
            statusId: String(ImageStatus.inProgress),
          })
          // Update file status
          updateMeta(fileData.id, {
            uploadProgress: 100,
            uploadStatus: 'success',
          })
        }

        setUploadProgress(100)
      }

      setUploadStep(ImageUploadStep.Validate)
      searchInProgressImage?.()
    } catch (error) {
      console.error('Upload failed:', error)

      // Step 8: Handle failure
      if (id && !abortedByUserRef.current) {
        await image.updateStatus({ id, statusId: String(ImageStatus.failed) })

        showAlert({
          status: 'error',
          errorCode: t('gallery.uploadDialog.error.uploadFailed'),
        })
      }
      setUploadStep(null)
    } finally {
      setUploadProgress(0)
      setIsUploadingFiles(false)
    }
  }

  const cancelUpload = useCallback(
    async (
      imgInfo: {
        imageId: string
        uploadId: string
        fileName: string
      } | null = null,
    ) => {
      // Cancel in-flight request (multipart or single)

      try {
        abortControllerRef.current?.abort()
      } catch (err: any) {
        console.error('Failed to abort upload request')
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      }
      const info = currentMultipartRef.current || imgInfo
      if (info?.imageId) {
        abortedByUserRef.current = true
        // if (info?.uploadId) {
        try {
          // await thaicom.postUploadMultipartAbort({ file_name: info.fileName || '', upload_id: info.uploadId })

          await image.abortImage(info.imageId)
        } catch (err: any) {
          console.error('Failed to abort multipart upload on server')
          showAlert({
            status: 'error',
            errorCode: err?.message,
          })
        }
        // }

        // try {
        //   // await image.updateStatus({ id: info.imageId, statusId: String(ImageStatus.aborted) })

        //   await image.abortImage(info.imageId)
        // } catch (err: any) {
        //   console.error('Failed to update image aborted status')
        //   showAlert({
        //     status: 'error',
        //     errorCode: err?.message,
        //   })
        // }

        showAlert({
          status: 'error',
          title: t('gallery.uploadDialog.success.uploadCancelled'),
        })

        // reset upload status/progress for the file so re-upload starts fresh
        if (info.fileName) {
          const target = files.find((f) => f.file.name === info.fileName)
          if (target) updateMeta(target.id, { uploadStatus: 'idle', uploadProgress: 0 })
        }
      }

      // clear multipart tracking and reset UI to pre-upload state (keep selected files)
      currentMultipartRef.current = null
      // clear abort controller so future uploads create a fresh one
      abortControllerRef.current = null

      if (tempResumeKey) {
        clearResumeState(tempResumeKey)
      }
    },
    [updateMeta, files, showAlert, t, tempResumeKey],
  )

  const cancelValidate = useCallback(async () => {
    if (imageProcessData?.id) {
      try {
        await image.abortImage(imageProcessData.id)
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      }
    }
  }, [imageProcessData, showAlert])

  const handleCancel = useCallback(() => {
    showAlert({
      status: 'confirm-cancel',
      showCancel: true,
      title: t('gallery.alert.cancelTitle'),
      content: t('gallery.alert.cancelContent'),
      onConfirm: async () => {
        showLoading()
        if (uploadStep === ImageUploadStep.Upload) {
          await cancelUpload()
        } else if (uploadStep === ImageUploadStep.Validate) {
          await cancelValidate()
        } else if (uploadStep === null && selectedImage) {
          // If not uploading but an image is selected (probably from previous upload), clear it
          // Fix can't delete image after upload error from refresh browser
          await cancelUpload({
            imageId: selectedImage.id,
            uploadId: selectedImage.uploadId || '',
            fileName: selectedImage.fileName || '',
          })
        }

        setUploadStep(null)
        setUploadProgress(0)
        setAction(null)
        setSelectSearchItem(null)
        setSelectedImage(null)
        hideLoading()
        searchInProgressImage?.()
        searchImage?.()
      },
    })
  }, [
    uploadStep,
    cancelUpload,
    cancelValidate,
    t,
    showAlert,
    showLoading,
    hideLoading,
    setUploadStep,
    setUploadProgress,
    setAction,
    setSelectSearchItem,
    setSelectedImage,
    searchInProgressImage,
    searchImage,
    selectedImage,
  ])

  useEffect(() => {
    setCancelUpload(handleCancel)
  }, [handleCancel, setCancelUpload])

  const handleClose = useCallback(() => {
    // Step 9: Reset state
    if (files.length > 0) setFiles([])
    if (inputRef.current) inputRef.current.value = ''
    onClose()
  }, [onClose, files])

  // Disable upload when there are no files, or any file is missing required fields
  const isUploadDisabled =
    files.length === 0 ||
    files.some((f) => !f.title || f.title.toString().trim() === '' || (f.kind !== 'zip' && !f.imagingDate))

  const handleCloseWithProcess = useCallback(() => {
    if (imageCreateParam?.itemId) {
      setSelectSearchItem({
        id: imageCreateParam.itemId,
      } as SearchImagesResultItem)
    }

    searchInProgressImage?.()
    handleClose()
  }, [imageCreateParam, handleClose, setSelectSearchItem, searchInProgressImage])

  useEffect(() => {
    const isComplete = wssImageData?.data?.processing_status === ThaicomImageStatus.READY
    const isError =
      wssImageData?.data?.processing_status === ThaicomImageStatus.FAILED_CONVERT_COG ||
      wssImageData?.data?.processing_status === ThaicomImageStatus.FAILED_EXTRACT ||
      wssImageData?.data?.processing_status === ThaicomImageStatus.FAILED_METADATA ||
      wssImageData?.data?.processing_status === ThaicomImageStatus.FAILED_UPLOAD ||
      wssImageData?.data?.processing_status === ThaicomImageStatus.FAILED_VALIDATE_PATTERN
    if (open && imageCreateParam && isComplete) {
      searchImage?.()
      handleClose()
    } else if (isError) {
      handleClose()
      setSelectedImage(null)
    }
  }, [open, wssImageData, searchImage, handleClose, imageCreateParam, setSelectedImage])

  return (
    <Dialog
      open={open}
      maxWidth='lg'
      fullWidth
      fullScreen={isSmallScreen}
      sx={{
        '& .MuiDialog-paper': {
          maxHeight: { xs: '100vh', md: '90vh' },
          m: { xs: 0, md: 2 },
        },
      }}
    >
      <DialogTitle className='px-4 py-4 text-left sm:px-6 sm:py-5'>
        {t('gallery.uploadDialog.title', { service: serviceLabel })}
      </DialogTitle>
      <DialogContent className='px-4 py-4 sm:px-6 sm:py-5 2xl:px-8 2xl:py-6'>
        <div className='mx-auto w-full max-w-2xl'>
          <input
            ref={inputRef}
            id={inputId}
            type='file'
            accept={accept}
            className='hidden'
            multiple
            onChange={handleFileSelect}
            disabled={loading || files.length > 0 || isUploading}
          />
          {/* File Selection Area */}
          {!isUploading && (
            <label
              htmlFor={inputId}
              className='block'
              aria-label={`${t('gallery.uploadDialog.selectFile')} (${serviceLabel})`}
            >
              <div className='relative flex w-full items-center justify-center rounded-lg border-2 border-blue-300 border-dashed bg-white/50 p-4 sm:p-8'>
                <div className='flex flex-col items-center'>
                  <Button
                    component='span'
                    variant='contained'
                    color='primary'
                    className='mb-3 normal-case'
                    disabled={loading || files.length > 0}
                    startIcon={<CloudUploadIcon />}
                    size={isSmallScreen ? 'medium' : 'large'}
                  >
                    {loading ? (
                      <span className='flex items-center gap-2'>
                        <CircularProgress size={16} color='inherit' />
                        {t('gallery.uploadDialog.reading')}
                      </span>
                    ) : (
                      t('gallery.uploadDialog.selectFile')
                    )}
                  </Button>
                  <div className='pt-2 text-center text-(--color-text-secondary) text-xs sm:text-sm'>
                    {t('gallery.uploadDialog.supportedFiles')}
                  </div>
                </div>
              </div>
            </label>
          )}
          <div className='mt-4 space-y-3 sm:mt-6 sm:space-y-4'>
            {files.map((f) => (
              <Box key={f.id} className='relative rounded-lg bg-(--color-background-light) p-3 pr-2 shadow-sm sm:p-4'>
                {!isUploading && (
                  <div className='absolute top-2 right-2'>
                    <IconButton
                      color='error'
                      aria-label='delete'
                      onClick={() => removeFile(f.id)}
                      disabled={isUploading}
                      size='small'
                    >
                      <DeleteIcon />
                    </IconButton>
                  </div>
                )}

                <div className='flex flex-col items-center gap-3 pr-8 md:flex-row md:items-start md:gap-4'>
                  <div className='shrink-0'>
                    {f.kind === 'zip' ? (
                      <div className='flex flex-col items-center gap-1'>
                        <FolderZipIcon
                          className='text-[#FB923C]'
                          sx={{ fontSize: { xs: 56, sm: 72 } }}
                          aria-hidden='true'
                        />
                        <div className='text-center font-normal text-xs sm:text-sm'>ZIP</div>
                      </div>
                    ) : (
                      <div className='flex flex-col items-center gap-1'>
                        <ImageIcon
                          className='text-[#0E94FA]'
                          sx={{ fontSize: { xs: 56, sm: 72 } }}
                          aria-hidden='true'
                        />
                        <div className='text-center font-normal text-xs sm:text-sm'>TIFF</div>
                      </div>
                    )}
                  </div>

                  <div className='flex w-full grow flex-col gap-2 md:w-[80%]'>
                    {isUploading ? (
                      // Compact read-only summary to show while uploading
                      <div className='rounded-md p-2 sm:p-4'>
                        <div className='mb-1 pb-1'>
                          <span className='mr-2 text-(--color-text-secondary) text-xs sm:text-sm'>
                            {t('gallery.uploadDialog.imageName')}:
                          </span>
                          <span className='font-semibold text-sm sm:text-base'>{f.title}</span>
                        </div>

                        {f.kind !== 'zip' && (
                          <div className='mb-2'>
                            <span className='mr-2 text-(--color-text-secondary) text-xs sm:text-sm'>
                              {t('gallery.uploadDialog.imagingDate')}:
                            </span>
                            <span className='text-xs sm:text-sm'>
                              {(() => {
                                const lang = i18n.language || 'en'
                                const hasImaging = !!f.imagingDate
                                const dateVal = hasImaging ? dayjs(f.imagingDate) : dayjs(f.file.lastModified)
                                const includeTime = !hasImaging || (hasImaging && (f.imagingDate || '').length > 10)
                                if (lang.startsWith('th')) {
                                  return includeTime
                                    ? dateVal.locale('th').format('D MMM BBBB HH:mm')
                                    : dateVal.locale('th').format('D MMM BBBB')
                                }
                                return includeTime ? dateVal.format('DD MMM YYYY HH:mm') : dateVal.format('DD MMM YYYY')
                              })()}
                            </span>
                          </div>
                        )}

                        <div className='flex flex-wrap items-center gap-1'>
                          <span className='mr-1 text-(--color-text-secondary) text-xs sm:text-sm'>
                            {t('gallery.uploadDialog.hashtags')}:
                          </span>
                          {(() => {
                            const tags = (f.tags || '')
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean)

                            if (tags.length === 0) {
                              return <span className='text-xs sm:text-sm'>-</span>
                            }

                            return tags.map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size='small'
                                className='rounded-full bg-primary py-0.5 text-white text-xs sm:text-sm'
                              />
                            ))
                          })()}
                        </div>
                      </div>
                    ) : (
                      // Editable form when not uploading
                      <>
                        <InputLabel required htmlFor={`title-${f.id}`}>
                          {t('gallery.uploadDialog.imageName')}
                        </InputLabel>
                        <TextField
                          size='small'
                          value={f.title}
                          onChange={(e) => updateMeta(f.id, { title: e.target.value })}
                          className='w-full bg-white'
                        />

                        {f.kind !== 'zip' && (
                          <>
                            <InputLabel required>{t('gallery.uploadDialog.imagingDate')}</InputLabel>
                            <DateTimePicker
                              value={f.imagingDate ? dayjs(f.imagingDate) : null}
                              format='DD MMM YYYY HH:mm'
                              timeSteps={{ minutes: 1 }}
                              onChange={(v) =>
                                updateMeta(f.id, {
                                  imagingDate: v ? v.format('YYYY-MM-DD HH:mm:ss') : null,
                                })
                              }
                              slotProps={{
                                textField: {
                                  size: 'small',
                                  fullWidth: true,
                                },
                              }}
                              className='bg-white'
                            />
                          </>
                        )}

                        <InputLabel htmlFor={`tags-${f.id}`}>{t('gallery.uploadDialog.hashtags')}</InputLabel>
                        <Autocomplete
                          multiple
                          freeSolo
                          disableCloseOnSelect
                          options={tagSuggestions.filter(
                            (s) =>
                              !(f.tags || '')
                                .split(',')
                                .map((v) => v.trim())
                                .includes(s.name),
                          )}
                          getOptionLabel={(opt: TagOption) => (typeof opt === 'string' ? opt : opt.name)}
                          value={(f.tags || '')
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .map((name) => ({ id: name, name }))}
                          onChange={(_, value: TagOption[]) => {
                            const normalized = value.map((v: TagOption) =>
                              typeof v === 'string' ? { id: v, name: v } : v,
                            )
                            updateMeta(f.id, {
                              tags: normalized.map((n: { id: string; name: string }) => n.name).join(','),
                            })
                          }}
                          onInputChange={(_, inputValue) => {
                            if (tagFetchTimerRef.current) window.clearTimeout(tagFetchTimerRef.current)
                            if (inputValue && inputValue.length >= 2) {
                              tagFetchTimerRef.current = window.setTimeout(async () => {
                                try {
                                  const res = await image.getTags(inputValue)
                                  const existing = (f.tags || '').split(',').map((v) => v.trim())
                                  const filtered = (res || []).filter(
                                    (r: { id: string; name: string }) => !existing.includes(r.name),
                                  )
                                  setTagSuggestions(filtered)
                                } catch (_) {
                                  setTagSuggestions([])
                                }
                              }, 250)
                            } else {
                              setTagSuggestions([])
                            }
                          }}
                          renderOption={(props, option: TagOption) => (
                            <li
                              {...props}
                              key={
                                (typeof option === 'string' ? option : option.id) ||
                                (typeof option === 'string' ? option : option.name)
                              }
                              className='flex items-center gap-2 pl-4'
                            >
                              <ListItemText primary={typeof option === 'string' ? option : option.name} />
                            </li>
                          )}
                          renderInput={(params) => <TextField {...params} size='small' className='bg-white' />}
                        />

                        {serviceId === ServiceConfig.sar && f.kind === 'tiff' && (
                          <div className=''>
                            <InputLabel htmlFor={`metadata-${f.id}`}>{t('gallery.uploadDialog.metadata')}</InputLabel>
                            <MetadataEditor
                              value={f.metadata || ''}
                              onChange={(v) => updateMeta(f.id, { metadata: v })}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Box>
            ))}
          </div>
          {/* Upload Progress */}
          {isUploading && <LinearProgressWithLabel uploadStep={uploadStep} value={uploadProgress} />}
        </div>
      </DialogContent>
      <DialogActions className='gap-2 px-4 py-3 sm:flex-row sm:gap-0 sm:px-6 sm:py-4'>
        {isUploading ? (
          <>
            <Button disabled={loading} onClick={handleCancel} color='inherit'>
              {t('button.cancel')}
            </Button>
            <Button disabled={!uploadStep || loading} onClick={handleCloseWithProcess} color='primary'>
              {t('button.close')}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleClose}>{t('button.close')}</Button>
            <Button onClick={handleUpload} variant='contained' color='primary' disabled={isUploadDisabled}>
              {t('gallery.uploadDialog.upload')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default GalleryUploader
