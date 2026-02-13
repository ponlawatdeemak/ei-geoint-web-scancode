import FilterIcon from '@mui/icons-material/Filter'
import { AddAPhoto, Architecture, GridOnOutlined, MilitaryTech, Polyline, WindowOutlined } from '@mui/icons-material'
import { ItvLayerType } from '@interfaces/config'
import InfoIcon from '@mui/icons-material/Info'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { JSX } from 'react'

export const ItvMenuType = {
  info: 'info',
  download: 'download',
  edit: 'edit',
  delete: 'delete',
}
export type ItvMenuType = (typeof ItvMenuType)[keyof typeof ItvMenuType]

export type ItvMenuItem = {
  value: ItvMenuType
  icon: JSX.Element
  label: string
}
type ItvConfigType = {
  [key in ItvLayerType]?: {
    value: ItvLayerType
    icon: JSX.Element
    label: string
    menu: ItvMenuItem[]
  }
}
export const itvConfig: ItvConfigType = {
  [ItvLayerType.GALLERY]: {
    value: ItvLayerType.GALLERY,
    icon: <FilterIcon />,
    label: 'itv.menu.gallery',
    menu: [
      {
        value: ItvMenuType.info,
        icon: <InfoIcon />,
        label: 'itv.button.info',
      },
      {
        value: ItvMenuType.download,
        icon: <DownloadIcon />,
        label: 'button.download',
      },

      {
        value: ItvMenuType.delete,
        icon: <DeleteIcon color='error' />,
        label: 'button.delete',
      },
    ],
    // dialogEditForm: ['']
  },
  [ItvLayerType.RASTER_TILE]: {
    value: ItvLayerType.RASTER_TILE,
    icon: <WindowOutlined />,
    label: 'itv.menu.rasterTile',
    menu: [
      {
        value: ItvMenuType.edit,
        icon: <EditIcon />,
        label: 'button.edit',
      },
      {
        value: ItvMenuType.delete,
        icon: <DeleteIcon color='error' />,
        label: 'button.delete',
      },
    ],
  },
  [ItvLayerType.VECTOR_TILE]: {
    value: ItvLayerType.VECTOR_TILE,
    icon: <GridOnOutlined />,
    label: 'itv.menu.vectorTile',
    menu: [
      {
        value: ItvMenuType.edit,
        icon: <EditIcon />,
        label: 'button.edit',
      },
      {
        value: ItvMenuType.delete,
        icon: <DeleteIcon color='error' />,
        label: 'button.delete',
      },
    ],
  },
  [ItvLayerType.PHOTO]: {
    value: ItvLayerType.PHOTO,
    icon: <AddAPhoto />,
    label: 'itv.menu.photo',
    menu: [
      {
        value: ItvMenuType.edit,
        icon: <EditIcon />,
        label: 'button.edit',
      },
      {
        value: ItvMenuType.delete,
        icon: <DeleteIcon color='error' />,
        label: 'button.delete',
      },
    ],
  },
  [ItvLayerType.VECTOR]: {
    value: ItvLayerType.VECTOR,
    icon: <Polyline />,
    label: 'itv.menu.vector',
    menu: [
      {
        value: ItvMenuType.edit,
        icon: <EditIcon />,
        label: 'button.edit',
      },
      {
        value: ItvMenuType.delete,
        icon: <DeleteIcon color='error' />,
        label: 'button.delete',
      },
    ],
  },
  [ItvLayerType.DRAW]: {
    value: ItvLayerType.DRAW,
    icon: <Architecture />,
    label: 'itv.menu.draw',
    menu: [
      {
        value: ItvMenuType.edit,
        icon: <EditIcon />,
        label: 'button.edit',
      },
      {
        value: ItvMenuType.delete,
        icon: <DeleteIcon color='error' />,
        label: 'button.delete',
      },
    ],
  },
  [ItvLayerType.ANNOTATION]: {
    value: ItvLayerType.ANNOTATION,
    icon: <MilitaryTech />,
    label: 'itv.menu.annotation',
    menu: [
      {
        value: ItvMenuType.edit,
        icon: <EditIcon />,
        label: 'button.edit',
      },
      {
        value: ItvMenuType.delete,
        icon: <DeleteIcon color='error' />,
        label: 'button.delete',
      },
    ],
  },
}

export const ItvMode = {
  Add: 'add',
  Edit: 'edit',
} as const

export type ItvMode = (typeof ItvMode)[keyof typeof ItvMode]

export const tileUrlValidator = (urlString: string) => {
  let url: URL
  try {
    url = new URL(urlString)
  } catch (error) {
    return false
  }

  return url.protocol === 'http:' || url.protocol === 'https:'
}
