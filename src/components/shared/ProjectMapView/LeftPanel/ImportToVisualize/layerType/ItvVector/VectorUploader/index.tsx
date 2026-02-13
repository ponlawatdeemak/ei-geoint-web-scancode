import { useMediaQuery, Button } from '@mui/material'
import { Dispatch, FC, SetStateAction, useCallback, useId, useMemo, useRef, useState } from 'react'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import theme from '@/styles/theme'
import { nanoid } from 'nanoid'
import { ItvFeatureProperties, ItvLayer } from '@interfaces/entities'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'

import { useVectorUploader } from '../hooks/useVectorUploader'
import * as turf from '@turf/turf'
import { useProfileStore } from '@/hook/useProfileStore'
import { Geometry } from 'geojson'

const MAX_ITEM_COUNT = 100
const MAX_FILE_SIZE = 5 // MB
const accept = '.zip, .geojson, .kml, .kmz'
const acceptType =
  'application/zip, application/geo+json, application/vnd.google-earth.kml+xml, application/vnd.google-earth.kmz'

interface Props {
  layerInfo: ItvLayer
  setLayerInfo: Dispatch<SetStateAction<ItvLayer | undefined>>
  onUpdateItvLayers: Dispatch<SetStateAction<ItvLayer[]>>
  onUploadChange: (value: string[]) => void
}
const VectorUploader: FC<Props> = ({ layerInfo, setLayerInfo, onUpdateItvLayers, onUploadChange }) => {
  const { showAlert } = useGlobalUI()
  const { t } = useTranslation('common')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const inputId = useId()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'))
  const { handleFile } = useVectorUploader()
  const profile = useProfileStore((state) => state.profile)

  const disabled = useMemo(() => layerInfo?.features?.length >= MAX_ITEM_COUNT, [layerInfo])

  //   const [files, setFiles] = useState<{ id: string; name: string; file: File; title: string }[]>([])

  const currentItemCount = useMemo(() => layerInfo?.features?.length || 0, [layerInfo])

  const validateFile = useCallback(
    (fileList: FileList) => {
      for (const file of fileList) {
        const isValidType = file.type ? acceptType.includes(file.type) : true
        const ext = `.${file.name.split('.').pop()?.toLowerCase()}`
        const isValidExt = accept.includes(ext)
        if (!isValidType || !isValidExt) {
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
      return true
    },
    [showAlert, t],
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (layerInfo && files && files.length > 0) {
        const isValid = validateFile(files)
        if (!isValid) {
          return
        }

        const tempFeature: ItvFeatureProperties[] = []
        const newIdList: string[] = []
        for (const file of Array.from(files)) {
          const features = await handleFile(file)
          if (currentItemCount + features.length > MAX_ITEM_COUNT) {
            showAlert({
              status: 'warning',
              title: t('itv.alert.uploadAlertTitle'),
              content: t('itv.alert.maxItemCount', { count: MAX_ITEM_COUNT }),
            })
            break
          }
          for (const vectorItem of features) {
            if (!vectorItem.geometry) return
            const temp = new ItvFeatureProperties()
            temp.id = nanoid()
            newIdList.push(temp.id)
            temp.itvLayerId = layerInfo.id
            // Construct Geometry based on hook output
            temp.geometry = {
              type: vectorItem.geometry.type,
              coordinates: vectorItem.geometry.coordinates,
              bbox: turf.bbox(vectorItem.geometry),
            } as Geometry
            if (vectorItem.geometry.type === 'LineString' || vectorItem.geometry.type === 'MultiLineString') {
              temp.vectorLength = (vectorItem.metric || 0) / 1000000
            } else if (vectorItem.geometry.type === 'Polygon' || vectorItem.geometry.type === 'MultiPolygon') {
              temp.vectorArea = (vectorItem.metric || 0) / 1000000
            }
            temp.createdAt = new Date().toISOString()
            temp.createdBy = profile?.id || null
            tempFeature.push(temp)
          }
        }

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
        onUploadChange(newIdList)
      }
      e.target.value = ''
    },
    [
      validateFile,
      layerInfo,
      setLayerInfo,
      onUpdateItvLayers,
      handleFile,
      currentItemCount,
      showAlert,
      t,
      profile,
      onUploadChange,
    ],
  )

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type='file'
        accept={accept}
        className='hidden'
        // multiple
        onChange={handleFileSelect}
        disabled={disabled}
      />

      <label htmlFor={inputId} className='block' aria-label={t('gallery.uploadDialog.selectFile') + ' (Vector)'}>
        <div className='relative flex w-full items-center justify-center rounded-lg border-2 border-blue-300 border-dashed bg-white/50 p-4 sm:p-8'>
          <div className='flex flex-col items-center'>
            <Button
              component='span'
              variant='contained'
              color='primary'
              className='mb-3 normal-case'
              disabled={disabled}
              startIcon={<CloudUploadIcon />}
              size={isSmallScreen ? 'medium' : 'large'}
            >
              {t('gallery.uploadDialog.selectFile')}
            </Button>
            <div className='pt-2 text-center text-(--color-text-secondary) text-xs sm:text-sm'>
              {t('itv.upload.supportedFileVector')}
            </div>
          </div>
        </div>
      </label>
    </div>
  )
}

export default VectorUploader
