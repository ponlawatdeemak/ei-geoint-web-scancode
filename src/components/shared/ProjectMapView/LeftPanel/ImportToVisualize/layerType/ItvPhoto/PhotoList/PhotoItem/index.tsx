import { TaskFeature } from '@interfaces/index'
import { Menu, MenuItem, ListItemIcon, ListItemText, IconButton, ListItem, Tooltip, Typography } from '@mui/material'

import { FC, memo, useCallback, useMemo, useState } from 'react'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { ItvFeatureProperties } from '@interfaces/entities'
import { Filter, ImageOutlined } from '@mui/icons-material'
import { Point } from 'geojson'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import useMapStore from '@/components/common/map/store/map'
import { LngLatLike } from 'maplibre-gl'

export type PhotoListItem = {
  groupId: string | null
  childList?: {
    id: string
    fileName: string | null
    geometry: Point | null
    photo: ItvFeatureProperties
  }[]
  fileName: string | null
  geometry: Point | null
  createdAt: string
  photo: ItvFeatureProperties | null
}

interface Props {
  feature: PhotoListItem
  onEdit: (value: ItvFeatureProperties[]) => void
  onDelete: (value: string[]) => void
  projectId: string
}
const PhotoItem: FC<Props> = ({ feature, onEdit, onDelete, projectId }) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const { mapLibre } = useMapStore()

  const { t } = useTranslation('common')

  const isNoAddress = useMemo(() => feature.groupId === 'no_address', [feature])
  const isGroup = useMemo(() => feature.groupId, [feature])
  const title = useMemo(() => {
    if (isNoAddress) {
      return '-'
    } else {
      return `${feature.geometry?.coordinates?.[1]?.toFixed(6)}, ${feature.geometry?.coordinates?.[0]?.toFixed(6)}`
    }
  }, [feature, isNoAddress])

  const subtitle = useMemo(() => {
    if (isGroup) {
      return t('itv.upload.photoCount', { count: feature.childList?.length })
    } else {
      return (
        <Tooltip title={feature.fileName || '-'} arrow>
          {/* <Typography noWrap className='text-gray' variant='body2' component='div'>
            {feature.fileName || '-'}
          </Typography> */}
          <div className='flex min-w-0 items-center truncate text-[12px]'>
            <span className='max-w-[200px] truncate'>{feature.fileName}</span>
          </div>
        </Tooltip>
      )
    }
  }, [feature, t, isGroup])

  const onEditClick = useCallback(() => {
    if (feature.groupId && feature.childList) {
      setMenuAnchorEl(null)
      onEdit(feature.childList.map((item) => item.photo))
    }
  }, [feature, onEdit])

  const onDeleteClick = useCallback(() => {
    if (feature.groupId && feature.childList) {
      onDelete(feature.childList.map((item) => item.photo.photoUploadId as string))
    } else {
      onDelete([feature.photo?.photoUploadId as string])
    }
    setMenuAnchorEl(null)
  }, [feature, onDelete])

  const onListItemClick = useCallback(() => {
    // Prevent click if menu is open or if the click target is part of the menu
    if (menuAnchorEl) return

    const mapId = `project-${projectId}-map-view`
    const mapProject = mapLibre[mapId]
    if (!mapProject) return
    if (feature.geometry) {
      mapProject.flyTo({
        center: feature.geometry.coordinates as LngLatLike,
        zoom: 15,
        duration: 1000,
      })
    }
  }, [feature, mapLibre, projectId, menuAnchorEl])

  return (
    <ListItem
      className={classNames(
        'border-white border-b-2 bg-(--color-background-light) pr-1! pl-4! text-inherit last:border-b-0',
        {
          'cursor-pointer hover:bg-(--color-background-dark) hover:text-white': feature.geometry,
        },
      )}
      onClick={onListItemClick}
    >
      <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
        {isGroup ? <Filter /> : <ImageOutlined />}
      </ListItemIcon>
      <ListItemText primary={title} secondary={subtitle} />

      <Tooltip title={t('button.more')} arrow>
        <IconButton
          size='small'
          color={'default'}
          onClick={(e) => {
            e.stopPropagation()
            setMenuAnchorEl(e.currentTarget as HTMLElement)
          }}
          //   onMouseDown={(e) => e.stopPropagation()}
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => {
          setMenuAnchorEl(null)
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isNoAddress && (
          <MenuItem
            onClick={(e) => {
              e.stopPropagation()
              onEditClick()
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize='small' />
            </ListItemIcon>
            <ListItemText>{t('button.edit')}</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          className='text-error!'
          onClick={(e) => {
            e.stopPropagation()
            onDeleteClick()
          }}
        >
          <ListItemIcon>
            <DeleteIcon color='error' fontSize='small' />
          </ListItemIcon>
          <ListItemText>{t('button.delete')}</ListItemText>
        </MenuItem>
      </Menu>
    </ListItem>
  )
}

export default memo(PhotoItem)
