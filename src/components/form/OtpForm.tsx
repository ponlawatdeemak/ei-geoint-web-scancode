'use client'

import { useState, useEffect } from 'react'
import Button from '@mui/material/Button'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import OTPInput from '@/components/common/input/OTPInput'
import { useTranslation } from 'react-i18next'
import { maskEmail } from '@/utils/text'

const OtpForm: React.FC<{
  onSubmit?: (otp: string) => void
  loading?: boolean
  email?: string
  refCode?: string
  onResend?: () => void
  resendSeconds?: number
}> = ({ onSubmit, loading, email, refCode, onResend, resendSeconds = 299 }) => {
  const { t } = useTranslation('common')
  const [otp, setOtp] = useState('')
  const [timer, setTimer] = useState(0) // allow resend immediately on first render
  const [hasResent, setHasResent] = useState(false)

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000)
      return () => clearInterval(interval)
    }
  }, [timer])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(otp)
  }

  const handleResend = () => {
    if (timer === 0 && onResend) {
      setOtp('')
      setHasResent(true)
      setTimer(resendSeconds)
      onResend()
    }
  }

  return (
    <form onSubmit={handleSubmit} className='mb-4 flex w-full flex-col gap-2 p-8 text-white'>
      <div className='text-center font-semibold text-4xl'>{t('form.login.otpFormTitle')}</div>
      <div className='text-center'>
        {t('form.login.otpSentToEmail', { email: maskEmail(email), refCode })}
        <br />
        {t('form.login.checkEmail')}
      </div>
      <OTPInput
        className='mt-6 text-(--color-text-primary)'
        value={otp}
        onChange={setOtp}
        length={6}
        disabled={loading}
      />
      <Button
        className='w-auto self-center'
        variant='text'
        color='inherit'
        onClick={handleResend}
        startIcon={<AutorenewIcon />}
        size='small'
        disabled={timer > 0}
      >
        {hasResent ? t('form.login.resendOtp') : t('form.login.requestNewOtp')}
        {hasResent && timer > 0 ? (
          <span className='ml-1'>
            {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
          </span>
        ) : null}
      </Button>
      <Button
        className='mt-6!'
        type='submit'
        variant='contained'
        color='primary'
        disabled={otp.length !== 6}
        loading={loading}
      >
        {t('form.login.loginButton')}
      </Button>
    </form>
  )
}

export default OtpForm
