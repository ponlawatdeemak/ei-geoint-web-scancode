'use client'

import { useState } from 'react'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import InputLabel from '@/components/common/input/InputLabel'
import { useTranslation } from 'react-i18next'

const ForgotPasswordForm: React.FC<{
  onSubmit?: (email: string) => void
  loading?: boolean
  error?: boolean
  onCancel?: () => void
}> = ({ onSubmit, loading, error, onCancel }) => {
  const { t } = useTranslation('common')
  const [email, setEmail] = useState('')
  const isValidEmail = (email: string) => /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,252}\.[a-zA-Z]{2,}$/.test(email)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(email)
  }

  return (
    <form onSubmit={handleSubmit} className='mb-4 flex w-full flex-col gap-2 p-8 pb-0 text-white'>
      <div className='text-center font-semibold text-4xl'>{t('form.forgotPassword.formTitle')}</div>
      <div className='text-center'>{t('form.forgotPassword.formSubtitle')}</div>
      <div className='mt-6'>
        <InputLabel>{t('form.forgotPassword.email')}</InputLabel>
        <TextField
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
          fullWidth
          placeholder={t('form.forgotPassword.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
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
          disabled={!email || !isValidEmail(email)}
          loading={loading}
        >
          {t('button.confirm')}
        </Button>
      </div>
    </form>
  )
}

export default ForgotPasswordForm
