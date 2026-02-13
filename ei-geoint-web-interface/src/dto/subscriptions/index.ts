import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { SearchDtoIn } from '../core'
import { SubscriptionModel, Subscription, OrganizationSubscription, User } from '../../entities'

export class GetItemByOrgDtoIn {
  orgId: string
}

export class GetItemByOrgDtoOut {
  id?: string
  name?: string
  nameEn?: string
}

export class GetAllSubscriptionsDtoOut extends Subscription {}

export class SearchSubscriptionDtoIn extends SearchDtoIn {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  organizationId?: string
}

export class SearchSubscriptionResultItem extends Subscription {
  organizationSubscriptions: OrganizationSubscription[]
  createdByUser: User
}

export class SearchSubscriptionDtoOut {
  data: SearchSubscriptionResultItem[]
  total: number
}

export class GetSubscriptionDtoOut extends Subscription {
  mode: 'EDIT'
  subscriptionModels: SubscriptionModel[]
}

export class PostSubscriptionDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  nameEn: string

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  modelIds: number[]
}

export class PostSubscriptionDtoOut {
  id: string
}

export class PutSubscriptionDtoIn {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  nameEn: string

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  modelIds: number[]
}

export class DeleteSubscriptionDtoIn {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[]
}
