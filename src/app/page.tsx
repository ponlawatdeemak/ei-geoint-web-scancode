'use client'

import i18next from '@/i18n/i18next'
import Image from 'next/image'

import { useTranslation } from 'react-i18next'

export default function Home() {
  const { t } = useTranslation('common')

  const toggleLang = (language: string) => {
    i18next.changeLanguage(language)
  }

  return (
    <div className='grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-sans sm:p-20'>
      <main className='row-start-2 flex flex-col items-center gap-[32px] sm:items-start'>
        <Image className='dark:invert' src='/next.svg' alt='Next.js logo' width={180} height={38} priority />
        <p className='mt-2'>{t('app.name', { name: 'Ponlawat' })}</p>

        <div className='mt-4 space-x-2'>
          <button type='button' onClick={() => toggleLang('th')} className='rounded bg-blue-500 px-4 py-2 text-white'>
            ไทย
          </button>
          <button type='button' onClick={() => toggleLang('en')} className='rounded bg-green-500 px-4 py-2 text-white'>
            English
          </button>
        </div>
      </main>
    </div>
  )
}
