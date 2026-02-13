import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { Roles, SortType } from '../..'
import { SearchDtoIn } from '../core'
import { Task } from '../../entities'

export class GetUsersDataManagementDtoIn {
  @IsString()
  @IsOptional()
  organizationId: string | null
}

export class GetUsersDataManagementDtoOut {
  type: Roles
  count: number
  limit: number
  percent: number
  name: string
  nameEn: string
}

export class GetSubscriptionsDataManagementDtoIn {
  @IsString()
  @IsOptional()
  organizationId: string | null
}

export class GetSubscriptionsDataManagementDtoOut {
  id: string
  subscriptionId: string
  name: string
  nameEn: string
  startAt: Date
  endAt: Date
  remainingDays: number
}

export class SearchSubscriptionExpireDataManagementDtoIn extends SearchDtoIn {
  @IsString()
  @IsOptional()
  organizationId: string | null
}

export class SearchSubscriptionExpireDataManagementItem {
  id: string
  subscriptionId: string
  name: string
  nameEn: string
  startAt: Date
  endAt: Date
}

export class SearchSubscriptionExpireDataManagementDtoOut {
  data: SearchSubscriptionExpireDataManagementItem[]
  total: number
}

export class SearchTasksDataManagementDtoIn {
  @IsString()
  @IsOptional()
  organizationId: string

  @IsString()
  @IsNotEmpty()
  projectId: string

  @IsString()
  @IsOptional()
  sortOrder?: SortType

  @IsNumber()
  @IsOptional()
  limit?: number

  @IsString()
  @IsOptional()
  token?: string
}

export class SearchTasksDataManagementDtoOut {
  nextToken: string | null
  prevToken: string | null
  data: (Task & { total: number | null })[]
  total: number
}

export class SearchUsedStorageDataManagementDtoIn extends SearchDtoIn {
  @IsString()
  @IsOptional()
  orgId?: string | null

  @IsString()
  @IsOptional()
  token?: string | null
}

export class UsedStorageChart {
  total: number
  project: number
  gallery: number
  limit: number
}

export class UsedStorageData {
  organization: UsedStorageChart
  owner: UsedStorageChart
}

export class UsedStorageProjectItem {
  id: string
  name: string
  total: number
}

export class SearchUsedStorageDataManagementDtoOut {
  usedStorage: UsedStorageData
  total: number
  data: UsedStorageProjectItem[]
  nextToken: string | null
  prevToken: string | null
}
