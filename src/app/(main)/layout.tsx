'use client'

import { useEffect } from 'react'
import Header from '@/components/layout/Header'
import { useProfileStore, fetchAndStoreProfile } from '@/hook/useProfileStore'
import UploadProgress from '../../components/common/display/UploadProgress'

const Layout = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    fetchAndStoreProfile()
  }, [])

  const profile = useProfileStore((state) => state.profile)

  return (
    <div className='flex min-h-screen flex-col'>
      <div className='flex flex-shrink-0'>
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
