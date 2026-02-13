import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import MapView from '../../map/MapView'
import { useImages } from '../use-images'

import { memo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import useResponsive from '@/hook/responsive'
import ImageInfo from './ImageInfo'
import { imageMapId } from '../images'

const DetailPanel = () => {
  const { showImageDialog, setShowImageDialog, selectedImage, setSelectSearchItem, setSelectedImage } = useImages()

  const { t } = useTranslation('common')
  const { isLg } = useResponsive()

  const handleDialogClose = useCallback(() => {
    setShowImageDialog(false)
  }, [setShowImageDialog])

  // close dialog on change screen size to desktop
  useEffect(() => {
    if (isLg) {
      handleDialogClose()
    }
  }, [isLg, handleDialogClose])

  useEffect(() => {
    return () => {
      setSelectSearchItem(null)
      setSelectedImage(null)
    }
  }, [setSelectSearchItem, setSelectedImage])

  return (
    <div className='hidden w-[50%] bg-white lg:block'>
      <div className='flex h-full flex-col'>
        {isLg ? (
          <>
            <div className='lg:h-[40%]'>
              <div className='h-full min-h-0 w-full flex-1'>
                <MapView mapId={imageMapId} isShowBasicTools={false} />
              </div>
            </div>
            <ImageInfo selectedImage={selectedImage} />
          </>
        ) : (
          <Dialog open={showImageDialog} fullWidth maxWidth='sm'>
            <DialogTitle noWrap>{selectedImage?.name}</DialogTitle>
            <DialogContent>
              <ImageInfo selectedImage={selectedImage} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDialogClose} color='primary'>
                {t('button.close')}
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </div>
    </div>
  )
}
export default memo(DetailPanel)
