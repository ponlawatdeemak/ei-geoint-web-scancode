import {
  IsNotEmpty,
  IsUUID,
  IsString,
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateIf,
  IsInt,
  ValidateNested,
  IsEnum,
  IsNumber,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { Image, LutModel, Project, Task } from '../../entities'
import { TaskMode, RootModelConfig, ServiceConfig, TaskStatus } from '../../config'
import type { Geometry } from 'geojson'

export class GetTasksDtoOut extends Task {}

export class PostTasksDtoIn {
  @IsEnum(TaskMode)
  @IsNotEmpty()
  mode: TaskMode

  @IsString()
  @IsNotEmpty()
  name: string

  @IsInt()
  @IsNotEmpty()
  serviceId: number

  @IsInt()
  @IsNotEmpty()
  rootModelId: number

  @IsUUID()
  @IsNotEmpty()
  projectId: string

  @ValidateIf((o) => o.serviceId !== ServiceConfig.sar)
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  modelIds: number[]

  @IsArray()
  @ArrayMinSize(0)
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageItem)
  images?: ImageItem[]

  // If the task uses change-detection root model, selectResults are validated when present
  @IsOptional()
  @ValidateIf((o) => o.rootModelId === RootModelConfig.changeDetection && o.mode !== TaskMode.save)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectResultItem)
  selectResults?: SelectResultItem[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AoiVectorItem)
  aoiVectors?: AoiVectorItem[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AoiCoordinateItem)
  aoiCoordinates?: AoiCoordinateItem[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AoiGeometryCollectionItem)
  aoiGeometryCollections?: AoiGeometryCollectionItem[]
}

export class PostTasksDtoOut {
  id: string
}
export class PutTasksDtoIn {
  @IsEnum(TaskMode)
  @IsNotEmpty()
  mode: TaskMode

  @IsString()
  @IsNotEmpty()
  name: string

  // When editing name only, the rest of fields are not required. For other modes, they must be present.
  @ValidateIf((o) => o.mode !== TaskMode.editNameOnly)
  @IsInt()
  @IsNotEmpty()
  serviceId: number

  @ValidateIf((o) => o.mode !== TaskMode.editNameOnly)
  @IsInt()
  @IsNotEmpty()
  rootModelId: number

  @ValidateIf((o) => o.mode !== TaskMode.editNameOnly)
  @IsUUID()
  @IsNotEmpty()
  projectId: string

  @ValidateIf((o) => o.mode !== TaskMode.editNameOnly && o.serviceId !== 2)
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  modelIds: number[]

  @ValidateIf((o) => o.mode !== TaskMode.editNameOnly)
  @IsArray()
  @ArrayMinSize(0)
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageItem)
  images?: ImageItem[]

  // selectResults are validated when present and when not editNameOnly AND when rootModelId == changeDetection
  @IsOptional()
  @ValidateIf((o) => o.mode === TaskMode.saveAndProcess && o.rootModelId === RootModelConfig.changeDetection)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectResultItem)
  selectResults?: SelectResultItem[]

  @IsOptional()
  @ValidateIf((o) => o.mode === TaskMode.saveAndProcess && o.serviceId === ServiceConfig.sar)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AoiVectorItem)
  aoiVectors?: AoiVectorItem[]

  @IsOptional()
  @ValidateIf((o) => o.mode === TaskMode.saveAndProcess && o.serviceId === ServiceConfig.sar)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AoiCoordinateItem)
  aoiCoordinates?: AoiCoordinateItem[]

  @IsOptional()
  @ValidateIf((o) => o.mode === TaskMode.saveAndProcess && o.serviceId === ServiceConfig.sar)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AoiGeometryCollectionItem)
  aoiGeometryCollections?: AoiGeometryCollectionItem[]
}
export class PutTasksDtoOut extends PostTasksDtoOut {}

export class ImageItem {
  @IsUUID()
  @IsNotEmpty()
  imageId: string

  @IsString()
  @IsNotEmpty()
  itemId: string

  @IsInt()
  @IsOptional()
  comparisonsTypeId?: number
}

export class SelectResultItem {
  // @IsUUID()
  // @IsNotEmpty()
  // taskImageId: string

