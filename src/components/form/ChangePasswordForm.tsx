'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import FormWrapper from '@/components/layout/FormWrapper'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import PasswordInput from '@/components/common/input/PasswordInput'
import InputLabel from '@/components/common/input/InputLabel'
import LockIcon from '@mui/icons-material/Lock'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { passwordRules } from '@/utils/rules'
import { useProfileStore } from '@/hook/useProfileStore'
import { useTranslation } from 'react-i18next'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'

const ChangePasswordForm: React.FC = () => {
  const router = useRouter()
  const profile = useProfileStore((state) => state.profile)!
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const [loading, setLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const rules = passwordRules(password)
  const isPasswordValid = rules.every(Boolean)
  const isMatch = password === confirm && confirm.length > 0

  const save = async () => {
    setLoading(true)
    try {
      await service.users.changePassword({
        userId: profile.id,
        oldPassword: currentPassword,
        newPassword: password,
      })
      showAlert({
        status: 'success',
        title: t('form.changePassword.successTitle'),
        onConfirm: () => router.replace('/profile'),
      })
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    showAlert({
      status: 'confirm-save',
      title: t('form.changePassword.confirmTitle'),
      content: t('form.changePassword.confirmContent'),
      showCancel: true,
      onConfirm: () => {
        void save()
      },
    })
  }

  return (
    <FormWrapper
      title={t('form.changePassword.formTitle')}
      subtitle={t('form.changePassword.formSubtitle')}
      actions={
        <div className='flex justify-end gap-2'>
          <div className='flex-grow' />
          <Button
            variant='outlined'
            onClick={() => router.replace('/profile')}
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            {t('button.cancel')}
          </Button>
          <Button
            variant='contained'
            color='primary'
            onClick={handleSubmit}
            disabled={!isPasswordValid || !isMatch}
            loading={loading}
            startIcon={<SaveIcon />}
          >
            {t('button.save')}
          </Button>
        </div>
      }
    >
      <form className='grid grid-cols-1 gap-6'>
        <div className='flex flex-col'>
          <InputLabel>{t('form.changePassword.currentPassword')}</InputLabel>
          <PasswordInput
            fullWidth
            placeholder={t('form.changePassword.currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <LockIcon />
                  </InputAdornment>
                ),
              },
            }}
            disabled={loading}
          />
        </div>
        <div className='flex flex-col'>
          <InputLabel>{t('form.changePassword.newPassword')}</InputLabel>
          <PasswordInput
            fullWidth
            placeholder={t('form.changePassword.newPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!password && !isPasswordValid}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <LockIcon />
                  </InputAdornment>
                ),
              },
            }}
            disabled={loading}
          />
        </div>
        <div className='flex flex-col'>
          <InputLabel>{t('form.changePassword.confirmNewPassword')}</InputLabel>
          <PasswordInput
            fullWidth
            placeholder={t('form.changePassword.confirmNewPassword')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={!!confirm && !isMatch}
            helperText={!!confirm && !isMatch ? t('password.notMatch') : undefined}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <LockIcon />
                  </InputAdornment>
                ),
              },
            }}
            disabled={loading}
          />
        </div>
        <div className='text-xs'>
          <div>{t('password.passwordRulesTitle')}</div>
          <ul className='list-disc pl-6'>
            <li className={rules[0] ? 'text-(--color-success-light)' : ''}>{t('password.ruleMinLength')}</li>
            <li className={rules[1] ? 'text-(--color-success-light)' : ''}>{t('password.ruleUppercase')}</li>
            <li className={rules[2] ? 'text-(--color-success-light)' : ''}>{t('password.ruleLowercase')}</li>
            <li className={rules[3] ? 'text-(--color-success-light)' : ''}>{t('password.ruleNumber')}</li>
            <li className={rules[4] ? 'text-(--color-success-light)' : ''}>{t('password.ruleSpecial')}</li>
          </ul>
        </div>
      </form>
    </FormWrapper>
  )
}

export default ChangePasswordForm
