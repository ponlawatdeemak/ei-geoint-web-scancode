import { Dialog, DialogContent, DialogTitle, DialogActions, Button, TextField } from '@mui/material'
import { FC, memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { itvConfig, ItvMode, tileUrlValidator } from '../../utils/importToVisualize'
import { ItvLayerType } from '@interfaces/config'
import * as Yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import InputLabel from '@/components/common/input/InputLabel'

interface ItvDialogProps {
  projectId: string
  onSave: (value: any) => void
  onCancel: () => void
  mode: ItvMode | null
  layerType: ItvLayerType
  values?: { name: string; url?: string }
}

const ItvDialog: FC<ItvDialogProps> = ({ onSave, onCancel, mode, layerType, values }) => {
  const { t } = useTranslation('common')

  const showUrl = useMemo(
    () => layerType === ItvLayerType.VECTOR_TILE || layerType === ItvLayerType.RASTER_TILE,
    [layerType],
  )
  const schema = Yup.object().shape({
    name: Yup.string().max(200).required(),
    url: showUrl
      ? Yup.string()
          .required()
          .test('is-valid-url', 'Invalid URL', (value) => tileUrlValidator(value))
      : Yup.string().optional(),
  })

  const {
    register,
    formState: { isValid, errors },
    getValues,
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: values?.name || '',
      url: values?.url || '',
    },
  })

  const onSubmit = async () => {
    const isValid = await trigger()
    if (!isValid) return
    const values = getValues()
    onSave(values)
  }

  return (
    <Dialog fullWidth maxWidth='sm' open={true}>
      <DialogTitle>
        {mode === ItvMode.Add ? t('itv.label.add') : t('itv.label.edit')} {t(itvConfig[layerType]?.label || '')}
      </DialogTitle>
      <DialogContent>
        <form className='grid grid-cols-1 gap-2'>
          <div className='flex flex-col'>
            <InputLabel required>{t('itv.form.dialog.name.label')}</InputLabel>
            <TextField
              placeholder={t('itv.form.dialog.name.placeholder')}
              variant='outlined'
              fullWidth
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </div>
          {showUrl && (
            <div className='flex flex-col'>
              <InputLabel required>{t('itv.form.dialog.url.label')}</InputLabel>
              <TextField
                placeholder={t('itv.form.dialog.url.placeholder')}
                variant='outlined'
                fullWidth
                {...register('url')}
                error={!!errors.url}
                helperText={errors.url?.message}
              />
            </div>
          )}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color='inherit'>
          {t('button.cancel')}
        </Button>
        <Button disabled={!isValid} onClick={onSubmit}>
          {mode === ItvMode.Add ? t('button.add') : t('button.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default memo(ItvDialog)
