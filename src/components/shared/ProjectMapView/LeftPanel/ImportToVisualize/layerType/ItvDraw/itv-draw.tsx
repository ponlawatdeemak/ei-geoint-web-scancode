import { ItvDrawPolygonType, ItvDrawType } from '@interfaces/config'
import { Point, LineString, Polygon } from 'geojson'
import { JSX } from 'react'
import Image from 'next/image'
import TimelineIcon from '@mui/icons-material/Timeline'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import CircleIcon from '@mui/icons-material/Circle'

export type ItvDrawFeature = {
  id: string
  drawType: ItvDrawType | null
  drawSize: number | null
  drawBorderSize: number | null
  drawBorderColor: string | null
  drawFillColor: string | null
  drawPolygonType: ItvDrawPolygonType | null
  drawDegree: number | null
  drawText: string | null
  drawTextColor: string | null
  drawTextHaloColor: string | null
  drawTextHaloSize: number | null
  geometry: Point | LineString | Polygon | null
}

export type ItvDrawConfigType = {
  [key in ItvDrawType]: {
    value: ItvDrawType
    icon: JSX.Element
    label: string
    tabType?: (keyof ItvDrawFeature)[]
    tabBorder?: (keyof ItvDrawFeature)[]
    tabFill?: (keyof ItvDrawFeature)[]
  }
}

export const itvDrawConfig: ItvDrawConfigType = {
  [ItvDrawType.POINT]: {
    value: ItvDrawType.POINT,
    icon: <CircleIcon />,
    label: 'itv.draw.point',
    tabType: ['drawSize'],
    tabBorder: ['drawBorderSize', 'drawBorderColor'],
    tabFill: ['drawFillColor'],
  },
  [ItvDrawType.LINE]: {
    value: ItvDrawType.LINE,
    icon: <TimelineIcon />,
    label: 'itv.draw.line',
    tabBorder: ['drawBorderSize', 'drawBorderColor'],
  },
  [ItvDrawType.POLYGON]: {
    value: ItvDrawType.POLYGON,
    icon: (
      <span className='inline-flex h-5 w-5 items-center justify-center filter transition group-hover:brightness-0 group-hover:invert'>
        <Image src='/icons/polygon-gray.svg' alt='polygon' width={20} height={20} />
      </span>
    ),
    label: 'itv.draw.polygon',
    tabType: ['drawPolygonType'],
    tabBorder: ['drawBorderSize', 'drawBorderColor'],
    tabFill: ['drawFillColor'],
  },
  [ItvDrawType.TEXT]: {
    value: ItvDrawType.TEXT,
    icon: <TextFieldsIcon />,
    label: 'itv.draw.text',
    tabType: ['drawText', 'drawSize', 'drawDegree'],
    tabBorder: ['drawTextHaloSize', 'drawTextHaloColor'],
    tabFill: ['drawTextColor'],
  },
}
