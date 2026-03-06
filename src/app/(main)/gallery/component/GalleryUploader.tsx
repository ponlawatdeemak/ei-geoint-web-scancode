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
import image from '@/api/image'
import MetadataEditor from '@/components/common/editor/MetadataEditor'
import { ServiceConfig } from '@interfaces/config'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import Autocomplete from '@mui/material/Autocomplete'
import ListItemText from '@mui/material/ListItemText'
import { useImages } from '@/components/common/images/use-images'
import { ImageUploadStep } from '@/components/common/images/images'
import LinearProgressWithLabel from '@/components/common/display/UploadProgress/LinearProgressWithLabel'
import { useGalleryUpload } from './hooks/useGalleryUpload'
import { toSelectedFile, clearResumeState } from './utils/galleryUploader.utils'
import { ThaicomImageStatus } from '@interfaces/config/thaicom.config'
import { SearchImagesResultItem } from '@interfaces/dto/images'

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

const GalleryUploader: React.FC<GalleryUploaderProps> = ({ serviceId, open, onClose, searchParamsOrgId }) => {
  const inputId = useId()
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'))
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<Array<{ id: string; name: string }>>([])
  const tagFetchTimerRef = useRef<number | null>(null)
  const createdUrlsRef = useRef<string[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)


  const { showAlert, showLoading, hideLoading } = useGlobalUI()
  const {
    uploadStep,
    setUploadStep,
    uploadProgress,
    setUploadProgress,
    setSelectSearchItem,
    searchInProgressImage,
    setCancelUpload,
    searchImage,
    setAction,
    setSelectedImage,
    wssImageData,
    selectedImage,
  } = useImages()

  const { t, i18n } = useTranslation('common')

  const updateMeta = useCallback((id: string, patch: Partial<SelectedFile>) => {
    setFiles((s) => s.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])


  const {
    handleUpload,
    cancelValidate,
    abortControllerRef,
    currentMultipartRef,
    abortedByUserRef,
    imageCreateParam,
    isUploadingFiles,
    loading,
    setLoading,
    tempResumeKey,
  } = useGalleryUpload({
    serviceId: serviceId ?? undefined,
    searchParamsOrgId: searchParamsOrgId ?? undefined,
    files,
    updateMeta,
  })

  const serviceLabel =
    serviceId === ServiceConfig.optical
      ? `Optical ${t('gallery.uploadDialog.and')}${t('gallery.uploadDialog.aerial')}`
      : 'SAR'

  const accept = '.tiff,.tif,.zip'
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

const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const fileList = e.target.files
  if (!fileList || fileList.length === 0) return
  setLoading(true)
  const newFiles: SelectedFile[] = []

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    newFiles.push(await toSelectedFile(file, i, createdUrlsRef))
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
    [updateMeta, files, showAlert, t, tempResumeKey, abortControllerRef, currentMultipartRef, abortedByUserRef],
  )
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

  const handleTagInputChange = useCallback(
    (_: React.SyntheticEvent, inputValue: string, fileId: string) => {
      if (tagFetchTimerRef.current) window.clearTimeout(tagFetchTimerRef.current)
      if (!inputValue || inputValue.length < 2) {
        setTagSuggestions([])
        return
      }
      tagFetchTimerRef.current = window.setTimeout(async () => {
        try {
          const res = await image.getTags(inputValue)
          const target = files.find((f) => f.id === fileId)
          const existing = (target?.tags || '').split(',').map((v) => v.trim())
          const filtered = (res || []).filter((r: { id: string; name: string }) => !existing.includes(r.name))
          setTagSuggestions(filtered)
        } catch (_) {
          setTagSuggestions([])
        }
      }, 250)
    },
    [files],
  )

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
      //   maxWidth={'lg'}
      fullWidth
      fullScreen={isSmallScreen}
      sx={{
        '& .MuiDialog-paper': {
          maxHeight: { xs: '100vh', md: '90vh' },
          maxWidth: { xs: '100vw', md: '50vw' },
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
                          onInputChange={(_, inputValue) => handleTagInputChange(_, inputValue, f.id)}
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
