import { LinearProgressProps, Box, LinearProgress, Typography } from '@mui/material'
import { memo, useMemo } from 'react'
import { ImageUploadStep } from '../../images/images'
import { useTranslation } from 'react-i18next'
import { useImages } from '../../images/use-images'

type props = {
  uploadStep: ImageUploadStep | null | undefined
  value: number
  size?: 'small' | 'medium'
}

const LinearProgressWithLabel = ({ uploadStep, value, size = 'medium' }: props) => {
  const { t } = useTranslation('common')
  const { wssImageData } = useImages()

  const statusText = useMemo(() => {
    let txt = ''
    if (uploadStep === ImageUploadStep.Upload) {
      txt = t('gallery.uploadDialog.uploading')
    } else {
      const status = wssImageData?.data.processing_status
      if (status) {
        txt = t(`gallery.status.${status}`)
      } else {
        txt = t('gallery.status.default')
      }
    }

    return txt
  }, [wssImageData, t, uploadStep])

  return (
    <div className={`flex flex-col gap-2 ${size === 'medium' ? 'mt-4' : ''}`}>
      <div className={`flex gap-2 ${size === 'medium' ? 'text-base' : 'text-sm'}`}>
        <div className='text-gray'>{t('gallery.imagesSelector.detail.processItem.inProcess.statusLabel')}:</div>
        <div className='text-[#0B76C8]'>{statusText}</div>
      </div>
      <div>
        {uploadStep === ImageUploadStep.Upload ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress sx={{ height: 6 }} variant='determinate' value={value} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography className='!text-gray !font-semibold' variant='body2'>{`${Math.round(value)}%`}</Typography>
            </Box>
          </Box>
        ) : (
          <LinearProgress />
        )}
      </div>
    </div>
  )
}

export default memo(LinearProgressWithLabel)
