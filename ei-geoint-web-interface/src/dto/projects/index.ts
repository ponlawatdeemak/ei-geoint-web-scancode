import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsInt,
  ValidateNested,
} from 'class-validator'
import { SearchDtoIn } from '../core'
import { Project, ProjectUser, User, LutTaskStatus, Task } from '../../entities'
import { Type, Transform } from 'class-transformer'

export class SearchProjectDtoIn extends SearchDtoIn {
  @IsString()
  @IsOptional()
  keyword?: string

  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  desc?: string

  @IsNumber()
  @IsOptional()
  statusId?: number

  @IsString()
  @IsOptional()
  creator?: string

  @IsString()
  @IsOptional()
  organizationId?: string

  @IsString()
  @IsOptional()
  subscriptionId?: string

  @IsDateString()
  @IsOptional()
  from?: string

  @IsDateString()
  @IsOptional()
  to?: string
}

export class SearchProjectResultItem extends Project {
  status?: LutTaskStatus
  tasks: Task[]
  createdByUser: User
}

export class SearchProjectDtoOut {
  data: SearchProjectResultItem[]
  total: number
}

export class GetThumbnailsProjectDtoIn {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Type(() => String)
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  ids: string[]
}

export class ProjectThumbnailItem {
  id: string
  thumbnail: string | null
}

export class GetThumbnailsProjectDtoOut {
  data: ProjectThumbnailItem[]
}

export class ListProjectDtoIn {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string
}

export class GetProjectDtoOut extends Project {
  createdBy: string
  projectUsers: ProjectUser[]
  tasks: Task[]
  createdByUser: User
}

export class PostProjectDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  detail?: string

  @IsString()
  @IsNotEmpty()
  organizationId: string

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  userIds?: string[]
}

export class PostProjectDtoOut {
  id: string
}

export class PutProjectDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  detail?: string

  @IsString()
  @IsNotEmpty()
  organizationId: string

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  userIds?: string[]
}

export class DeleteProjectDtoIn {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[]
}

export class ProjectLayerIndexItem {
  @IsNotEmpty()
  @IsUUID()
  id: string

  @IsNotEmpty()
  @IsBoolean()
  isItv: boolean

  @IsNotEmpty()
  @IsInt()
  order: number
}

export class PutProjectLayerOrderDtoIn {
  @IsNotEmpty()
  @IsUUID()
  id: string

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProjectLayerIndexItem)
  layerOrder: ProjectLayerIndexItem[]
}

export class PutProjectLayerOrderDtoOut {
  id: string
}

export class ListProjectItem {
  id: string
  name: string
}

export class ListProjectDtoOut {
  data: ListProjectItem[]
  total: number
}
