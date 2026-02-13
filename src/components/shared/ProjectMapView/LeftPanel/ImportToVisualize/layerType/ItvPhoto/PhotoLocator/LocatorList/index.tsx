import { FC, useCallback, useMemo } from 'react'
import { ItvPhotoFeature, ItvPhotoLocatorTab } from '../../itv-photo'
import LocatorItem from './LocatorItem'
import { useTranslation } from 'react-i18next'
import { Button, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import classNames from 'classnames'
import useMapStore from '@/components/common/map/store/map'
import { LngLatLike } from 'maplibre-gl'

const mapId = 'itv-photo-locator'

interface LocatorListProps {
  activePhotoList: ItvPhotoFeature[]
  setActivePhotoList: (photoList: ItvPhotoFeature[]) => void
  currentTab: ItvPhotoLocatorTab
  onDelete: (value: string[]) => void
}

const LocatorList: FC<LocatorListProps> = ({ activePhotoList, setActivePhotoList, currentTab, onDelete }) => {
  const { t } = useTranslation('common')
  const { mapLibre } = useMapStore()

  const onSelectPhoto = useCallback(
    (photo: ItvPhotoFeature) => {
      if (photo.geometry) {
        const mapLocator = mapLibre[mapId]
        if (!mapLocator) return
        mapLocator.flyTo({
          center: photo.geometry.coordinates as LngLatLike,
          zoom: 15,
          duration: 1000,
        })
      } else if (currentTab === ItvPhotoLocatorTab.NO_ADDRESS || currentTab === ItvPhotoLocatorTab.ALL) {
        const existIndex = activePhotoList.findIndex((item) => item.id === photo.id)
        if (existIndex > -1) {
          const newPhotoList = [...activePhotoList]
          newPhotoList[existIndex] = { ...newPhotoList[existIndex], selected: !newPhotoList[existIndex].selected }
          setActivePhotoList(newPhotoList)
        }
      }
    },
    [mapLibre, activePhotoList, setActivePhotoList, currentTab],
  )

  const onDeleteClick = () => {
    onDelete(selectedPhotoList.map((photo) => photo.uploadId))
  }

  const isNoAddressOrAllTab = useMemo(
    () => currentTab === ItvPhotoLocatorTab.NO_ADDRESS || currentTab === ItvPhotoLocatorTab.ALL,
    [currentTab],
  )

  const selectedPhotoList = useMemo(() => activePhotoList.filter((photo) => photo.selected), [activePhotoList])

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <Typography className='text-left' variant='subtitle2' component='label'>
          {t('table.totalResult', { count: activePhotoList.length })}
        </Typography>
        {isNoAddressOrAllTab && (
          <Button
            variant='outlined'
            color='error'
            startIcon={<DeleteIcon />}
            onClick={onDeleteClick}
            sx={{ textTransform: 'none' }}
            disabled={selectedPhotoList.length === 0}
          >
            {t('button.delete')}
          </Button>
        )}
      </div>
      <div
        className={classNames('grid grid-cols-3 content-start gap-4 overflow-auto py-2 lg:py-4', {
          'h-[calc(100vh-220px)] lg:h-[calc(100vh-260px)]': isNoAddressOrAllTab,
          'h-[calc(100vh-160px)] lg:h-[calc(100vh-180px)]': !isNoAddressOrAllTab,
        })}
      >
        {activePhotoList?.map((photo) => (
          <LocatorItem
            key={photo.id}
            photo={photo}
            selected={photo.selected}
            onClick={onSelectPhoto}
            currentTab={currentTab}
          />
        ))}
      </div>
    </div>
  )
}
export default LocatorList
