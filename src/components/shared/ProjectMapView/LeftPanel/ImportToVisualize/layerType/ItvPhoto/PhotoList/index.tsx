import { FC, useMemo } from 'react'
import PhotoItem, { PhotoListItem } from './PhotoItem'
import Empty from '@/components/common/empty'
import { useTranslation } from 'react-i18next'
import { List } from '@mui/material'
import { ItvFeatureProperties } from '@interfaces/entities'
import { Point } from 'geojson'

interface Props {
  features: ItvFeatureProperties[]
  onEdit: (value: ItvFeatureProperties[]) => void
  onDelete: (value: string[]) => void
  projectId: string
}
const PhotoList: FC<Props> = ({ features, onEdit, onDelete, projectId }) => {
  const { t } = useTranslation('common')

  const photoList: PhotoListItem[] = useMemo(() => {
    const photoNoGeometry: ItvFeatureProperties[] = []
    const photoWithGeometry: ItvFeatureProperties[] = []
    const groupStore = features.reduce(
      (acc, row) => {
        if (row.photoGroupId) {
          acc[row.photoGroupId] = acc[row.photoGroupId] || []
          acc[row.photoGroupId].push(row)
        } else if (row.geometry) {
          photoWithGeometry.push(row)
        } else {
          photoNoGeometry.push(row)
        }
        return acc
      },
      {} as Record<string, ItvFeatureProperties[]>,
    )
    const groupList = Object.keys(groupStore).map((row) => {
      return {
        groupId: row,
        childList: groupStore[row].map((item) => ({
          id: item.id,
          fileName: item.photoFileName,
          geometry: item.geometry as Point,
          photo: item,
        })),
        geometry: groupStore[row][0]?.geometry as Point,
        createdAt: groupStore[row][0]?.createdAt,
        fileName: null,
        photo: null,
      }
    })
    const noAddressItem = {
      groupId: 'no_address',
      childList: photoNoGeometry.map((item) => ({
        id: item.id,
        fileName: item.photoFileName,
        geometry: item.geometry as Point,
        photo: item,
      })),
      geometry: null,
      createdAt: new Date().toISOString(),
      fileName: null,
      photo: null,
    }
    const addressList = photoWithGeometry.map((item) => ({
      id: item.id,
      fileName: item.photoFileName,
      geometry: item.geometry as Point,
      createdAt: item.createdAt,
      groupId: null,
      photo: item,
    }))
    const sortList = [...addressList, ...groupList].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return 0
    })
    const result: PhotoListItem[] = noAddressItem.childList.length > 0 ? [noAddressItem, ...sortList] : sortList
    return result
  }, [features])
  return (
    <div className='flex flex-col gap-2'>
      {features.length === 0 ? (
        <Empty message={t('empty.noList')} />
      ) : (
        <div className='h-[calc(100vh-520px)] overflow-auto sm:h-[calc(100vh-550px)] md:h-[calc(100vh-540px)]'>
          <List sx={{ p: 0, gap: 2 }}>
            {photoList.map((row) => {
              return (
                <PhotoItem
                  key={row.photo?.id}
                  feature={row}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  projectId={projectId}
                />
              )
            })}
          </List>
        </div>
      )}
    </div>
  )
}

export default PhotoList
