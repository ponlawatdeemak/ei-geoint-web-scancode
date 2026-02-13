import { IsString, IsNotEmpty, IsUUID, IsNumber } from 'class-validator'

export class GrantTileAccessDtoIn {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  orgId: string
}

// Snake case are from Thaicom API response
export interface TileAccessData {
  org_id: string
  header_name: string
  api_key: string
  rate_limit_per_day: number
  vector_path: string
  raster_path: string
}

export class GrantTileAccessDtoOut {
  success: boolean
  data?: TileAccessData | null
  message?: string
}

export class RevokeTileAccessDtoIn {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  orgId: string
}

export interface RevokeTileAccessData {
  org_id: string
  revoked: boolean
  rotated: boolean
}

export class RevokeTileAccessDtoOut {
  success: boolean
  data?: RevokeTileAccessData | null
  message?: string
}
