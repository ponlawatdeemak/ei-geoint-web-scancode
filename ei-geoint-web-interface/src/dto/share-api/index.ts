import { IsNotEmpty, IsString } from 'class-validator'

export class ShareApiSarAoiDtoIn {
  @IsString()
  @IsNotEmpty()
  key: string
}

export class ShareApiSarAoiDtoOut implements GeoJSON.FeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSON.FeatureCollection['features']
}
