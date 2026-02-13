'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import LoginForm from '@/components/form/LoginForm'
import OtpForm from '@/components/form/OtpForm'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'

const LoginPage = () => {
  const { t } = useTranslation('common')
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/project'
  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [error, setError] = useState(false)
  const [otpToken, setOtpToken] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpRef, setOtpRef] = useState('')
  const { showLoading, hideLoading, showAlert } = useGlobalUI()

  const handleLogin = async (username: string, password: string) => {
    setError(false)
    showLoading()
    try {
      const data = await service.auth.login({ userName: username, password })
      setOtpToken(data.token)
      setOtpEmail(data.email)
      setOtpRef(data.ref)
      setStep('otp')
    } catch (err: any) {
      setError(true)
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      hideLoading()
    }
  }

  const handleOtp = async (otp: string) => {
    showLoading()
    try {
      const data = await service.auth.confirmOtpLogin({ token: otpToken, otp })
      const result = await signIn('credentials', {
        callbackUrl,
        redirect: true,
        ...data,
      })
      if (result?.error) throw new Error(result.error)
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      hideLoading()
    }
  }

  const handleResendOtp = async () => {
    showLoading()
    try {
      const data = await service.auth.refreshOtpLogin({ token: otpToken })
      setOtpToken(data.token)
      setOtpEmail(data.email)
      setOtpRef(data.ref)
      showAlert({
        status: 'success',
        title: t('form.login.otpSent'),
        content: t('form.login.checkEmail'),
      })
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      hideLoading()
    }
  }

  return step === 'login' ? (
    <LoginForm onSubmit={handleLogin} loading={false} error={error} />
  ) : (
    <OtpForm onSubmit={handleOtp} loading={false} email={otpEmail} refCode={otpRef} onResend={handleResendOtp} />
  )
}

export default LoginPage
