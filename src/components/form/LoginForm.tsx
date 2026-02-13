'use client'

import { useState } from 'react'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import PersonIcon from '@mui/icons-material/Person'
import LockIcon from '@mui/icons-material/Lock'
import Link from 'next/link'
import PasswordInput from '@/components/common/input/PasswordInput'
import InputLabel from '@/components/common/input/InputLabel'
import { useTranslation } from 'react-i18next'

const LoginForm: React.FC<{
  onSubmit?: (username: string, password: string) => void
  loading?: boolean
  error?: boolean
}> = ({ onSubmit, loading, error }) => {
  const { t } = useTranslation('common')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(username, password)
  }

  return (
    <form onSubmit={handleSubmit} className='mb-4 flex w-full flex-col gap-2 p-8 pb-0 text-white'>
      <div className='text-center font-semibold text-4xl'>{t('form.login.formTitle')}</div>
      <div className='text-center'>{t('form.login.formSubtitle')}</div>
      <div className='mt-6'>
        <InputLabel>{t('form.login.username')}</InputLabel>
        <TextField
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
          fullWidth
          placeholder={t('form.login.usernamePlaceholder')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <PersonIcon />
                </InputAdornment>
              ),
            },
          }}
          autoFocus
          error={error}
        />
      </div>
      <div>
        <InputLabel>{t('form.login.password')}</InputLabel>
        <PasswordInput
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
          }}
          fullWidth
          placeholder={t('form.login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <LockIcon />
                </InputAdornment>
              ),
            },
          }}
          error={error}
        />
        <div className='mt-1 flex justify-end'>
          <Link href='/auth/forgot-password' className='text-xs'>
            {t('form.login.forgotPassword')}
          </Link>
        </div>
      </div>
      <Button
        className='mt-6!'
        type='submit'
        variant='contained'
        color='primary'
        disabled={!username || !password}
        loading={loading}
      >
        {t('form.login.loginButton')}
      </Button>
    </form>
  )
}

export default LoginForm
