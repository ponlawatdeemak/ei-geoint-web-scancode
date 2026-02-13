import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { SortType } from '../../config'

export class CreateOrganizationApiKeyDtoIn {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  orgId: string
}

export class CreateOrganizationApiKeyDtoOut {
  id: string
}

export class UpdateOrganizationApiKeyDtoIn {
  @IsString()
  @IsUUID()
  apiKeyId: string
}

export class UpdateOrganizationApiKeyDtoOut {
  id: string
}

export class GetOrganizationApiKeyDtoIn {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  orgId: string

  @IsString()
  @IsOptional()
  sortField?: string

  @IsString()
  @IsOptional()
  sortOrder?: SortType

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number
}

export class GetOrganizationApiKeyDtoOut {
  data: OrgApiKeyItem[]
  total: number
}

export class OrgApiKeyItem {
  id: string
  org: OrgItem
  apiKey: string
  headerName: string | null
  vectorPath: string | null
  rasterPath: string | null
  isActive: boolean
  deactivatedAt: Date | null
  createdAt: Date
}

class OrgItem {
  id: string
  nameTh: string
  nameEn: string
}

export class OrganizationApiDtoIn {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  orgId: string
}

export class OrganizationApiDtoOut {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  orgId: string

  @IsNotEmpty()
  isApiSharingEnabled: boolean
}

class ApiItem {
  id: string
  title: string
  type: string
  url?: string
}

export class ShareApiDtoIn {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  orgId: string

  @IsNotEmpty()
  data: ApiItem[]
}

export class ShareApiDtoOut {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  orgId: string

  @IsNotEmpty()
  data: ApiItem[]
}
