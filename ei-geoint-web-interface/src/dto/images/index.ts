import { IsNotEmpty, IsString, IsOptional, IsDateString, IsNumber, IsArray, ArrayMinSize } from 'class-validator'
import { Hashtag, Image, Task, User } from '../../entities'
import { Polygon } from 'geojson'
import { SearchDtoIn } from '../core'
// no transform needed for primitive string array

export class GetByItemIdImageDtoOut extends Image {
  hashtags: Hashtag[]
}

export class PostImagesDtoIn {
  @IsString()
  @IsNotEmpty()
  serviceId: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsOptional()
  @IsDateString()
  photoDate?: string | Date

  @IsOptional()
  @IsString()
  metadata?: string

  @IsOptional()
  @IsNumber()
  chunkSize?: number | null

  @IsOptional()
  @IsNumber()
  chunkAmount?: number | null

  @IsOptional()
  @IsString()
  fileName?: string | null

  @IsOptional()
  @IsNumber()
  fileSize?: number | null

  @IsOptional()
  @IsString()
  fileType?: string | null

  @IsString()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  organizationId: string

  @IsOptional()
  @IsString()
  uploadId?: string | null

  @IsOptional()
  @IsString()
  itemId?: string | null

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  hashtags?: string[]
}

export class PutImagesDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsOptional()
  @IsDateString()
  photoDate?: string | Date

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  hashtags?: string[]
}

export class PostImagesDtoOut {
  id: string
}

export class PutImagesDtoOut extends PostImagesDtoOut {}

export class PutStatusImagesDtoIn {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  statusId: string
}

export class PutStatusImagesDtoOut {
  id: string
}

export class SearchImagesDtoIn extends SearchDtoIn {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsDateString()
  startAt?: Date

  @IsOptional()
  @IsDateString()
  endAt?: Date

  @IsOptional()
  @IsString()
  orgId?: string

  @IsOptional()
  serviceId?: string

  @IsOptional()
  modelList?: string

  @IsOptional()
  projectId?: string

  @IsOptional()
  token?: string

  @IsOptional()
  @IsString()
  tag?: string
}

export class SearchImagesResultItem {
  id: string
  thumbnailUrl: string | null // ลิงค์ thumbnail
  fileName: string | null // ชื่อไฟล์
  uploadDate: Date | null // วันที่อัปโหลด
  userBy: string | null // ผู้อัปโหลด
  imagingDate: Date | null // วันที่ถ่ายภาพ
  tags: string[] | null // แท็ก
  metadata: string | null // url ของ metadata
  geometry: Polygon | null // extend ของแผนที่ ที่ใช้ซูมตอนเลืิอก image
  tileUrl: string | null // ลิงค์ tile
  isProcessed: boolean | null // สถานะการประมวลผล true เมื่อประมวลผลเสร็จสิ้น
  statusId: number | null // สถานะ
  imageId: string | null // รหัสของ image ในตาราง
  originalFileUrl: string | null // ลิงค์ดาวโหลดไฟล์ต้นฉบับ
  canDelete: boolean
  hashtags: Hashtag[]
  serviceId: number // ประเภทภาพ Optical | SAR
  createdByUser: User | null
  organizationId: string | null
}

export class SearchImagesDtoOut {
  data: SearchImagesResultItem[]
  total: number
}

export class PostShareImageDtoIn {
  @IsString()
  @IsNotEmpty()
  imageId: string

  @IsArray()
  //   @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[]
}

export class GetShareImageDtoOut {
  userIds: string[]
}

export class GetImagesProcessedDtoOut extends Task {}

export class GetInProgressDtoOut extends Image {}

export class DeleteImagesDtoIn {
  @IsOptional()
  id?: string

  @IsOptional()
  itemId?: string
}
