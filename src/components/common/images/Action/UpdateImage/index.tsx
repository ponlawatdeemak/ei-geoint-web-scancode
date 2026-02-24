import service from '@/api'
import {
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemText,
  TextField,
} from '@mui/material'
import InputLabel from '@/components/common/input/InputLabel'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'

import dayjs from 'dayjs'

import { FC, memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageActionData } from '../../use-images'
import useResponsive from '@/hook/responsive'

type TagOption = { id: string; name: string } | string

type Props = {
  visible: boolean
  setVisible: (visible: boolean) => void
  imageId: string | null
  imageData: ImageActionData | null
  onSuccess?: (value: any) => void
}

const UpdateImage: FC<Props> = ({ visible, setVisible, imageId, imageData, onSuccess }) => {
  const { t } = useTranslation('common')
  const { is2K } = useResponsive()
  const [tagSuggestions, setTagSuggestions] = useState<Array<{ id: string; name: string }>>([])
  const tagFetchTimerRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [editData, setEditData] = useState<{
    name?: any
    photoDate?: any
    hashtags?: any
  } | null>(null)

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

  const onEdit = async () => {
    try {
      setLoading(true)
      await service.image.updateImage(imageId as string, {
        name: editData?.name,
        photoDate: editData?.photoDate,
        hashtags: editData?.hashtags ? editData?.hashtags.split(',') : undefined,
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

  return (
    <Dialog open={visible} maxWidth={is2K ? 'md' : 'sm'} fullWidth>
      <DialogTitle>{t('gallery.action.edit.title')}</DialogTitle>
      <DialogContent>
        <div className='flex flex-col gap-4'>
          <div>
            <InputLabel required>{t('gallery.uploadDialog.imageName')}</InputLabel>
            <TextField
              size='small'
              value={editData?.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className='w-full bg-white'
            />
          </div>

          <div>
            <InputLabel required>{t('gallery.uploadDialog.imagingDate')}</InputLabel>
            <DateTimePicker
              value={editData?.photoDate ? dayjs(editData?.photoDate) : null}
              format='DD MMM YYYY HH:mm'
              timeSteps={{ minutes: 1 }}
              onChange={(v) => setEditData({ ...editData, photoDate: v?.toISOString() || null })}
              slotProps={{
                textField: { size: 'small', fullWidth: true },
              }}
              className='bg-white'
            />
          </div>
          <div>
            <InputLabel>{t('gallery.uploadDialog.hashtags')}</InputLabel>
            <Autocomplete
              multiple
              freeSolo
              disableCloseOnSelect
              options={tagSuggestions.filter(
                (s) =>
                  !(editData?.hashtags || '')
                    .split(',')
                    .map((v: string) => v.trim())
                    .includes(s.name),
              )}
              getOptionLabel={(opt: TagOption) => (typeof opt === 'string' ? opt : opt.name)}
              value={(editData?.hashtags || '')
                .split(',')
                .map((t: string) => t.trim())
                .filter(Boolean)
                .map((name: string) => ({ id: name, name }))}
              onChange={(_, value: TagOption[]) => {
                const normalized = value.map((v: TagOption) => (typeof v === 'string' ? { id: v, name: v } : v))
                setEditData({
                  ...editData,
                  hashtags: normalized.map((n: { id: string; name: string }) => n.name).join(','),
                })
              }}
              onInputChange={(_, inputValue) => {
                if (tagFetchTimerRef.current) window.clearTimeout(tagFetchTimerRef.current)
                if (inputValue && inputValue.length >= 2) {
                  tagFetchTimerRef.current = window.setTimeout(async () => {
                    try {
                      const res = await service.image.getTags(inputValue)
                      const existing = (editData?.hashtags || '').split(',').map((v: string) => v.trim())
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
          </div>
        </div>
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
        <Button onClick={onEdit}>{t('button.ok')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default memo(UpdateImage)