  @IsInt()
  @IsNotEmpty()
  comparisonsTypeId: number

  @IsInt()
  @IsNotEmpty()
  groupModelId: number

  @IsUUID()
  @IsNotEmpty()
  selectResultTaskId: string

  @IsString()
  @IsNotEmpty()
  resultId: string
}

import { SearchDtoIn } from '../core'
import { StacFeatureProperties, StacGeometry } from '../thaicom/stac.dto'

export class SearchTasksDtoIn extends SearchDtoIn {
  @IsString()
  @IsNotEmpty()
  projectId: string

  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  creator?: string

  @IsInt()
  @IsOptional()
  serviceId?: number

  @IsInt()
  @IsOptional()
  rootModelId?: number

  @IsInt()
  @IsOptional()
  statusId?: number
}

export class SearchTasksDtoOut {
  data: Task[]
  total: number
}

export class GetThumbnailsTaskDtoIn {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Type(() => String)
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  ids: string[]
}

export class TaskThumbnailItem {
  id: string
  thumbnail: string | null
}

export class GetThumbnailsTaskDtoOut {
  data: TaskThumbnailItem[]
}

export class PostCheckAllTasksStatusDtoOut {
  changeStatus: boolean
}

export class GetResultImageDtoOut {
  image: Image
  imageUrl: string
  tileUrl?: string | null
  geometry: any
  modelResult?: [
    {
      taskId: string
      processAt?: Date | null | undefined
      project: Project
      resultId?: string
      rootModelId: number
      rootModel: LutModel
      modelId: number
      model: LutModel
      mappingModelId?: number
    },
  ]
}

export class GetHashTagsDtoOut {
  id: string
  name: string
}
export class AoiGeometryCollectionItem {
  @IsString()
  @IsOptional()
  geometry: string
}

export class AoiVectorItem extends AoiGeometryCollectionItem {
  @IsString()
  @IsOptional()
  name: string
}

export class AoiCoordinateItem extends AoiGeometryCollectionItem {
  @IsNumber()
  @IsOptional()
  coordinateTypeId: number

  @IsNumber()
  @IsOptional()
  zoneId?: number | null

  @IsNumber()
  @IsOptional()
  xMin?: number | null

  @IsNumber()
  @IsOptional()
  yMin?: number | null

  @IsNumber()
  @IsOptional()
  xMax?: number | null

  @IsNumber()
  @IsOptional()
  yMax?: number | null

  @IsString()
  @IsOptional()
  mgrsMin?: string | null

  @IsString()
  @IsOptional()
  mgrsMax?: string | null
}

export class PostResultCallbackSARTasksDtoIn {
  @IsString()
  @IsNotEmpty()
  id: string
}

export class PostSearchLayersTasksDtoIn {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[]
}

export class PostSearchLayersTasksDtoOut {
  features: TaskFeature[]
  total?: number
  returned?: number
}

export class TaskFeature {
  id?: string
  date?: string
  layer: TaskLayer[]
}

export class TaskLayer {
  id: string
  tileLayers?: TaskTileItem[]
  mapLayers?: TaskMapLayerItem[]
  geoJsonLayers?: TaskGeoJsonItem[]
  downloads?: TaskDownloadItem[]
  geometry?: TaskGeometry
  properties?: TaskProperties
  order?: number | null
}

export class TaskMapLayerItem {
  model_id?: string
  href?: string
  rows?: number
  type?: string
  roles?: string[]
  title?: string;
  // allow additional metadata from STAC assets
  [key: string]: unknown
}

export class TaskGeoJsonItem {
  model_id?: string
  data?: GeoJSON.FeatureCollection
  title?: string
  id: string
  geometry?: Geometry
}

export class TaskTileItem {
  id?: string
  model_id?: string
  href?: string
  type?: string
  roles?: string[]
  title?: string
  geometry?: TaskGeometry
  download?: TaskDownloadItem;
  [key: string]: unknown
}

export class TaskDownloadItem {
  model_id?: string
  href: string
  type?: string
  vector_type?: string;
  // allow additional fields
  [key: string]: unknown
}

export class TaskGeometry extends StacGeometry {}

export class TaskProperties extends StacFeatureProperties {}
