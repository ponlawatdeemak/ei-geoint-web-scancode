'use client'

import { updateAccessToken } from '@/api/core'
import LoadingScreen from '@/components/common/loading/LoadingScreen'
import { AuthPath, authPathPrefix, errorPathPrefix } from '@interfaces/index'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { Button } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface TokenProviderProps extends PropsWithChildren {}

const TokenProvider: React.FC<TokenProviderProps> = ({ children }) => {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionExpired = useMemo(() => Number(searchParams?.get('sessionExpired') ?? 0), [searchParams])

  useEffect(() => {
    const accessToken = session?.user?.accessToken
    const refreshToken = session?.user?.refreshToken
    if (accessToken) {
      updateAccessToken({ accessToken, refreshToken })
      setAccessToken(accessToken)
    } else {
      updateAccessToken({})
    }
  }, [session])

  // allow auth/error pages to render without gating
  if (pathname?.includes(authPathPrefix) || pathname?.includes(errorPathPrefix)) {
    return children
  }

  // show session-expired UI when session has an error
  if ((status === 'authenticated' && session?.error) || sessionExpired === 1) {
    return (
      <div className='flex h-screen w-full items-center justify-center px-4 py-8'>
        <div className='mx-auto w-full max-w-md rounded-lg bg-white/80 p-6 text-center shadow-md sm:p-8'>
          <div className='mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50'>
            <svg
              width='56'
              height='56'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M12 7V12L15 14'
                stroke='#0B5FFF'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <path
                d='M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z'
                stroke='#0B5FFF'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </div>

          <h2 className='font-semibold text-(--color-text-secondary) text-xl'>{t('session.expiredTitle')}</h2>
          <p className='mt-1 text-(--color-text-secondary) text-sm'>{t('session.expiredContent')}</p>

          <div className='mt-4 w-full'>
            <Button
              fullWidth
              variant='contained'
              onClick={() => {
                signOut({
                  callbackUrl: AuthPath.Login, // จะ redirect ไปหน้านี้หลัง logout
                })
              }}
              className='w-full rounded-full bg-blue-600 px-8 py-3 font-medium text-base text-white normal-case hover:bg-blue-700'
            >
              {t('session.backToLogin')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (accessToken) return children

  return <LoadingScreen />
}

export default TokenProvider
