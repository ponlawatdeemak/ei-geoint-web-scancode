import { FC, useCallback, useMemo } from 'react'
import Image from 'next/image'
// import PhotoItem, { PhotoListItem } from './PhotoItem'
import EditIcon from '@mui/icons-material/Edit'
import Empty from '@/components/common/empty'
import { useTranslation } from 'react-i18next'
import { IconButton, List, ListItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material'
import { ItvFeatureProperties } from '@interfaces/entities'
import { LineString, Point, Polygon, Position } from 'geojson'
import { ItvDrawFeature } from '../itv-draw'
import { ItvDrawPolygonType, ItvDrawType } from '@interfaces/config/app.config'
import DeleteIcon from '@mui/icons-material/Delete'
import classNames from 'classnames'
import { useMapStore } from '@/components/common/map/store/map'
import * as turf from '@turf/turf'
import TimelineIcon from '@mui/icons-material/Timeline'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import CircleIcon from '@mui/icons-material/Circle'

interface Props {
  features: ItvFeatureProperties[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  mapId: string
}
const DrawList: FC<Props> = ({ features, onEdit, onDelete, mapId }) => {
  const { t } = useTranslation('common')
  const { mapLibre } = useMapStore()

  const calculateBounds = useCallback(
    (geometry: Point | LineString | Polygon): [[number, number], [number, number]] | null => {
      let minLng = Number.POSITIVE_INFINITY
      let minLat = Number.POSITIVE_INFINITY
      let maxLng = Number.NEGATIVE_INFINITY
      let maxLat = Number.NEGATIVE_INFINITY

      const processCoord = (coord: number[]) => {
        const [lng, lat] = coord
        minLng = Math.min(minLng, lng)
        minLat = Math.min(minLat, lat)
        maxLng = Math.max(maxLng, lng)
        maxLat = Math.max(maxLat, lat)
      }

      if (geometry.type === 'Point') {
        processCoord(geometry.coordinates)
      } else if (geometry.type === 'LineString') {
        for (const coord of geometry.coordinates) {
          processCoord(coord)
        }
      } else if (geometry.type === 'Polygon') {
        for (const ring of geometry.coordinates) {
          for (const coord of ring) {
            processCoord(coord)
          }
        }
      }

      if (minLng === Number.POSITIVE_INFINITY) return null

      return [
        [minLng, minLat],
        [maxLng, maxLat],
      ]
    },
    [],
  )

  const formatCoordinate = (num: number): string => {
    return Number(num.toFixed(6)).toString()
  }

  const formatNumberWithoutTrailingZeros = (num: number, decimals: number): string => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
  }

  // Calculate polygon area in square km
  const calculatePolygonArea = (coordinates: Position[][]): number => {
    return turf.area(turf.polygon(coordinates)) / 1000000
  }

  // Calculate line length in km
  const calculateLineLength = (coordinates: Position[]): number => {
    const lengthInMeters = turf.length(turf.lineString(coordinates), { units: 'kilometers' })
    return lengthInMeters
  }

  const onListItemClick = useCallback(
    (row: ItvDrawFeature) => {
      const map = mapLibre[mapId]

      if (!map) return

      if (row.geometry) {
        const bounds = calculateBounds(row.geometry)

        if (bounds) {
          map.fitBounds(bounds, {
            padding: 200,
            duration: 1000,
          })
        }
      }
    },
    [mapLibre, mapId, calculateBounds],
  )

  const drawList: ItvDrawFeature[] = useMemo(() => {
    const result: ItvDrawFeature[] = features.map((item) => {
      return {
        id: item.id,
        drawType: item.drawType as ItvDrawType,
        drawSize: item.drawSize as number,
        drawBorderSize: item.drawBorderSize as number,
        drawBorderColor: item.drawBorderColor as string,
        drawFillColor: item.drawFillColor as string,
        drawPolygonType: item.drawPolygonType as ItvDrawPolygonType,
        drawDegree: item.drawDegree as number,
        drawText: item.drawText as string,
        drawTextColor: item.drawTextColor as string,
        drawTextHaloColor: item.drawTextHaloColor as string,
        drawTextHaloSize: item.drawTextHaloSize as number,
        geometry: item.geometry as Point | LineString | Polygon,
      }
    })

    return result
  }, [features])
  return (
    <div className='flex h-full flex-col gap-2'>
      {features.length === 0 ? (
        <Empty message={t('empty.noList')} />
      ) : (
        <div className='overflow-auto'>
          <List sx={{ p: 0, gap: 2 }}>
            {drawList.map((row) => {
              return (
                <ListItem
                  key={row.id}
                  onClick={() => onListItemClick(row)}
                  className={classNames(
                    'group 2k:gap-2 border-white border-b-2 bg-(--color-background-light) pr-1! pl-4! last:border-b-0',
                    {
                      'cursor-pointer hover:bg-(--color-background-dark) hover:text-white': row.geometry,
                    },
                  )}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
                    {row.drawType === ItvDrawType.POINT && <CircleIcon />}
                    {row.drawType === ItvDrawType.LINE && <TimelineIcon />}
                    {row.drawType === ItvDrawType.POLYGON && (
                      <span className='inline-flex h-5 w-5 items-center justify-center filter transition group-hover:brightness-0 group-hover:invert'>
                        <Image src='/icons/polygon.svg' alt='polygon' width={20} height={20} />
                      </span>
                    )}
                    {row.drawType === ItvDrawType.TEXT && <TextFieldsIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={(() => {
                      if (
                        (row.drawType === ItvDrawType.POINT || row.drawType === ItvDrawType.TEXT) &&
                        row.geometry?.type === 'Point'
                      ) {
                        return `${formatCoordinate(row.geometry.coordinates[1])}, ${formatCoordinate(row.geometry.coordinates[0])}`
                      }
                      if (row.drawType === ItvDrawType.POLYGON && row.geometry?.type === 'Polygon') {
                        return `${formatNumberWithoutTrailingZeros(calculatePolygonArea(row.geometry.coordinates), 4)} ${t('unit.area.sqkmAbbr')}`
                      }
                      if (row.drawType === ItvDrawType.LINE && row.geometry?.type === 'LineString') {
                        return `${formatNumberWithoutTrailingZeros(calculateLineLength(row.geometry.coordinates), 4)} ${t('unit.length.kmAbbr')}`
                      }
                      return row.id
                    })()}
                  />

                  <Tooltip title={t('button.edit')}>
                    <IconButton
                      size='small'
                      color='primary'
                      onClick={(e) => {
                        e.stopPropagation()
                        console.log('Edit clicked for feature ID: ', row.id)
                        onEdit(row.id)
                      }}
                    >
                      <EditIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('button.delete')} arrow>
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(row.id)
                      }}
                      color='error'
                    >
                      <DeleteIcon fontSize='small' />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              )
            })}
          </List>
        </div>
      )}
    </div>
  )
}

export default DrawList
