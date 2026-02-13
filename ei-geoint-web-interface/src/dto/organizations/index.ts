import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'
import { SearchDtoIn } from '../core'
import { Organization, Subscription, OrganizationSubscription } from '../../entities'

export class GetItemOrganizationsDtoOut {
  id?: string
  name?: string
  nameEn?: string
}

export class SearchOrganizationDtoIn extends SearchDtoIn {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  subscriptionId?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsBoolean()
  @IsOptional()
  isApiSharingEnabled?: boolean
}

export class SearchOrganizationResultItem extends Subscription {
  organizationSubscriptions: OrganizationSubscription[]
  isApiSharingEnabled: boolean
}

export class SearchOrganizationDtoOut {
  data: SearchOrganizationResultItem[]
  total: number
}

export class GetOrganizationDtoOut extends Organization {
  mode: 'EDIT'
  organizationSubscriptions: {
    subscription: Subscription
  }[]
}

export class PostOrganizationOrganizationSubscriptionDtoIn {
  @IsString()
  @IsNotEmpty()
  subscriptionId: string

  @IsDateString()
  @IsNotEmpty()
  startAt: Date

  @IsDateString()
  @IsNotEmpty()
  endAt: Date
}

export class PostOrganizationDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  nameEn: string

  @IsString()
  @IsOptional()
  contactName?: string

  @IsString()
  @IsOptional()
  contactEmail?: string

  @IsNumber()
  @IsOptional()
  adminNumber?: number

  @IsNumber()
  @IsOptional()
  userNumber?: number

  @IsNumber()
  @IsOptional()
  viewerNumber?: number

  @IsNumber()
  @IsOptional()
  storageNumber?: number

  @IsNumber()
  @IsOptional()
  projectNumber?: number

  @IsString()
  @IsOptional()
  token?: string

  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PostOrganizationOrganizationSubscriptionDtoIn)
  subscriptions: PostOrganizationOrganizationSubscriptionDtoIn[]
}

export class PostOrganizationDtoOut {
  id: string
}

export class PutOrganizationDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  nameEn: string

  @IsString()
  @IsOptional()
  contactName?: string

  @IsString()
  @IsOptional()
  contactEmail?: string

  @IsNumber()
  @IsOptional()
  adminNumber?: number

  @IsNumber()
  @IsOptional()
  userNumber?: number

  @IsNumber()
  @IsOptional()
  viewerNumber?: number

  @IsNumber()
  @IsOptional()
  storageNumber?: number

  @IsNumber()
  @IsOptional()
  projectNumber?: number

  @IsString()
  @IsOptional()
  token?: string

  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PostOrganizationOrganizationSubscriptionDtoIn)
  subscriptions: PostOrganizationOrganizationSubscriptionDtoIn[]
}

export class DeleteOrganizationDtoIn {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[]
}
