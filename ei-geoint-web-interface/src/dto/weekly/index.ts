import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { GetModelAllDtoOut, PostSearchLayersTasksDtoOut, SortType, TaskFeature, TaskLayer } from '../..'
import { StacFeatureItem } from '../thaicom/stac.dto'

export class GetModelSubscriptionWeeklyDtoOut extends GetModelAllDtoOut {
  children?: GetModelSubscriptionWeeklyDtoOut[]
}

export class PostSearchFeaturesWeeklyDtoIn {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  collectionKeys: string[]

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  areaKeys: string[]

  @IsString()
  @IsNotEmpty()
  startDate: string // "2025-09-15T00:00:00Z"

  @IsString()
  @IsNotEmpty()
  endDate: string // "2025-09-30T00:00:00Z"

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  modelKeys: string[]

  @Type(() => Number)
  @IsNotEmpty()
  limit: number

  @IsString()
  @IsOptional()
  sortField?: string

  @IsString()
  @IsOptional()
  sortOrder?: SortType

  @IsString()
  @IsOptional()
  token?: string
}

export class PostSearchFeaturesWeeklyDtoOut {
  next?: string | null
  previous?: string | null
  features: TaskFeature[]
  total: number
  returned: number
}

export class PostLayerWeeklyDtoOut extends PostSearchLayersTasksDtoOut {
  next?: string | null
  previous?: string | null
}

export class PostSearchLayersWeeklyDtoIn extends TaskLayer {}

export class PostSearchLayersWeeklyDtoOut {
  features: TaskFeature[]
}
