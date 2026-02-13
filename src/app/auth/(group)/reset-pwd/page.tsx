'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ResetPasswordForm from '@/components/form/ResetPasswordForm'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useTranslation } from 'react-i18next'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'

const ResetPasswordPage = () => {
  const { t } = useTranslation('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading, showLoading, hideLoading, showAlert } = useGlobalUI()
  const { data: session } = useSession()
  const id = searchParams.get('id') || ''
  useEffect(() => {
    if (!id) {
      showAlert({
        status: 'error',
        errorCode: 'INCORRECT_RESET_PASSWORD_LINK',
        onConfirm: () => router.replace('/auth/login'),
      })
      return
    }
    const verify = async () => {
      showLoading()
      try {
        await service.auth.verifyToken({ id })

        // If token is verified and user has active session, logout existing session
        if (session?.user?.accessToken) {
          try {
            await service.auth.logout({ accessToken: session.user.accessToken })
          } catch (err) {
            console.warn('Failed to logout from API:', err)
          }
          // Sign out from NextAuth
          await signOut({ redirect: false })
        }
      } catch {
        showAlert({
          status: 'error',
          errorCode: 'INCORRECT_RESET_PASSWORD_LINK',
          onConfirm: () => router.replace('/auth/login'),
        })
        router.replace('/auth/login')
      } finally {
        hideLoading()
      }
    }
    verify()
  }, [id, showLoading, hideLoading, showAlert, router.replace, session])
  const [error, setError] = useState(false)

  const handleSubmit = async (password: string) => {
    setError(false)
    showLoading()
    try {
      await service.auth.resetPassword({ id, newPassword: password })
      showAlert({
        status: 'success',
        title: t('form.changePassword.successTitle'),
        content: t('form.resetPassword.successContent'),
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
    <ResetPasswordForm
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      onCancel={() => router.replace('/auth/login')}
    />
  )
}

export default ResetPasswordPage
