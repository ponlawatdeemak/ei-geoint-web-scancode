import { Tabs, Tab, IconButton } from '@mui/material'

import React, { useState } from 'react'
import SymbolAll from './SymbolAll'
import Search from './Search'
import { useTranslation } from 'react-i18next'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { App6eMainIcon, App6eSymbolSet } from '@interfaces/entities'

type Props = {
  onSelect?: (data: { sidc: string; icon: App6eMainIcon; symbolSet: App6eSymbolSet }) => void
  onCancel?: () => void
}

const AnnotationSymbol: React.FC<Props> = ({ onSelect, onCancel }) => {
  const [activeTab, setActiveTab] = useState(0)
  const { t } = useTranslation('common')

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='mb-1 flex shrink-0 items-center'>
        <IconButton onClick={onCancel} size='small'>
          <ChevronLeftIcon className='text-[#040904]' />{' '}
        </IconButton>
        <p className='font-medium text-[#040904] text-base'>{t('itv.button.addDraw')}</p>
      </div>
      <div className='shrink-0 px-0 md:px-2'>
        <Tabs value={activeTab} onChange={handleChange} variant='fullWidth' aria-label='symbol annotation tabs'>
          <Tab label={t('annotation.symbolAll') ?? 'All Symbols'} />
          <Tab label={t('annotation.symbolSearch') ?? 'Search Symbols'} />
        </Tabs>
      </div>
      <div className='flex-1 overflow-y-auto px-2 pt-2'>
        {activeTab === 0 && <SymbolAll onSelect={onSelect} />}
        {activeTab === 1 && <Search onSelect={onSelect} />}
      </div>
    </div>
  )
}

export default AnnotationSymbol
