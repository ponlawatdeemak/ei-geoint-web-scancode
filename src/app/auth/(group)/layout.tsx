'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import LanguageSwitch from '@/components/common/switch/LangaugeSwitch'
import { useTranslation } from 'react-i18next'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation('common')
  return (
    <div className='relative flex min-h-screen items-center justify-center sm:min-h-192 md:min-h-screen'>
      <Image className='z-0 object-cover' src='/images/bg_world_map.svg' alt='Background' fill priority />
      <div className='z-10 flex max-h-screen w-full max-w-md flex-col overflow-y-auto rounded-2xl bg-white/30 backdrop-blur-xs sm:max-h-192 md:max-h-[768px] md:max-w-4xl md:flex-row'>
        <div className='flex w-full flex-col items-center justify-center p-4 md:w-1/2'>
          <Image src='/images/logo_iris.png' alt='App Logo' width={160} height={80} priority />
          <span className='mt-4'>{t('app.name')}</span>
        </div>
        <div className='flex max-h-screen w-full flex-col overflow-y-auto rounded-2xl bg-(--color-background-dark) sm:max-h-192 md:w-1/2'>
          <div className='flex w-full justify-end p-8 pb-0'>
            <div className='rounded-xl bg-white px-3 py-2'>
              <LanguageSwitch />
            </div>
          </div>
          <div className='flex-1'>{children}</div>
          {CONTACT_EMAIL && (
            <div className='mt-2 pb-8 text-center text-white'>
              <Link href={`mailto:${CONTACT_EMAIL}?subject=แจ้งปัญหาการเข้าใช้งาน`} className='text-sm underline'>
                {t('link.contactUs')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Layout
