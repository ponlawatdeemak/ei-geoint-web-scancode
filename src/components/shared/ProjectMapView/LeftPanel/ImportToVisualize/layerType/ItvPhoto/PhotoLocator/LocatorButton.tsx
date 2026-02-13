import { ButtonGroup, Button } from '@mui/material'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { ItvPhotoLocatorTab } from '../itv-photo'
import classNames from 'classnames'

interface LocatorButtonProps {
  currentTab: ItvPhotoLocatorTab
  setCurrentTab: (tab: ItvPhotoLocatorTab) => void
  countAll: number
  countAddress: number
}
const LocatorButton: FC<LocatorButtonProps> = ({ currentTab, setCurrentTab, countAll = 0, countAddress = 0 }) => {
  const { t } = useTranslation('common')
  return (
    <ButtonGroup
      size='small'
      variant='text'
      aria-label='Basic button group'
      className='lg:inherit flex h-6 w-full justify-between lg:justify-normal [&>button]:flex-1 lg:[&>button]:flex-none'
    >
      <Button
        onClick={() => setCurrentTab(ItvPhotoLocatorTab.ALL)}
        className={classNames({ 'text-gray!': currentTab !== ItvPhotoLocatorTab.ALL })}
      >
        {t('itv.upload.locator.all')} ({countAll})
      </Button>
      <Button
        onClick={() => setCurrentTab(ItvPhotoLocatorTab.ADDRESS)}
        className={classNames({ 'text-gray!': currentTab !== ItvPhotoLocatorTab.ADDRESS })}
      >
        {t('itv.upload.locator.address')} ({countAddress})
      </Button>
      <Button
        onClick={() => setCurrentTab(ItvPhotoLocatorTab.NO_ADDRESS)}
        className={classNames({ 'text-gray!': currentTab !== ItvPhotoLocatorTab.NO_ADDRESS })}
      >
        {t('itv.upload.locator.noAddress')} ({countAll - countAddress})
      </Button>
    </ButtonGroup>
  )
}

export default LocatorButton
