import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material'
import { Alert, Snackbar } from '@mui/material'
import classNames from 'classnames'
import React from 'react'

export interface AlertInfoType {
  open: boolean
  severity: 'success' | 'error'
  message: string
}

interface AlertSnackbarProps {
  className?: string
  alertInfo: AlertInfoType
  onClose: () => void
}

const AlertSnackbar: React.FC<AlertSnackbarProps> = ({ className = '', alertInfo, onClose }) => {
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      open={alertInfo.open}
      autoHideDuration={6000}
      onClose={onClose}
      className={classNames(
        '[&_.MuiAlert-action]:pt-0 [&_.MuiAlert-message]:text-white [&_.MuiAlert-message]:text-xs',
        className,
      )}
    >
      <Alert
        className='!rounded-[10px] min-h-[66px] min-w-[300px] shadow-[6px_6px_10px_0_rgba(0,0,0,0.18)] [&_>div]:self-center'
        variant='filled'
        iconMapping={{
          success: <CheckCircle className='!h-9 !w-9' />,
          error: <ErrorIcon className='!h-9 !w-9' />,
        }}
        severity={alertInfo.severity}
        onClose={onClose}
      >
        {alertInfo.message}
      </Alert>
    </Snackbar>
  )
}

export default AlertSnackbar
