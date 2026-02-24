'use client'

import React, { useEffect, useState } from 'react'
import { useProfileStore, fetchAndStoreProfile } from '@/hook/useProfileStore'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useRouter } from 'next/navigation'
import * as Yup from 'yup'
import FormWrapper from '@/components/layout/FormWrapper'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@/components/common/input/InputLabel'
import Button from '@mui/material/Button'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'

import { useTranslation } from 'react-i18next'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import Autocomplete from '@mui/material/Autocomplete'
import { useSettings } from '@/hook/useSettings'

const ProfileForm: React.FC = () => {
  const router = useRouter()
  const profile = useProfileStore((state) => state.profile)!
  const { t } = useTranslation('common')
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [loading, setLoading] = useState(false)
  const { language } = useSettings()

  const schema = Yup.object().shape({
    firstName: Yup.string().required().max(100),
    lastName: Yup.string().required().max(100),
    phone: Yup.string().max(200).matches(/^\d*$/, t('validation.invalidPhone')),
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { firstName: '', lastName: '', phone: '' },
  })

  useEffect(() => {
    const fetchProfileAndSetForm = async () => {
      try {
        showLoading()
        const profileData = await fetchAndStoreProfile()
        setValue('firstName', profileData?.firstName || '')
        setValue('lastName', profileData?.lastName || '')
        setValue('phone', profileData?.phone || '')
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        hideLoading()
      }
    }
    fetchProfileAndSetForm()
  }, [showLoading, hideLoading, showAlert, setValue])

  const save = async (data: { firstName: string; lastName: string; phone?: string }) => {
    setLoading(true)
    try {
      await service.users.patch(profile.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      })
      await fetchAndStoreProfile()
      showAlert({
        status: 'success',
        title: t('form.profileForm.successTitle'),
      })
    } catch (err: any) {
      console.error('Error saving profile:', err)
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (data: { firstName: string; lastName: string; phone?: string }) => {
    showAlert({
      status: 'confirm-save',
      content: t('form.profileForm.confirmContent'),
      showCancel: true,
      onConfirm: () => {
        void save(data)
      },
    })
  }

  const userSubscriptions = (profile.userSubscriptions || []).map((us) => us.subscription)

  return (
    <FormWrapper
      title={t('form.profileForm.formTitle')}
      actions={
        <div className='flex justify-end gap-2'>
          <Button variant='outlined' disabled={loading} onClick={() => router.replace('/profile/change-password')}>
            {t('form.profileForm.changePassword')}
          </Button>
          <div className='flex-grow' />
          <Button
            variant='outlined'
            disabled={loading}
            startIcon={<CloseIcon />}
            onClick={() => router.replace('/project')}
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
    >
      <form className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        {/* Row 1: First Name / Last Name */}
        <div className='flex flex-col'>
          <InputLabel required>{t('form.profileForm.firstName')}</InputLabel>
          <TextField
            placeholder={t('form.profileForm.firstName')}
            variant='outlined'
            fullWidth
            disabled={loading}
            {...register('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
          />
        </div>
        <div className='flex flex-col'>
          <InputLabel required>{t('form.profileForm.lastName')}</InputLabel>
          <TextField
            placeholder={t('form.profileForm.lastName')}
            variant='outlined'
            fullWidth
            disabled={loading}
            {...register('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
          />
        </div>
        {/* Row 2: Department (full width) */}
        <div className='flex flex-col md:col-span-2'>
          <InputLabel>{t('form.profileForm.organization')}</InputLabel>
          <Select value={profile.organizationId || ''} disabled>
            <MenuItem value={profile.organizationId || ''}>{profile.organization.name}</MenuItem>
          </Select>
        </div>
        {/* Row 3: Email / Phone */}
        <div className='flex flex-col'>
          <InputLabel>{t('form.profileForm.email')}</InputLabel>
          <TextField
            placeholder={t('form.profileForm.email')}
            variant='outlined'
            fullWidth
            value={profile.email || ''}
            disabled
          />
        </div>
        <div className='flex flex-col'>
          <InputLabel>{t('form.profileForm.phone')}</InputLabel>
          <TextField
            placeholder={t('form.profileForm.phone')}
            variant='outlined'
            fullWidth
            disabled={loading}
            {...register('phone')}
            error={!!errors.phone}
            helperText={errors.phone?.message}
          />
        </div>
        {/* Row 4: Username (full width) */}
        <div className='flex flex-col md:col-span-2'>
          <InputLabel>{t('form.profileForm.userName')}</InputLabel>
          <TextField
            placeholder={t('form.profileForm.userName')}
            variant='outlined'
            fullWidth
            value={profile.userName || ''}
            disabled
            className='md:col-span-2'
          />
        </div>
        <div className='flex flex-col md:col-span-2'>
          <InputLabel>{t('form.profileForm.role')}</InputLabel>
          <TextField
            placeholder={t('form.profileForm.role')}
            variant='outlined'
            fullWidth
            value={language === 'th' ? profile.role?.name : profile.role?.nameEn || ''}
            disabled
            className='md:col-span-2'
          />
        </div>
        {/* Row 5: Subscription (full width) */}
        <div className='flex flex-col md:col-span-2'>
          <InputLabel>{t('form.profileForm.subscription')}</InputLabel>
          <Autocomplete
            className='md:col-span-2'
            options={userSubscriptions}
            getOptionLabel={(option) => option?.name || ''}
            value={userSubscriptions}
            renderInput={(params) => <TextField {...params} />}
            multiple
            readOnly
            disabled
          />
        </div>
      </form>
    </FormWrapper>
  )
}

export default ProfileForm
