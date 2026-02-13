import { IsNotEmpty, IsString } from 'class-validator'

export class GetLookupDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string
}

export class GetLookupDtoOut {
  id: number
  name: string
  nameEn: string
  parentId?: number | string
}
export class GetModelAllDtoOut {
  id: number
  name: string
  nameEn: string
  key: string
  modelName: string
  serviceId: number
  parentModelId: number | null
  service: {
    id: number
    name: string
    nameEn: string
  }
}
