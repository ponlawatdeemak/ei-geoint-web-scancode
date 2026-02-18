import { useMediaQuery, Button } from '@mui/material'

import { Dispatch, FC, SetStateAction, useCallback, useId, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import theme from '@/styles/theme'
import { nanoid } from 'nanoid'
import { ConfirmUploadDtoOut, CreateUploadDtoOut } from '@interfaces/dto/thaicom/image-geotag.dto'
import { ItvFeatureProperties, ItvLayer } from '@interfaces/entities'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'
import { ItvPhotoFeature } from '../itv-photo'
import importToVisualize from '@/api/import-to-visualize'
import { Point } from 'geojson'
import PhotoLoading from '../PhotoLoading'

const MAX_UPLOAD_COUNT = 100
const MAX_FILE_SIZE = 25 // MB
const accept = '.heic, .heif, .tiff, .tif, .jpg, .jpeg, .png'
const acceptType = ['image/jpeg', 'image/png', 'image/tiff', 'image/heic', 'image/heif']

interface Props {
  layerInfo: ItvLayer
  setLayerInfo: Dispatch<SetStateAction<ItvLayer | undefined>>
  projectId: string
  setPhotoList: Dispatch<SetStateAction<ItvPhotoFeature[]>>
  onUpdateItvLayers: Dispatch<SetStateAction<ItvLayer[]>>
  setShowLocator: Dispatch<SetStateAction<boolean>>
}
const PhotoUploader: FC<Props> = ({
  layerInfo,
  projectId,
  setPhotoList,
  setLayerInfo,
  onUpdateItvLayers,
  setShowLocator,
}) => {
  const { showAlert } = useGlobalUI()
  const { t } = useTranslation('common')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const inputId = useId()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'))

  const [files, setFiles] = useState<{ id: string; name: string; file: File; title: string }[]>([])
  const [currentFile, setCurrentFile] = useState<{ file: File; current: number; total: number } | null>(null)

  const currentFileCount = useMemo(() => layerInfo?.features?.length || 0, [layerInfo])

  const validateFile = useCallback(
    (fileList: FileList) => {
      for (const file of fileList) {
        if (!acceptType.includes(file.type)) {
          showAlert({
            status: 'warning',
            title: t('itv.alert.uploadAlertTitle'),
            content: t('itv.alert.fileTypeNotSupported'),
          })
          return false
        }
        const maxFileSize = MAX_FILE_SIZE * 1024 * 1024
        if (file.size > maxFileSize) {
          showAlert({
            status: 'warning',
            title: t('itv.alert.uploadAlertTitle'),
            content: t('itv.alert.fileSizeExceeded', { size: MAX_FILE_SIZE }),
          })
          return false
        }
      }
      const totalFileCount = fileList.length + currentFileCount
      if (totalFileCount > MAX_UPLOAD_COUNT) {
        showAlert({
          status: 'warning',
          title: t('itv.alert.uploadAlertTitle'),
          content: t('itv.alert.maxFileCount', { count: MAX_UPLOAD_COUNT }),
        })
        return false
      }
      return true
    },
    [showAlert, t, currentFileCount],
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (layerInfo && files && files.length > 0) {
        const isValid = validateFile(files)
        if (!isValid) {
          return
        }
        const geoIntResult: ItvPhotoFeature[] = []
        const tempFeature: ItvFeatureProperties[] = []
        for (const [index, file] of Array.from(files).entries()) {
          setCurrentFile({ file, current: index, total: files.length })
          let resUpload: CreateUploadDtoOut
          try {
            resUpload = await importToVisualize.createUpload({
              filename: file.name,
              contentType: file.type,
              projectId,
              itvLayerId: layerInfo?.id,
            })
          } catch (error: any) {
            console.error('create upload error: ', error)
            showAlert({
              status: 'error',
              errorCode: error?.message,
            })

            return
          }

          const { uploadId, uploadUrl } = resUpload
          try {
            await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } })
          } catch (error: any) {
            console.error('upload error: ', error)
            showAlert({
              status: 'error',
              errorCode: error?.message,
            })
            return
          }
          let resConfirm: ConfirmUploadDtoOut
          try {
            resConfirm = await importToVisualize.confirmUpload({
              uploadId,
              itvLayerId: layerInfo?.id,
            })
          } catch (error: any) {
            console.error('confirm upload error: ', error)
            showAlert({
              status: 'error',
              errorCode: error?.message,
            })
            return
          }
          setCurrentFile({ file, current: index + 1, total: files.length })

          const temp = new ItvFeatureProperties()
          temp.id = resConfirm.id
          temp.geometry = resConfirm.geometry as Point
          temp.itvLayerId = resConfirm.itvLayerId
          temp.photoUploadId = uploadId
          temp.photoFileName = file.name
          temp.photoImagingDate = resConfirm.photoImagingDate
          temp.photoGroupId = null
          temp.createdAt = resConfirm.createdAt
          temp.createdBy = resConfirm.createdBy
          tempFeature.push(temp)
          geoIntResult.push({
            id: nanoid(),
            fileName: file.name,
            uploadId,
            groupId: null,
            geometry: resConfirm.geometry,
            selected: false,
            photoItem: temp,
          })
        }
        setPhotoList(geoIntResult)
        const newLayer = { ...layerInfo, features: [...(layerInfo?.features || []), ...tempFeature] }
        onUpdateItvLayers((prev) => {
          const temp = [...prev]
          const index = temp.findIndex((layer) => layer.id === layerInfo?.id)
          if (index > -1) {
            temp[index] = newLayer
          }
          return temp
        })
        setLayerInfo(newLayer)
        setTimeout(() => {
          setCurrentFile(null)
        }, 1000)
        const selectedFiles = Array.from(files).map((file) => ({
          id: file.name,
          name: file.name,
          file,
          title: file.name,
        }))
        setFiles(selectedFiles)
        setShowLocator(true)
      }
      e.target.value = ''
    },
    [projectId, validateFile, layerInfo, setLayerInfo, showAlert, onUpdateItvLayers, setShowLocator, setPhotoList],
  )

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type='file'
        accept={accept}
        className='hidden'
        multiple
        onChange={handleFileSelect}
        disabled={files.length > MAX_UPLOAD_COUNT}
      />

      <label htmlFor={inputId} className='block' aria-label={t('gallery.uploadDialog.selectFile') + ' (Photo)'}>
        <div className='relative flex w-full items-center justify-center rounded-lg border-2 border-blue-300 border-dashed bg-white/50 p-4 sm:p-8'>
          <div className='flex flex-col items-center'>
            <Button
              component='span'
              variant='contained'
              color='primary'
              className='mb-3 normal-case'
              disabled={files.length > MAX_UPLOAD_COUNT}
              startIcon={<CloudUploadIcon />}
              size={isSmallScreen ? 'medium' : 'large'}
            >
              {t('gallery.uploadDialog.selectFile')}
            </Button>
            <div className='pt-2 text-center text-(--color-text-secondary) text-xs sm:text-sm'>
              {t('itv.upload.supportedFile', { type: accept, size: MAX_FILE_SIZE })}
            </div>
          </div>
        </div>
      </label>
      {currentFile && <PhotoLoading currentFile={currentFile} />}
    </div>
  )
}

export default PhotoUploader
