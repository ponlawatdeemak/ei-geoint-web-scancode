'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useFieldArray, type Resolver, type Control } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import Autocomplete from '@mui/material/Autocomplete'
import type { AutocompleteRenderInputParams } from '@mui/material/Autocomplete'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { DateField } from '@mui/x-date-pickers/DateField'
import dayjs from 'dayjs'
import { formatDuration } from '@/utils/formatDate'
import InputLabel from '@/components/common/input/InputLabel'
import FormWrapper from '@/components/layout/FormWrapper'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import service from '@/api'
import { GetAllSubscriptionsDtoOut, PostOrganizationDtoIn, PutOrganizationDtoIn } from '@interfaces/index'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useSettings } from '@/hook/useSettings'

type Props = {
  organizationId?: string
}

type SubscriptionField = {
  subscriptionId: string
  startAt: Date | null
  endAt: Date | null
}

type FormValues = {
  name: string
  nameEn: string
  contactName?: string
  contactEmail?: string
  adminNumber?: number | string
  userNumber?: number | string
  viewerNumber?: number | string
  storageNumber?: number | string
  projectNumber?: number | string
  isActive: boolean
  subscriptions: SubscriptionField[]
}

type SubscriptionRowProps = {
  idx: number
  control: Control<FormValues>
  subscriptionOptions: GetAllSubscriptionsDtoOut[]
  subscriptionsWatch: SubscriptionField[]
  language: string
  t: (key: string) => string
  remove: (index: number) => void
  canDelete: boolean
}

