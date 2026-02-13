import { ListItemIcon, ListItemText, IconButton, ListItem } from '@mui/material'
import { FC, memo, useCallback, useMemo } from 'react'
import LocationPinIcon from '@mui/icons-material/LocationPin'
import DeleteIcon from '@mui/icons-material/Delete'
import { ItvFeatureProperties } from '@interfaces/entities'
import classNames from 'classnames'
import useMapStore from '@/components/common/map/store/map'
import { LngLatBoundsLike, LngLatLike } from 'maplibre-gl'
import { PolygonIcon, PolylineIcon } from '@/icons'
import * as turf from '@turf/turf'
import { useTranslation } from 'react-i18next'

interface Props {
  feature: ItvFeatureProperties
  onDelete: (value: string) => void
  projectId: string
}

const VectorItem: FC<Props> = ({ feature, onDelete, projectId }) => {
  const { mapLibre } = useMapStore()
  const { t } = useTranslation('common')

  const title = useMemo(() => {
    if (feature.geometry?.type === 'Point' || feature.geometry?.type === 'MultiPoint') {
      const center = turf.center(feature.geometry)
      const coords = center.geometry.coordinates as number[]
      return `${coords[1]?.toFixed(6)}, ${coords[0]?.toFixed(6)}`
    } else if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
      return `${Number(feature.vectorLength).toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      })} ${t('unit.length.kmAbbr')}`
    } else if (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon') {
      return `${Number(feature.vectorArea).toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      })} ${t('unit.area.sqkmAbbr')}`
    }
    return '-'
  }, [feature, t])

  const onDeleteClick = useCallback(() => {
    onDelete(feature.id as string)
  }, [feature, onDelete])

  const onListItemClick = useCallback(() => {
    const mapId = `project-${projectId}-map-view`
    const mapProject = mapLibre[mapId]
    if (!mapProject || !feature.geometry) return
    if (feature.geometry.type === 'Point') {
      const center = turf.center(feature.geometry)
      mapProject.flyTo({
        center: center.geometry.coordinates as LngLatLike,
        zoom: 15,
        duration: 1000,
      })
    } else if (
      feature.geometry.type === 'MultiPoint' ||
      feature.geometry.type === 'LineString' ||
      feature.geometry.type === 'Polygon' ||
      feature.geometry.type === 'MultiLineString' ||
      feature.geometry.type === 'MultiPolygon'
    ) {
      mapProject.fitBounds(feature.geometry.bbox as LngLatBoundsLike, {
        padding: 50,
        duration: 1000,
      })
    }
  }, [feature, mapLibre, projectId])

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
        {(feature.geometry?.type === 'Point' || feature.geometry?.type === 'MultiPoint') && <LocationPinIcon />}
        {(feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') && <PolylineIcon />}
        {(feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon') && <PolygonIcon />}
      </ListItemIcon>
      <ListItemText primary={title} />

      <IconButton
        size='small'
        className='text-error!'
        onClick={(e) => {
          e.stopPropagation()
          onDeleteClick()
        }}
      >
        <DeleteIcon />
      </IconButton>
    </ListItem>
  )
}

export default memo(VectorItem)
