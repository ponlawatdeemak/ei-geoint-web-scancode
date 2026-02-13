'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ForgotPasswordForm from '@/components/form/ForgotPasswordForm'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'

const ForgotPasswordPage = () => {
  const { t } = useTranslation('common')
  const [error, setError] = useState(false)
  const router = useRouter()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()

  const handleSubmit = async (email: string) => {
    setError(false)
    showLoading()
    try {
      await service.auth.forgotPassword({ userName: email })
      showAlert({
        status: 'success',
        title: t('form.forgotPassword.successTitle'),
        content: t('form.forgotPassword.successContent'),
        onConfirm: () => router.replace('/auth/login'),
      })
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

  return (
    <ForgotPasswordForm
      onSubmit={handleSubmit}
      loading={false}
      error={error}
      onCancel={() => router.replace('/auth/login')}
    />
  )
}

export default ForgotPasswordPage
