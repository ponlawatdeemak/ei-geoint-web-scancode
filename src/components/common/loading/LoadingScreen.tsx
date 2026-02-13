'use client'

import { CircularProgress } from '@mui/material'

const LoadingScreen = () => {
  return (
    <div className='fixed inset-0 z-[2000] flex min-h-screen min-w-screen flex-col items-center justify-center backdrop-blur-sm'>
      <CircularProgress size={80} color='primary' />
    </div>
  )
}

export default LoadingScreen
