import importToVisualize from '@/api/import-to-visualize'
import ImagesSelector from '@/components/common/images'
import { ImagesMode } from '@/components/common/images/images'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { ItvLayerType } from '@interfaces/config'
import { GetByItemIdImageDtoOut } from '@interfaces/dto/images'
import { CreateItvLayerDtoIn } from '@interfaces/dto/import-to-visualize'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, useMediaQuery, useTheme } from '@mui/material'
import { FC, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  projectId: string
  onClose: () => void
  onSaveComplete?: () => void
}

const ItvGallery: FC<Props> = ({ projectId, onClose, onSaveComplete }) => {
  const theme = useTheme()
  const isFullScreen = useMediaQuery(theme.breakpoints.down('md'))
  const [selectedImage, setSelectedImage] = useState<GetByItemIdImageDtoOut | null>(null)
  const { showAlert } = useGlobalUI()
  const { t } = useTranslation('common')

  const onSave = useCallback(async () => {
    if (selectedImage) {
      const param: CreateItvLayerDtoIn = {
        projectId,
        imageId: selectedImage.id,
        name: selectedImage.name,
        layerType: ItvLayerType.GALLERY,
      }
      await importToVisualize.createLayer(param)
      onSaveComplete?.()
      showAlert({ status: 'success', title: t('alert.saveSuccess') })
      onClose()
    }
  }, [selectedImage, onClose, projectId, showAlert, onSaveComplete, t])

  return (
    <Dialog
      open={true}
      fullWidth
      fullScreen={isFullScreen}
      sx={{
        '& .MuiDialog-paper': {
          width: '100%',
          maxWidth: 'none',
          [theme.breakpoints.up('md')]: { width: '90%' },
        },
      }}
    >
      <DialogTitle>{t('menu.gallery')}</DialogTitle>
      <DialogContent className='p-0!'>
        <ImagesSelector mode={ImagesMode.Selector} projectId={projectId} onSelect={setSelectedImage} pageUse='itv' />
      </DialogContent>
      <DialogActions>
        <Button color='inherit' onClick={onClose}>
          {t('button.cancel')}
        </Button>
        <Button disabled={!selectedImage} onClick={onSave}>
          {t('button.select')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ItvGallery
