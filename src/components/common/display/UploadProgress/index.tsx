import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import service from '@/api'
import { useImages } from '@/components/common/images/use-images'
import { ImageStatus } from '@interfaces/config'
import { useQuery } from '@tanstack/react-query'
import { useProfileStore } from '@/hook/useProfileStore'
import { Chip, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material'
import { Minimize, OpenInFull } from '@mui/icons-material'
import classNames from 'classnames'

import { UploadProgressTifIcon, UploadProgressZipIcon } from './UploadProgressIcon'
import { useTranslation } from 'react-i18next'
import { ThaicomImageStatus } from '@interfaces/config/thaicom.config'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { usePathname } from 'next/navigation'
import { checkIsInProgress, ImageUploadStep } from '../../images/images'
import LinearProgressWithLabel from './LinearProgressWithLabel'
import { SearchImagesResultItem } from '@interfaces/dto/images'

const UploadProgress = () => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<string[]>([])

  const {
    imageProcessData,
    setImageProcessData,

    setSelectSearchItem,
    selectedImage,
    setSelectedImage,
    uploadStep,
    uploadProgress,
    setSearchInProgressImage,
    searchImage,
    setUploadStep,
    wssImageData,
    setWssImageData,
  } = useImages()
  const { profile } = useProfileStore()
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const pathname = usePathname()

  const wss = React.useRef<WebSocket>(null)
  const statusInterval = React.useRef<NodeJS.Timeout | null>(null)

  const isShowProgress = useMemo(() => {
    // hide progress bar on gallery page
    if (pathname.includes('/gallery')) {
      return false
    }

    const isInProgress = checkIsInProgress(Number(imageProcessData?.statusId))
    if (imageProcessData && isInProgress && uploadStep !== null) {
      return true
    }
    return false
  }, [imageProcessData, pathname, uploadStep])

  const { data: imageData, refetch: refetchImages } = useQuery({
    queryKey: ['get-images-in-progress'],
    queryFn: ({ signal }) => service.image.getInprogress({ signal }),
  })

  // keep refetch function to zustand
  useEffect(() => {
    setSearchInProgressImage(refetchImages)
  }, [refetchImages, setSearchInProgressImage])

  // store data to zustand
  useEffect(() => {
    setImageProcessData(imageData)
  }, [imageData, setImageProcessData])

  useEffect(() => {
    if (
      uploadStep === null &&
      imageProcessData &&
      String(imageProcessData.statusId) === String(ImageStatus.inProgress)
    ) {
      // ถ้า  hard reload เข้ามาจะดูสถานะของ image แล้ว set uploadStep
      setUploadStep(ImageUploadStep.Validate)
    }
  }, [imageProcessData, setUploadStep, uploadStep])

  const wssUrl = useMemo(() => {
    if (imageProcessData && profile) {
      return `${process.env.NEXT_PUBLIC_WSS_UPLOAD_URL}/${imageProcessData.uploadId}?user_id=${profile.id}`
    }
    return ''
  }, [imageProcessData, profile])

  // update image to completed status
  const updateProgressCompleted = useCallback(
    async (id: string) => {
      if (imageProcessData) {
        try {
          await service.image.updateProcess({ id, statusId: String(ImageStatus.completed) })
        } catch (error: any) {
          showAlert({ status: 'error', errorCode: error?.message })
          console.error('Error updateProgressCompleted:', error)
        }
      }
    },
    [imageProcessData, showAlert],
  )

  const createInterval = useCallback((wss: WebSocket) => {
    const interval = setInterval(() => {
      if (wss && wss.readyState === WebSocket.OPEN) {
        const msg = JSON.stringify({ type: 'get_status' })
        wss.send(msg)
        setMessages((prev) => [...prev, `[SENT]: ${msg}`])
      }
    }, 10_000)
    statusInterval.current = interval
    return interval
  }, [])

  const removeInterval = useCallback(() => {
    if (statusInterval.current) {
      clearInterval(statusInterval.current)
      statusInterval.current = null
    }
  }, [])

  /**
   * useEffect hook to manage the WebSocket connection lifecycle
   */
  useEffect(() => {
    const isUploadCompleted = String(imageProcessData?.statusId) === String(ImageStatus.inProgress)
    if (isUploadCompleted && wssUrl) {
      // 1. Establish connection
      wss.current = new WebSocket(wssUrl)

      // 2. Connection open handler
      wss.current.onopen = () => {
        setMessages((prev) => [...prev, '[SYSTEM]: Connection established.'])
      }

      // 3. Message received handler
      wss.current.onmessage = (event) => {
        const tempData = JSON.parse(event.data)
        if (tempData.type === 'connection_config') {
          return
        }
        setWssImageData(tempData)
        setMessages((prev) => [...prev, `[RECEIVED]: ${event.data}`])
      }

      // 4. Error handler
      wss.current.onerror = (error) => {
        console.error('WebSocket error:', error)

        setMessages((prev) => [...prev, `[SYSTEM]: Connection Error! Check console.`])
      }

      // 5. Connection closed handler
      wss.current.onclose = (event) => {
        setMessages((prev) => [...prev, `[SYSTEM]: Connection closed (Code: ${event.code})(Reason: ${event.reason}).`])
        // After closing, clear the ref to allow a fresh connection on re-mount/re-open logic
        wss.current = null
      }

      createInterval(wss.current)

      // 6. Cleanup function (runs when the component unmounts)
      return () => {
        if (wss.current) {
          // Close the connection gracefully
          wss.current.close(1000, 'Component unmounting')
        }
        removeInterval()
      }
    }
  }, [wssUrl, createInterval, removeInterval, imageProcessData, setWssImageData]) // Re-run effect if the URL changes

  const cancelValidate = useCallback(async () => {
    if (imageProcessData?.id) {
      try {
        await service.image.abortImage(imageProcessData.id)
      } catch (err: any) {
        showAlert({ status: 'error', errorCode: err?.message })
      }
    }
  }, [imageProcessData, showAlert])

  useEffect(() => {
    const checkWss = async () => {
      if (imageProcessData && wssImageData && statusInterval.current) {
        if (wssImageData?.data?.processing_status === ThaicomImageStatus.READY) {
          await updateProgressCompleted(imageProcessData.id)
          removeInterval()
          refetchImages()
          setUploadStep(null)
          setImageProcessData(null)
          setSelectSearchItem({ id: imageProcessData.itemId } as SearchImagesResultItem)
          searchImage?.()
          setWssImageData(null)
          setSelectedImage({ ...selectedImage, statusId: String(ImageStatus.completed) } as any)
          showAlert({ status: 'success', title: t('gallery.alert.successUpload') })
        } else if (
          [
            'QUEUED',
            'UPLOAD_PENDING',
            'UPLOAD_COMPLETED',
            'EXTRACTING',
            'EXTRACTED',
            'CONVERTING_COG',
            'VALIDATING_PATTERN',
            'GENERATING_METADATA',
          ].includes(wssImageData?.data?.processing_status)
        ) {
          // Do Nothing
        } else if (wssImageData?.data?.processing_status === ThaicomImageStatus.ABORTED) {
          removeInterval()
          setImageProcessData(undefined)
          searchImage?.()
        } else if (
          [
            'FAILED_UPLOAD',
            'FAILED_EXTRACT',
            'FAILED_CONVERT_COG',
            'FAILED_VALIDATE_PATTERN',
            'FAILED_METADATA',
          ].includes(wssImageData?.data?.processing_status)
        ) {
          const status = wssImageData?.data.processing_status
          let txt = ''
          if (status) {
            txt = t(`gallery.status.${status}`)
          } else {
            txt = t('gallery.status.default')
          }
          showAlert({
            status: 'error',
            title: t('gallery.alert.failedUploadTitle'),
            content: (
              <>
                <div>
                  <span className='mr-2 text-gray'>{t('gallery.uploadDialog.imageName')}:</span>
                  <span>{imageData?.name}</span>
                </div>

                <div>
                  <span className='mr-2 text-gray'>
                    {t('gallery.imagesSelector.detail.processItem.inProcess.statusLabel')}:
                  </span>
                  <span>{txt}</span>

                  <p className='mt-2 text-gray text-xs'>
                    {t('gallery.alert.failedUploadContentRemark')}: {t(`gallery.alert.failedUploadContent`)}
                  </p>
                </div>
              </>
            ),
            onConfirm: () => {
              cancelValidate()
              removeInterval()
              setWssImageData(null)
              setImageProcessData(undefined)
              setUploadStep(null)
              searchImage?.()
              setSelectedImage(null)
            },
            noBackdrop: true,
          })
        }
      }
    }

    checkWss()
  }, [
    updateProgressCompleted,
    imageProcessData,
    setImageProcessData,
    removeInterval,
    setSelectSearchItem,
    refetchImages,
    searchImage,
    setUploadStep,
    wssImageData,
    setWssImageData,
    setSelectedImage,
    selectedImage,
    showAlert,
    t,
    cancelValidate,
    imageData?.name,
  ])

  return (
    <div>
      {isShowProgress && (
        <div
          style={{ boxShadow: '0px 3px 5px -1px #00000033, 0px 6px 10px 0px #00000024, 0px 1px 18px 0px #0000001F' }}
          className={classNames(
            'fixed right-4 bottom-18 z-50 w-[300px] rounded-sm bg-white px-4',
            'transition-all duration-200 ease-in-out',

            { 'h-[55px]': isMinimized, 'h-[140px]': !isMinimized },
          )}
        >
          {isMinimized ? (
            <div className='flex h-full items-center'>
              {uploadStep === ImageUploadStep.Upload ? (
                <div className='mr-2 flex flex-1 items-center gap-2'>
                  <LinearProgress className='flex-1' variant='determinate' value={uploadProgress} />
                  <Typography variant='body2' className='!font-semibold !text-gray min-w-[35px]'>
                    {`${Math.round(uploadProgress)}%`}
                  </Typography>
                </div>
              ) : (
                <LinearProgress className='flex-1' />
              )}
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMinimized(!isMinimized)
                }}
                color='primary'
                size='small'
              >
                {isMinimized ? <OpenInFull /> : <Minimize />}
              </IconButton>
            </div>
          ) : (
            <div className='relative h-full w-full'>
              <IconButton
                className='!absolute !right-0'
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMinimized(!isMinimized)
                }}
                color='primary'
                size='small'
              >
                <Minimize />
              </IconButton>

              <div className='flex flex-col gap-2 py-6'>
                <div className='flex gap-4'>
                  <div>
                    {imageProcessData?.fileType === 'image/tiff' && <UploadProgressTifIcon />}
                    {imageProcessData?.fileType === 'application/zip' && <UploadProgressZipIcon />}
                  </div>
                  <div className='flex flex-col text-sm'>
                    <div className='w-[70px] text-gray'>{t('gallery.uploadProgress.imageName')}:</div>
                    <div className='w-[200px]'>
                      <Tooltip title={imageProcessData?.name || '-'} arrow>
                        <Typography noWrap>{imageProcessData?.name || '-'}</Typography>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                {/*<div className='flex items-center gap-2 text-xs'>
                  <div className='text-gray'>{t('gallery.uploadProgress.statusLabel')}:</div>
                  <div className='text-[#0B76C8]'>
                    {uploadStep === ImageUploadStep.Upload
                      ? t('gallery.uploadDialog.uploading')
                      : t('gallery.uploadDialog.validating')}
                  </div>
                </div>
                <div className='mt-4'>
                  <LinearProgress className='flex-1' />
                </div>*/}
                <LinearProgressWithLabel uploadStep={uploadStep} value={uploadProgress} size='small' />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(UploadProgress)