const SubscriptionRow: React.FC<SubscriptionRowProps> = ({
  idx,
  control,
  subscriptionOptions,
  subscriptionsWatch,
  language,
  t,
  remove,
  canDelete,
}) => (
  <div className='rounded-lg border border-(--color-divider) p-4'>
    <div className='grid gap-2 md:grid-cols-12'>
      <div className='md:col-span-6'>
        <InputLabel required>{t('form.organizationForm.subscriptionName')}</InputLabel>
        <Controller
          control={control}
          name={`subscriptions.${idx}.subscriptionId` as const}
          render={({ field, fieldState }) => {
            const selectedIds = new Set<string>(subscriptionsWatch.map((s) => s?.subscriptionId).filter(Boolean))
            const options = subscriptionOptions.filter((s) => !selectedIds.has(s.id) || s.id === field.value)
            return (
              <Autocomplete<GetAllSubscriptionsDtoOut, false, false, false>
                options={options}
                noOptionsText={t('filter.noOptions')}
                getOptionLabel={(opt) => (language === 'th' ? opt.name : opt.nameEn)}
                value={subscriptionOptions.find((s) => s.id === field.value) || null}
                onChange={(_: React.SyntheticEvent, v: GetAllSubscriptionsDtoOut | null) =>
                  field.onChange(v ? v.id : '')
                }
                renderInput={(params: AutocompleteRenderInputParams) => (
                  <TextField
                    {...params}
                    placeholder={t('form.organizationForm.subscriptionName')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            )
          }}
        />
      </div>
      <div className='md:col-span-3'>
        <InputLabel required>{t('form.organizationForm.startAt')}</InputLabel>
        <Controller
          control={control}
          name={`subscriptions.${idx}.startAt` as const}
          render={({ field, fieldState }) => {
            const endAt = subscriptionsWatch[idx]?.endAt ? dayjs(subscriptionsWatch[idx].endAt) : null
            return (
              <DatePicker
                value={field.value ? dayjs(field.value) : null}
                maxDate={endAt ?? undefined}
                onChange={(v) => field.onChange(v ? v.toDate() : null)}
                slots={{
                  field: (params) => (
                    <DateField
                      {...params}
                      label={t('form.organizationForm.startAt')}
                      format='D MMM YY'
                      size='small'
                      focused={false}
                      shouldRespectLeadingZeros
                      fullWidth
                      clearable
                      slotProps={{
                        textField: {
                          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.preventDefault(),
                        },
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{
                        '& .MuiInputLabel-shrink': {
                          display: 'none',
                        },
                        '& fieldset.MuiPickersOutlinedInput-notchedOutline>legend': {
                          width: '0px',
                        },
                      }}
                    />
                  ),
                }}
              />
            )
          }}
        />
      </div>
      <div className='md:col-span-3'>
        <InputLabel required>{t('form.organizationForm.endAt')}</InputLabel>
        <Controller
          control={control}
          name={`subscriptions.${idx}.endAt` as const}
          render={({ field, fieldState }) => {
            const today = dayjs().startOf('day')
            const startAt = subscriptionsWatch[idx]?.startAt ? dayjs(subscriptionsWatch[idx].startAt) : null
            return (
              <DatePicker
                value={field.value ? dayjs(field.value) : null}
                minDate={startAt?.isAfter(today) ? startAt : today}
                onChange={(v) => field.onChange(v ? v.toDate() : null)}
                slots={{
                  field: (params) => (
                    <DateField
                      {...params}
                      label={t('form.organizationForm.endAt')}
                      format='D MMM YY'
                      size='small'
                      focused={false}
                      shouldRespectLeadingZeros
                      fullWidth
                      clearable
                      slotProps={{
                        textField: {
                          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.preventDefault(),
                        },
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{
                        '& .MuiInputLabel-shrink': {
                          display: 'none',
                        },
                        '& fieldset.MuiPickersOutlinedInput-notchedOutline>legend': {
                          width: '0px',
                        },
                      }}
                    />
                  ),
                }}
              />
            )
          }}
        />
      </div>
      <div className='flex flex-col items-center rounded-lg bg-(--color-background-default) p-2 md:col-span-12'>
        <InputLabel>{t('form.organizationForm.duration')}</InputLabel>
        <div className='font-semibold text-lg text-primary'>
          {formatDuration(subscriptionsWatch[idx]?.startAt, subscriptionsWatch[idx]?.endAt, t)}
        </div>
      </div>
      <div className='flex justify-center md:col-span-12'>
        <Button startIcon={<DeleteIcon />} color='error' onClick={() => remove(idx)} disabled={!canDelete}>
          {t('form.organizationForm.deleteSubscription')}
        </Button>
      </div>
    </div>
  </div>
)

const EditOrganizationForm: React.FC<Props> = ({ organizationId }) => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [loading, setLoading] = useState(false)
  const [subscriptionOptions, setSubscriptionOptions] = useState<GetAllSubscriptionsDtoOut[]>([])

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    nameEn: Yup.string().required(),
    contactName: Yup.string(),
    contactEmail: Yup.string().email(),
    // allow empty string (from inputs) and transform to undefined so Yup won't fail
    adminNumber: Yup.number()
      .min(0)
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .nullable(),
    userNumber: Yup.number()
      .min(0)
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .nullable(),
    viewerNumber: Yup.number()
      .min(0)
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .nullable(),
    storageNumber: Yup.number()
      .min(0)
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .nullable(),
    projectNumber: Yup.number()
      .min(0)
      .transform((value, originalValue) => (originalValue === '' ? undefined : value))
      .nullable(),
    isActive: Yup.boolean().required(),
    subscriptions: Yup.array()
      .of(
        Yup.object().shape({
          subscriptionId: Yup.string().required(),
          startAt: Yup.date().required().max(Yup.ref('endAt'), ''),
          endAt: Yup.date().required().min(Yup.ref('startAt'), ''),
        }),
      )
      .min(1),
  })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      nameEn: '',
      contactName: '',
      contactEmail: '',
      adminNumber: '',
      userNumber: '',
      viewerNumber: '',
      storageNumber: '',
      projectNumber: '',
      isActive: true,
      subscriptions: [
        {
          subscriptionId: '',
          startAt: null,
          endAt: null,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'subscriptions' as const })

  useEffect(() => {
    const load = async () => {
      try {
        showLoading()
        const subs = await service.subscriptions.all?.()
        setSubscriptionOptions(subs || [])

        if (organizationId) {
          const org = await service.organizations.get(organizationId)
          setValue('name', org.name || '')
          setValue('nameEn', org.nameEn || '')
          setValue('contactName', org.contactName || '')
          setValue('contactEmail', org.contactEmail || '')
          // if numbers are missing or null/undefined, set to empty string so inputs show empty
          setValue('adminNumber', org.adminNumber ?? '')
          setValue('userNumber', org.userNumber ?? '')
          setValue('viewerNumber', org.viewerNumber ?? '')
          setValue('storageNumber', org.storageNumber ?? '')
          setValue('projectNumber', org.projectNumber ?? '')
          setValue('isActive', org.isActive)
          // map org.organizationSubscriptions to subscription fields
          const mapped = (org.organizationSubscriptions || []).map(
            (os: { subscription?: { id?: string }; startAt?: string | Date; endAt?: string | Date }) => ({
              subscriptionId: os.subscription?.id ?? '',
              // Do NOT auto-fill dates. If the org has dates use them, otherwise leave null so user must set them.
              startAt: os.startAt ? new Date(os.startAt) : null,
              endAt: os.endAt ? new Date(os.endAt) : null,
            }),
          )
          setValue('subscriptions', mapped)
        }
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        hideLoading()
      }
    }
    void load()
  }, [organizationId, setValue, showLoading, hideLoading, showAlert])

  const save = async (data: FormValues) => {
    setLoading(true)
    try {
      // Build payload matching PostOrganizationDtoIn | PutOrganizationDtoIn
      const payload: Partial<PostOrganizationDtoIn | PutOrganizationDtoIn> = {
        name: data.name,
        nameEn: data.nameEn,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        // Only include numeric fields if the user provided a value (non-empty)
        ...(data.adminNumber !== '' && data.adminNumber !== undefined ? { adminNumber: Number(data.adminNumber) } : {}),
        ...(data.userNumber !== '' && data.userNumber !== undefined ? { userNumber: Number(data.userNumber) } : {}),
        ...(data.viewerNumber !== '' && data.viewerNumber !== undefined
          ? { viewerNumber: Number(data.viewerNumber) }
          : {}),
        ...(data.storageNumber !== '' && data.storageNumber !== undefined
          ? { storageNumber: Number(data.storageNumber) }
          : {}),
        ...(data.projectNumber !== '' && data.projectNumber !== undefined
          ? { projectNumber: Number(data.projectNumber) }
          : {}),
        isActive: !!data.isActive,
      }

      payload.subscriptions = (data.subscriptions || []) as unknown as
        | PostOrganizationDtoIn['subscriptions']
        | PutOrganizationDtoIn['subscriptions']

      if (organizationId) {
        // update existing organization
        await service.organizations.update(organizationId, payload as PutOrganizationDtoIn)
      } else {
        // create new organization
        await service.organizations.create(payload as PostOrganizationDtoIn)
      }

      showAlert({ status: 'success', title: t('alert.saveSuccess') })

      router.replace('/organization')
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (data: unknown) => {
    showAlert({
      status: 'confirm-save',
      content: t('form.organizationForm.confirmContent'),
      showCancel: true,
      onConfirm: () => {
        void save(data as FormValues)
      },
    })
  }

  const handleDelete = () => {
    showAlert({
      status: 'confirm-delete',
      showCancel: true,
      onConfirm: async () => {
        setLoading(true)
        try {
          await service.organizations.delete({ ids: [organizationId as string] })
          router.replace('/organization')
        } catch (err: any) {
          showAlert({
            status: 'error',
            errorCode: err?.message,
          })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const subscriptionsWatch = watch('subscriptions') || []

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)

  return (
    <FormWrapper
      title={organizationId ? t('form.organizationForm.editTitle') : t('form.organizationForm.addTitle')}
      actions={
        <div className='flex justify-end gap-2'>
          {organizationId ? (
            <>
              <Button
                className='hidden! md:flex!'
                variant='outlined'
                color='error'
                disabled={loading}
                onClick={handleDelete}
              >
                {t('button.delete')}
              </Button>
              <Button
                className='hidden! md:flex!'
                variant='outlined'
                disabled={loading}
                onClick={() => router.replace(`/data-management/${organizationId}`)}
              >
                {t('form.organizationForm.dataUsage')}
              </Button>
              <Button
                className='hidden! md:flex!'
                variant='outlined'
                disabled={loading}
                onClick={() => router.replace(`/gallery/${organizationId}`)}
              >
                {t('form.organizationForm.gallery')}
              </Button>
              <Button
                className='md:hidden! min-w-0! px-2!'
                variant='outlined'
                onClick={handleMenuOpen}
                disabled={loading}
              >
                <MoreVertIcon />
              </Button>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null)
                    router.replace(`/data-management/${organizationId}`)
                  }}
                >
                  {t('form.organizationForm.dataUsage')}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null)
                    router.replace(`/gallery?orgId=${organizationId}`)
                  }}
                >
                  {t('form.organizationForm.gallery')}
                </MenuItem>
                <MenuItem
                  className='text-error!'
                  onClick={() => {
                    setAnchorEl(null)
                    handleDelete()
                  }}
                >
                  {t('button.delete')}
                </MenuItem>
              </Menu>
            </>
          ) : null}
          <div className='flex-grow' />
          <Button
            variant='outlined'
            disabled={loading}
            startIcon={<CloseIcon />}
            onClick={() => router.replace('/organization')}
          >
            {t('button.cancel')}
          </Button>
          <Button
            variant='contained'
            color='primary'
            loading={loading}
            startIcon={<SaveIcon />}
            onClick={handleSubmit(onSubmit)}
          >
            {t('button.save')}
          </Button>
        </div>
      }
      fullWidth
    >
      <form className='grid grid-cols-1 gap-2 md:grid-cols-6'>
        <div className='font-medium text-lg text-primary md:col-span-6'>
          {t('form.organizationForm.organizationDetails')}
        </div>
        <div className='flex flex-col md:col-span-3'>
          <InputLabel required>{t('form.organizationForm.name')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.name')}
            variant='outlined'
            fullWidth
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        </div>
        <div className='flex flex-col md:col-span-3'>
          <InputLabel required>{t('form.organizationForm.nameEn')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.nameEn')}
            variant='outlined'
            fullWidth
            {...register('nameEn')}
            error={!!errors.nameEn}
            helperText={errors.nameEn?.message}
          />
        </div>

        <div className='flex flex-col md:col-span-3'>
          <InputLabel>{t('form.organizationForm.contactName')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.contactName')}
            variant='outlined'
            fullWidth
            {...register('contactName')}
          />
        </div>
        <div className='flex flex-col md:col-span-3'>
          <InputLabel>{t('form.organizationForm.contactEmail')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.contactEmail')}
            variant='outlined'
            fullWidth
            {...register('contactEmail')}
            error={!!errors.contactEmail}
            helperText={errors.contactEmail?.message}
          />
        </div>

        <div className='flex flex-col md:col-span-2'>
          <InputLabel>{t('form.organizationForm.adminNumber')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.adminNumber')}
            type='number'
            variant='outlined'
            fullWidth
            {...register('adminNumber')}
            error={!!errors.adminNumber}
            helperText={errors.adminNumber?.message}
          />
        </div>
        <div className='flex flex-col md:col-span-2'>
          <InputLabel>{t('form.organizationForm.userNumber')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.userNumber')}
            type='number'
            variant='outlined'
            fullWidth
            {...register('userNumber')}
            error={!!errors.userNumber}
            helperText={errors.userNumber?.message}
          />
        </div>

        <div className='flex flex-col md:col-span-2'>
          <InputLabel>{t('form.organizationForm.viewerNumber')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.viewerNumber')}
            type='number'
            variant='outlined'
            fullWidth
            {...register('viewerNumber')}
            error={!!errors.viewerNumber}
            helperText={errors.viewerNumber?.message}
          />
        </div>
        <div className='flex flex-col md:col-span-3'>
          <InputLabel>{t('form.organizationForm.storageNumber')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.storageNumber')}
            type='number'
            variant='outlined'
            fullWidth
            {...register('storageNumber')}
          />
        </div>
        <div className='flex flex-col md:col-span-3'>
          <InputLabel>{t('form.organizationForm.projectNumber')}</InputLabel>
          <TextField
            placeholder={t('form.organizationForm.projectNumber')}
            type='number'
            variant='outlined'
            fullWidth
            {...register('projectNumber')}
          />
        </div>

        <div className='flex flex-col md:col-span-6'>
          <div className='my-2 font-medium text-lg text-primary'>{t('form.organizationForm.subscriptionDetails')}</div>
          <div className='space-y-4'>
            {fields.map((fld, idx) => (
              <SubscriptionRow
                key={fld.id}
                idx={idx}
                control={control}
                subscriptionOptions={subscriptionOptions}
                subscriptionsWatch={subscriptionsWatch}
                language={language}
                t={t}
                remove={remove}
                canDelete={fields.length > 1}
              />
            ))}
            <div className='flex justify-center'>
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  append({ subscriptionId: '', startAt: null, endAt: null })
                }}
              >
                {t('form.organizationForm.addSubscription')}
              </Button>
            </div>
          </div>
        </div>

        <div className='flex md:col-span-6'>
          <Controller
            control={control}
            name={'isActive'}
            render={({ field }) => (
              <div className='flex items-center'>
                <Switch checked={!!field.value} onChange={(_, v) => field.onChange(v)} />
                <InputLabel>{t('form.organizationForm.isActive')}</InputLabel>
              </div>
            )}
          />
        </div>
      </form>
    </FormWrapper>
  )
}

export default EditOrganizationForm
