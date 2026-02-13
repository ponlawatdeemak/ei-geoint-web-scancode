import { IsMimeType, IsNotEmpty, IsNumber, IsString, IsUUID, Max, Min } from 'class-validator'
import { Point } from 'geojson'

export class CreateUploadDtoIn {
  @IsNotEmpty()
  @IsString()
  filename: string

  @IsNotEmpty()
  @IsMimeType()
  contentType: string

  @IsNotEmpty()
  @IsUUID()
  projectId: string

  @IsNotEmpty()
  @IsUUID()
  itvLayerId: string
}

export class CreateUploadDtoOut {
  uploadUrl: string
  uploadId: string
}

export class ConfirmUploadDtoIn {
  @IsNotEmpty()
  @IsString()
  uploadId: string

  @IsNotEmpty()
  @IsUUID()
  itvLayerId: string
}

export class ConfirmUploadDtoOut {
  id: string
  geometry: Point | null
  itvLayerId: string
  photoUploadId: string
  photoImagingDate: string | null
  createdAt: string
  createdBy: string
}

export class UpdatePhotoLatLongDtoIn {
  @IsNotEmpty()
  @IsString()
  uploadId: string

  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number
}

export class GetThumbnailDtoIn {
  @IsNotEmpty()
  @IsString()
  uploadId: string
}

export class GetDownloadDtoIn {
  @IsNotEmpty()
  @IsString()
  uploadId: string
}

export class GetDownloadDtoOut {
  uploadId: string
  downloadUrl: string
}

export class DeletePhotoDtoIn {
  @IsNotEmpty()
  @IsString()
  uploadId: string
}
