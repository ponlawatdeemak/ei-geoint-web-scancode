'use client'

import { Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { t } = useTranslation('common')

  return (
    <div className='flex h-screen w-full items-center justify-center px-4 py-8'>
      <div className='mx-auto w-full max-w-md rounded-lg bg-white/80 p-6 text-center shadow-md sm:p-8'>
        <div className='mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-red-50'>
          <svg
            width='56'
            height='56'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            aria-hidden='true'
          >
            <path
              d='M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'
              stroke='#DC2626'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>

        <h2 className='font-semibold text-(--color-text-secondary) text-xl'>{t('unauthorized.title')}</h2>
        <p className='mt-1 text-(--color-text-secondary) text-sm'>{t('unauthorized.content')}</p>

        <div className='mt-4 w-full'>
          <Button
            fullWidth
            variant='contained'
            onClick={() => {
              router.push('/project')
            }}
            className='w-full rounded-full bg-blue-600 px-8 py-3 font-medium text-base text-white normal-case hover:bg-blue-700'
          >
            {t('unauthorized.backToProject')}
          </Button>
        </div>
      </div>
    </div>
  )
}
