import { ImageStatus } from '@interfaces/config'
import { ThaicomImageStatus } from '@interfaces/config/thaicom.config'
import { Polygon } from 'geojson'
import { layerIdConfig } from '../map/config/map'

export enum ImagesMode {
  Selector = 'selector',
  Editor = 'editor',
}

export enum ViewType {
  LIST = 'list',
  GRID = 'grid',
}

export enum ImageAction {
  Show = 'show',
  CreateTask = 'createTask',
  Edit = 'edit',
  Share = 'share',
  Download = 'download',
  Delete = 'delete',
}

export const imageMapId = 'gallery-map-view'

export enum ImageSortBy {
  Name = 'name',
  ImagingDate = 'imagingDate',
}

export enum ImageUploadStep {
  Upload = 'UPLOAD',
  Validate = 'VALIDATE',
}

export const checkIsInProgress = (statusId: ImageStatus, complete = false): boolean => {
  const inProgressStatus = complete
    ? [ImageStatus.inProgress, ImageStatus.uploadComplete]
    : [ImageStatus.inProgress, ImageStatus.uploadComplete, ImageStatus.uploadPending]
  return inProgressStatus.includes(statusId)
}

export interface WssImageData {
  type: string
  upload_id: string
  data: {
    processing_status: ThaicomImageStatus
    progress_percent: number
    upload_status: string
    filename: string
    file_size: number
    step_started_at: string | null
    step_finished_at: string | null
    error_code: string | null
    error_message: string | null
    created_at: string
    updated_at: string
  }
}

export const addImageToMap = (
  mapInstance: maplibregl.Map,
  image: { sourceId: string; layerId: string; tileUrl: string; geometry?: Polygon | null },
) => {
  if (!image.tileUrl) return

  const tiles = Array.isArray(image.tileUrl) ? image.tileUrl : [image.tileUrl]
  if (mapInstance.getLayer(image.layerId)) {
    mapInstance.removeLayer(image.layerId)
  }
  if (mapInstance.getSource(image.sourceId)) {
    mapInstance.removeSource(image.sourceId)
  }

  mapInstance.addSource(image.sourceId, {
    type: 'raster',
    tiles,
    tileSize: 256,
  })

  mapInstance.addLayer(
    {
      id: image.layerId,
      type: 'raster',
      source: image.sourceId,
      layout: { visibility: 'visible' },
      paint: { 'raster-opacity': 1 },
    },
    layerIdConfig.customReferer,
  )

  if (image.geometry) {
    mapInstance.fitBounds(image.geometry as any, { duration: 1000 })
  }
}
