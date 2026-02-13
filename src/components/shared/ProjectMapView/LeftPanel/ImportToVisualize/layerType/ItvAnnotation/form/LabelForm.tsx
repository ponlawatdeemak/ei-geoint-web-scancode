import { useEffect, useMemo } from 'react'
import { TextField, Tooltip } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { SelectedSymbol } from '..'
import InfoIcon from '@mui/icons-material/Info'
import InputLabel from '@/components/common/input/InputLabel'
import { useTranslation } from 'react-i18next'
import { amplifier, amplifierDefinition } from '../data/lookup-amplifier'
import { AnnotationSymbolItem, AnnotationLabelItem } from '@interfaces/entities'
import { useWatch } from 'react-hook-form'

type Props = {
  initialData?: SelectedSymbol
  initialValues?: Partial<AnnotationLabelItem>
  symbolValues?: AnnotationSymbolItem
  onChange?: (values: AnnotationLabelItem) => void
}

export const defaultLabelFormValues: AnnotationLabelItem = {}

const defaultValues: AnnotationLabelItem = defaultLabelFormValues

const LabelForm: React.FC<Props> = ({ initialValues, symbolValues, onChange }) => {
  const { t } = useTranslation('common')

  // Create lookup map from amplifierDefinition
  const amplifierDefMap = useMemo(() => {
    const map = new Map<string, (typeof amplifierDefinition)[0]>()
    amplifierDefinition.forEach((item) => {
      map.set(item.code, item)
    })
    return map
  }, [])

  // Get available label codes for current symbol
  const availableLabelCodes = useMemo<Array<keyof AnnotationLabelItem>>(() => {
    if (!symbolValues?.symbolSet) return []
    const symbolSetKey = symbolValues.symbolSet
    const codes = amplifier[symbolSetKey]
    return Array.isArray(codes) ? (codes as Array<keyof AnnotationLabelItem>) : []
  }, [symbolValues?.symbolSet])

  // Create form values structure
  const formDefaultValues = useMemo(() => {
    const merged = { ...defaultValues, ...initialValues }
    const values: AnnotationLabelItem = {}
    availableLabelCodes.forEach((code) => {
      values[code] = merged[code] ?? ''
    })
    return values
  }, [availableLabelCodes, initialValues])

  const { control, reset } = useForm<AnnotationLabelItem>({
    defaultValues: formDefaultValues,
  })

  useEffect(() => {
    if (initialValues) {
      reset(initialValues)
    }
  }, [initialValues, reset])

  const watchedValues = useWatch({ control })

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!onChange) return
      onChange(watchedValues)
    }, 200)

    return () => clearTimeout(timeout)
  }, [watchedValues, onChange])

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex flex-1 flex-col gap-2 overflow-y-auto px-0 pb-2'>
        {availableLabelCodes.length === 0 ? (
          <div className='flex items-center justify-center py-8 text-gray-500'>{t('annotation.noLabelAvailable')}</div>
        ) : (
          availableLabelCodes.map((labelCode) => {
            const labelDef = amplifierDefMap.get(labelCode)
            if (!labelDef) return null

            return (
              <div key={labelCode}>
                <div className='mb-1.5 flex items-center gap-1.5'>
                  <InputLabel>{labelDef.name}</InputLabel>
                  <Tooltip title={labelDef.desc} arrow>
                    <InfoIcon className='h-4 w-4' fontSize='small' sx={{ color: 'action.disabled' }} />
                  </Tooltip>
                </div>
                <Controller
                  name={labelCode}
                  control={control}
                  render={({ field: formField }) => (
                    <TextField {...formField} id={labelCode} fullWidth size='small' placeholder={labelDef.name} />
                  )}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default LabelForm
