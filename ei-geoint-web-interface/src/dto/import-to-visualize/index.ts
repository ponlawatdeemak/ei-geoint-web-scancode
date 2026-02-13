import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator'
import { Feature } from 'geojson'
import { ItvLayerType } from '../../config'
import { PostSearchLayersTasksDtoOut } from '../tasks'
import { Transform } from 'class-transformer'
import { AnnotationItem, ItvFeatureProperties, ItvLayer } from '../../entities'

export class CreateItvLayerDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsUUID()
  @IsNotEmpty()
  projectId: string

  @IsEnum(ItvLayerType)
  @IsNotEmpty()
  layerType: ItvLayerType

  @IsOptional()
  @IsUUID()
  imageId?: string

  @IsOptional()
  @IsUrl()
  url?: string

  @IsOptional()
  @IsString()
  features?: Feature[]
}

export class CreateItvLayerDtoOut extends ItvLayer {}

export class DeleteItvLayerDtoIn {
  @IsUUID()
  @IsNotEmpty()
  id: string

  @IsUUID()
  @IsNotEmpty()
  projectId: string
}

export class UpdateItvLayerDtoIn {
  @IsUUID()
  @IsNotEmpty()
  id: string

  @IsUUID()
  @IsNotEmpty()
  projectId: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsOptional()
  @IsUrl()
  url?: string

  @IsOptional()
  @IsArray()
  features?: ItvFeatureProperties[] | AnnotationItem[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  uploadIdListDelete?: string[] // รายการ upload_id สำหรับลบภาพใน geoint

  @IsOptional()
  @IsArray()
  uploadIdListLatlng?: { uploadId: string; latitude: number; longitude: number }[] // รายการ upload_id สำหรับอัพเดทข้อมูล latlong ใน geoint
}

export class SearchItvLayerDtoIn {
  @IsUUID()
  @IsNotEmpty()
  projectId: string

  @IsOptional()
  @Transform(({ value }) => {
    // If it's already an array, return it; otherwise, split the string
    if (typeof value === 'string') {
      const a = value.split(',').map((item) => item.trim())
      return a
    }

    return value
  })
  @IsArray()
  @IsUUID(4, { each: true })
  taskIdList?: string[]
}

export class SearchItvLayerDtoOut {
  taskLayer: PostSearchLayersTasksDtoOut
  itvLayer: ItvLayer[]
}
