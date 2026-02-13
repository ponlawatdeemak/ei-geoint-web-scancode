import { ItvFeatureProperties } from '@interfaces/entities'
import { Point } from 'geojson'

export type ItvPhotoFeature = {
  id: string
  fileName: string
  uploadId: string
  groupId: string | null
  geometry: Point | null
  selected: boolean
  photoItem: ItvFeatureProperties
}

export const ItvPhotoLocatorTab = {
  ALL: 'all',
  ADDRESS: 'address',
  NO_ADDRESS: 'noAddress',
}
export type ItvPhotoLocatorTab = (typeof ItvPhotoLocatorTab)[keyof typeof ItvPhotoLocatorTab]
