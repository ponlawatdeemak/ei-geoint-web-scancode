'use client'

import { useEffect, useMemo } from 'react'
import Header from '@/components/layout/Header'
import { useProfileStore, fetchAndStoreProfile } from '@/hook/useProfileStore'
import UploadProgress from '../../components/common/display/UploadProgress'

const Layout = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    fetchAndStoreProfile()
  }, [])

  const profile = useProfileStore((state) => state.profile)
  const isSafari = useMemo(() => {
    return navigator?.userAgent?.includes('Safari') && !navigator?.userAgent?.includes('Chrome')
  }, [])

  return (
    <div className={`${isSafari ? 'is-safari' : ''} flex min-h-screen flex-col`}>
      <div className='flex shrink-0'>
        <Header />
      </div>
      <div className='flex-1 overflow-hidden'>
        {!!profile && (
          <>
            {children}
            <UploadProgress />
          </>
        )}
      </div>
    </div>
  )
}
export default Layout
