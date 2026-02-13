'use client'

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import LoadingScreen from '@/components/common/loading/LoadingScreen'
import AlertConfirm, { AlertStatus } from '@/components/common/dialog/AlertConfirm'
import SettingsDialog from '@/components/common/dialog/SettingsDialog'
import { useTranslation } from 'react-i18next'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'

dayjs.extend(buddhistEra)

class BuddhistAdapter extends AdapterDayjs {
  _setLocaleToValue = (value: Dayjs) => {
    const expectedLocale = this.getCurrentLocaleCode()
    if (expectedLocale === value.locale()) {
      return value
    }
    return value.locale(expectedLocale)
  }
  formatByString = (value: Dayjs, formatString: string) => {
    value = this._setLocaleToValue(value)
    if (value.locale() === 'th') {
      formatString = formatString.replace('YYYY', 'BBBB').replace('YY', 'BB')
    }
    return value.format(formatString)
  }
}

interface AlertOptions {
  status?: AlertStatus
  title?: string
  content?: React.ReactNode
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void | Promise<void>
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  errorCode?: string
  noBackdrop?: boolean
}

interface GlobalUIContextProps {
  loading: boolean
  showLoading: () => void
  hideLoading: () => void
  showAlert: (options: AlertOptions) => void
  hideAlert: () => void
  signOut: () => void
  showSettings: () => void
}

const GlobalUIContext = createContext<GlobalUIContextProps | undefined>(undefined)

export const GlobalUIProvider = ({ children }: { children: ReactNode }) => {
  const { t, i18n } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<AlertOptions & { open: boolean }>({ open: false })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const showSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  const hideSettings = useCallback(() => {
    setSettingsOpen(false)
  }, [])

  const showLoading = useCallback(() => setLoading(true), [])
  const hideLoading = useCallback(() => setLoading(false), [])

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert({ ...options, open: true })
  }, [])

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }))
  }, [])

  const signOutWithConfirm = useCallback(() => {
    showAlert({
      status: 'warning',
      title: t('alert.confirmSignOutTitle'),
      content: t('alert.confirmSignOutContent'),
      showCancel: true,
      onConfirm: () => {
        showLoading()
        signOut()
      },
    })
  }, [showAlert, t, showLoading])

  const contextValue = React.useMemo(
    () => ({
      loading,
      showLoading,
      hideLoading,
      showAlert,
      hideAlert,
      signOut: signOutWithConfirm,
      showSettings,
    }),
    [loading, showLoading, hideLoading, showAlert, hideAlert, signOutWithConfirm, showSettings],
  )
  return (
    <GlobalUIContext.Provider value={contextValue}>
      <LocalizationProvider
        dateAdapter={BuddhistAdapter}
        adapterLocale={i18n.language}
        localeText={{
          okButtonLabel: t('button.ok'),
          cancelButtonLabel: t('button.cancel'),
          nextStepButtonLabel: t('button.next'),
          datePickerToolbarTitle: t('dialog.datePicker.selectDate'),
        }}
      >
        {mounted && children}
        {loading && <LoadingScreen />}
        <AlertConfirm
          open={alert.open}
          status={alert.status}
          title={alert.errorCode && !alert.title ? t('alert.errorTitle') : alert.title}
          content={alert.errorCode && !alert.content ? t([`error.${alert.errorCode}`, 'error.UNKNOWN']) : alert.content}
          onConfirm={() => {
            alert.onConfirm?.()
            hideAlert()
          }}
          onCancel={() => {
            alert.onCancel?.()
            hideAlert()
          }}
          confirmText={alert.confirmText}
          cancelText={alert.cancelText}
          showCancel={alert.showCancel}
          noBackdrop={alert.noBackdrop}
        />
        <SettingsDialog open={settingsOpen} onClose={hideSettings} />
      </LocalizationProvider>
    </GlobalUIContext.Provider>
  )
}

export const useGlobalUI = () => {
  const context = useContext(GlobalUIContext)
  if (!context) throw new Error('useGlobalUI must be used within a GlobalUIProvider')
  return context
}
