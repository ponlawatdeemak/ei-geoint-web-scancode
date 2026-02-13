import { useEffect, useMemo, useRef } from 'react'
import { TextField, Autocomplete } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  context as contextLookup,
  identity as identityLookup,
  status as statusLookup,
  headquarters as headquartersLookup,
  echelon as echelonLookup,
} from '../data/lookup-modifier'
import { SelectedSymbol } from '..'

import InputLabel from '@/components/common/input/InputLabel'
import { AnnotationSymbolItem } from '@interfaces/entities'

type Props = {
  initialData?: SelectedSymbol
  initialValues?: Partial<AnnotationSymbolItem>
  onChange?: (values: AnnotationSymbolItem) => void
}

export const defaultSymbolFormValues: AnnotationSymbolItem = {
  symbolSize: 40,
  context: '0',
  identity: '3',
  status: '0',
  headquarters: '0',
  echelon: '00',
  modifier1: '',
  modifier2: '',
  icon: {
    code: '',
    entity: '',
    entityType: '',
    entitySubtype: '',
    name: '',
  },
  symbolSet: '',
}

const defaultValues: AnnotationSymbolItem = defaultSymbolFormValues
const SymbolForm: React.FC<Props> = ({ initialData, initialValues, onChange }) => {
  const onChangeRef = useRef(onChange)
  const { t } = useTranslation('common')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const { control, watch, reset } = useForm<AnnotationSymbolItem>({
    defaultValues: {
      ...defaultValues,
      ...initialValues,
      icon: initialData?.icon,
      symbolSet: initialData?.symbolSet.symbolset || '',
    },
  })

  useEffect(() => {
    reset({
      ...defaultValues,
      ...initialValues,
      icon: initialData?.icon,
      symbolSet: initialData?.symbolSet.symbolset || '',
    })
  }, [initialValues, initialData, reset])

  const watchedValues = watch()

  // Use ref to track previous values and prevent infinite loop
  const prevValuesRef = useRef<string>('')

  useEffect(() => {
    const currentValuesString = JSON.stringify(watchedValues)
    if (prevValuesRef.current !== currentValuesString) {
      prevValuesRef.current = currentValuesString
      onChangeRef.current?.(watchedValues)
    }
  }, [watchedValues])

  const mod1Options = useMemo(() => {
    const opts = initialData?.symbolSet?.modifier1 || []
    return opts.map((m) => ({ code: m.code || '00', name: m.name || '' }))
  }, [initialData])

  const mod2Options = useMemo(() => {
    const opts = initialData?.symbolSet?.modifier2 || []
    return opts.map((m) => ({ code: m.code || '00', name: m.name || '' }))
  }, [initialData])

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex flex-1 flex-col gap-2 overflow-y-auto px-0 pb-2'>
        {/* Symbol Size */}
        <div className='flex flex-col'>
          <InputLabel required>{t('annotation.symbolSize')}</InputLabel>
          <Controller
            name='symbolSize'
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type='number'
                fullWidth
                size='small'
                slotProps={{ htmlInput: { maxLength: 100, minLength: 1 } }}
              />
            )}
          />
        </div>

        {/* Context */}
        <div className='flex flex-col'>
          <InputLabel required>{t('annotation.context')}</InputLabel>
          <Controller
            name='context'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={contextLookup}
                getOptionLabel={(option) => option.name}
                value={contextLookup.find((o) => o.code === field.value) || contextLookup[0] || null}
                onChange={(_, value) => field.onChange(value?.code || '0')}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                disableClearable
                renderInput={(params) => <TextField {...params} size='small' />}
              />
            )}
          />
        </div>

        {/* Identity */}
        <div className='flex flex-col'>
          <InputLabel required>{t('annotation.identity')}</InputLabel>
          <Controller
            name='identity'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={identityLookup}
                getOptionLabel={(option) => option.name}
                value={identityLookup.find((o) => o.code === field.value) || identityLookup[3] || null}
                onChange={(_, value) => field.onChange(value?.code || '3')}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                disableClearable
                renderInput={(params) => <TextField {...params} size='small' />}
              />
            )}
          />
        </div>

        {/* Status */}
        <div className='flex flex-col'>
          <InputLabel required>{t('annotation.status')}</InputLabel>
          <Controller
            name='status'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={statusLookup}
                getOptionLabel={(option) => option.name}
                value={statusLookup.find((o) => o.code === field.value) || statusLookup[0] || null}
                onChange={(_, value) => field.onChange(value?.code || '0')}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                disableClearable
                renderInput={(params) => <TextField {...params} size='small' />}
              />
            )}
          />
        </div>

        {/* Headquarters */}
        <div className='flex flex-col'>
          <InputLabel required>{t('annotation.headquarters')}</InputLabel>
          <Controller
            name='headquarters'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={headquartersLookup}
                getOptionLabel={(option) => option.name}
                value={headquartersLookup.find((o) => o.code === field.value) || headquartersLookup[0] || null}
                onChange={(_, value) => field.onChange(value?.code || '0')}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                disableClearable
                renderInput={(params) => <TextField {...params} size='small' />}
              />
            )}
          />
        </div>

        {/* Echelon */}
        <div className='flex flex-col'>
          <InputLabel required>{t('annotation.echelon')}</InputLabel>
          <Controller
            name='echelon'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={echelonLookup}
                getOptionLabel={(option) => option.name}
                value={echelonLookup.find((o) => o.code === field.value) || echelonLookup[0] || null}
                onChange={(_, value) => field.onChange(value?.code || '00')}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                disableClearable
                renderInput={(params) => <TextField {...params} size='small' />}
              />
            )}
          />
        </div>

        {/* Modifier 1 */}
        <div className='flex flex-col'>
          <InputLabel>{t('annotation.modifier1')}</InputLabel>
          <Controller
            name='modifier1'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={mod1Options}
                getOptionLabel={(option) => option.name}
                value={mod1Options.find((o) => o.code === field.value) || null}
                onChange={(_, value) => field.onChange(value?.code || '')}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                renderInput={(params) => <TextField {...params} size='small' />}
                disabled={mod1Options.length === 0}
              />
            )}
          />
        </div>

        {/* Modifier 2 */}
        <div className='flex flex-col'>
          <InputLabel>{t('annotation.modifier2')}</InputLabel>
          <Controller
            name='modifier2'
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={mod2Options}
                getOptionLabel={(option) => option.name}
                value={mod2Options.find((o) => o.code === field.value) || null}
                onChange={(_, value) => field.onChange(value?.code || '')}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                renderInput={(params) => <TextField {...params} size='small' />}
                disabled={mod2Options.length === 0}
              />
            )}
          />
        </div>
      </div>
    </div>
  )
}

export default SymbolForm
