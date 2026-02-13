'use client'

import React from 'react'
import Dialog from '@mui/material/Dialog'
import Button from '@mui/material/Button'
import { useTranslation } from 'react-i18next'
import { DialogActions, DialogContent, DialogTitle } from '@mui/material'

export type AlertStatus =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'confirm-save'
  | 'confirm-delete'
  | 'confirm-cancel'

interface AlertConfirmProps {
  open: boolean
  status?: AlertStatus
  title?: string
  content?: React.ReactNode
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  noBackdrop?: boolean
}

const statusDefaults: Record<AlertStatus, { confirm: string; cancel: string; title?: string; content?: string }> = {
  success: { confirm: 'button.ok', cancel: 'button.cancel' },
  warning: { confirm: 'button.ok', cancel: 'button.cancel' },
  error: { confirm: 'button.ok', cancel: 'button.cancel' },
  info: { confirm: 'button.ok', cancel: 'button.cancel' },
  'confirm-save': {
    confirm: 'button.save',
    cancel: 'button.cancel',
    title: 'alert.confirmSaveTitle',
    content: 'alert.confirmSaveContent',
  },
  'confirm-delete': {
    confirm: 'button.delete',
    cancel: 'button.cancel',
    title: 'alert.confirmDeleteTitle',
    content: 'alert.confirmDeleteContent',
  },
  'confirm-cancel': {
    confirm: 'button.ok',
    cancel: 'button.cancel',
    title: 'alert.confirmCancelTitle',
    content: 'alert.confirmCancelContent',
  },
}

const AlertConfirm: React.FC<AlertConfirmProps> = ({
  open,
  status = 'info',
  title,
  content,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  showCancel,
  noBackdrop,
}) => {
  const { t } = useTranslation('common')
  const confirmLabel = confirmText || t(statusDefaults[status].confirm)
  const cancelLabel = cancelText || t(statusDefaults[status].cancel)
  title = title || (statusDefaults[status].title ? t(statusDefaults[status].title!) : undefined)
  content = content || (statusDefaults[status].content ? t(statusDefaults[status].content!) : undefined)
  return (
    <Dialog
      open={open}
      onClose={noBackdrop ? undefined : onCancel}
      slotProps={{
        paper: {
          className: 'rounded-xl',
          sx: { minWidth: 340, maxWidth: 400, boxShadow: 3 },
        },
      }}
    >
      {title && (
        <DialogTitle color={['error', 'confirm-delete'].includes(status) ? 'error' : undefined}>{title}</DialogTitle>
      )}
      {content && <DialogContent>{content}</DialogContent>}
      <DialogActions>
        {showCancel && onCancel && <Button onClick={onCancel}>{cancelLabel}</Button>}
        <Button onClick={onConfirm} color={status === 'confirm-delete' ? 'error' : 'primary'}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AlertConfirm
