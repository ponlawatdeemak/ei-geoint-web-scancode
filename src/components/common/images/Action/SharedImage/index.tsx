import service from '@/api'
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'

import { FC, memo, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageActionData } from '../../use-images'

import UserSelector from './UserSelector'

import { GetShareImageDtoOut } from '@interfaces/dto/images'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'

type Props = {
  visible: boolean
  setVisible: (visible: boolean) => void
  imageId: string | null
  imageData: ImageActionData | null
  onSuccess?: (value: any) => void
}

const SharedImage: FC<Props> = ({ visible, setVisible, imageId, imageData, onSuccess }) => {
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()

  const orgId = useMemo(() => {
    return imageData?.organizationId || ''
  }, [imageData])

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [editData, setEditData] = useState<{
    name?: any
    photoDate?: any
    hashtags?: any
  } | null>(null)

  const [sharedData, setSharedData] = useState<GetShareImageDtoOut | null>(null)

  useEffect(() => {
    if (imageId) {
      const fetchSharedData = async () => {
        try {
          const res = await service.image.getSharedImage(imageId)
          setSharedData(res.userIds.length > 0 ? res : null)
          setSelectedUserIds(res.userIds)
        } catch (error: any) {
          showAlert({
            status: 'error',
            errorCode: error?.message,
          })
        }
      }
      fetchSharedData()
    }
  }, [imageId, showAlert])

  useEffect(() => {
    if (imageData) {
      setEditData({
        name: imageData.fileName,
        photoDate: imageData.imagingDate,
        hashtags: imageData.hashtags,
      })
    }
  }, [imageData])

  const handleClose = () => {
    setVisible(false)
  }

  const onSave = async () => {
    try {
      setLoading(true)
      await service.image.shareImage({
        imageId: imageId as string,
        userIds: selectedUserIds,
      })

      setLoading(false)
      handleClose()
      onSuccess?.(editData)
    } catch (error) {
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const isDisabledSave = useMemo(() => {
    if (sharedData) {
      return false
    } else {
      return selectedUserIds.length === 0
    }
  }, [selectedUserIds, sharedData])

  return (
    <Dialog open={visible} fullWidth maxWidth='xl'>
      <DialogTitle>{t('gallery.action.shared.title')}</DialogTitle>
      <DialogContent>
        <UserSelector orgId={orgId} setLoading={setLoading} value={selectedUserIds} onChange={setSelectedUserIds} />
        {loading && (
          <div className='absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center backdrop-blur-sm'>
            <CircularProgress size={80} color='primary' />
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color='inherit'>
          {t('button.cancel')}
        </Button>
        <Button onClick={onSave} disabled={isDisabledSave}>
          {t('button.ok')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default memo(SharedImage)
