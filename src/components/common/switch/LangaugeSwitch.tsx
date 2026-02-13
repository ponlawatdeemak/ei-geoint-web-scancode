'use client'

import React from 'react'
import Image from 'next/image'
import IconButton from '@mui/material/IconButton'
import { useSettings, languageFlags } from '@/hook/useSettings'

interface LanguageSwitchProps {
  size?: number
  disabled?: boolean
}

const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ size = 24, disabled = false }) => {
  const { language, setLanguage } = useSettings()

  return (
    <div className='flex items-center gap-2'>
      <IconButton
        onClick={() => setLanguage('th')}
        disabled={disabled}
        className='overflow-hidden rounded-full p-0 transition-opacity'
        sx={{
          opacity: language === 'th' ? 1 : 0.38,
          width: size,
          height: size,
        }}
      >
        <Image className='object-cover' src={languageFlags.th} alt='TH' fill />
      </IconButton>
      <IconButton
        onClick={() => setLanguage('en')}
        disabled={disabled}
        className='overflow-hidden rounded-full p-0 transition-opacity'
        sx={{
          opacity: language === 'en' ? 1 : 0.38,
          width: size,
          height: size,
        }}
      >
        <Image className='object-cover' src={languageFlags.en} alt='EN' fill />
      </IconButton>
    </div>
  )
}

export default LanguageSwitch
