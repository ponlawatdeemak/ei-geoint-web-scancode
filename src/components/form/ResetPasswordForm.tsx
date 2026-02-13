'use client'

import { useState } from 'react'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import PasswordInput from '@/components/common/input/PasswordInput'
import InputLabel from '@/components/common/input/InputLabel'
import LockIcon from '@mui/icons-material/Lock'
import { passwordRules } from '@/utils/rules'
import { useTranslation } from 'react-i18next'

const ResetPasswordForm: React.FC<{
  onSubmit?: (password: string) => void
  loading?: boolean
  error?: boolean
  onCancel?: () => void
}> = ({ onSubmit, loading, error, onCancel }) => {
  const { t } = useTranslation('common')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const rules = passwordRules(password)
  const isPasswordValid = rules.every(Boolean)
  const isMatch = password === confirm && confirm.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isPasswordValid && isMatch) onSubmit?.(password)
  }

  return (
    <form onSubmit={handleSubmit} className='mb-4 flex w-full flex-col gap-2 p-8 pb-0 text-white'>
      <div className='text-center font-semibold text-4xl'>{t('form.resetPassword.formTitle')}</div>
      <div className='text-center'>{t('form.resetPassword.formSubtitle')}</div>
      <div className='mt-6'>
        <InputLabel>{t('form.resetPassword.newPassword')}</InputLabel>
        <PasswordInput
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
          fullWidth
          placeholder={t('form.resetPassword.newPassword')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error || (!!password && !isPasswordValid)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <LockIcon />
                </InputAdornment>
              ),
            },
          }}
        />
      </div>
      <div>
        <InputLabel>{t('form.resetPassword.confirmNewPassword')}</InputLabel>
        <PasswordInput
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
          fullWidth
          placeholder={t('form.resetPassword.confirmNewPassword')}
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
      <div className='mt-6 flex gap-2'>
        <Button
          variant='contained'
          fullWidth
          onClick={onCancel}
          disabled={loading}
          sx={{
            backgroundColor: 'white',
            color: 'var(--color-text-secondary)',
            '&:hover': {
              backgroundColor: '#f0f0f0',
              color: 'var(--color-text-primary)',
            },
          }}
        >
          {t('button.cancel')}
        </Button>
        <Button
          type='submit'
          variant='contained'
          color='primary'
          fullWidth
          disabled={!isPasswordValid || !isMatch}
          loading={loading}
        >
          {t('button.save')}
        </Button>
      </div>
    </form>
  )
}

export default ResetPasswordForm
