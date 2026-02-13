import { ArrayMinSize, IsArray, IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { Organization, OrganizationSubscription, Role, User, UserSubscription } from '../../entities'
import { SearchDtoIn } from '../core'

export class PostUserDtoIn {
  @IsNumber()
  @IsNotEmpty()
  roleId: number

  @IsString()
  @IsNotEmpty()
  organizationId: string

  @IsString()
  @IsNotEmpty()
  firstName: string

  @IsString()
  @IsNotEmpty()
  lastName: string

  @IsEmail()
  @IsNotEmpty()
  email: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsString()
  @IsNotEmpty()
  userName: string

  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subscriptionIds: string[]
}

export class PostUserDtoOut {
  id: string
}

export class GetUserDtoOut extends User {
  role: Role
  organization: Organization
  userSubscriptions: UserSubscription[]
  organizationSubscriptions: OrganizationSubscription[]
}

export class PatchUserDtoIn {
  @IsNumber()
  @IsOptional()
  roleId?: number

  @IsString()
  @IsOptional()
  organizationId?: string

  @IsString()
  @IsOptional()
  firstName?: string

  @IsString()
  @IsOptional()
  lastName?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  subscriptionIds?: string[]
}

export class DeleteUserDtoIn {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[]
}

export class PostRefreshEmailFirstTimeLoginDtoIn {
  @IsString()
  @IsNotEmpty()
  userId: string
}

export class PutChangePasswordDtoIn {
  @IsString()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  oldPassword: string

  @IsString()
  @IsNotEmpty()
  newPassword: string
}

export class SearchUserDtoIn extends SearchDtoIn {
  @IsString()
  @IsOptional()
  keyword?: string

  @IsString()
  @IsOptional()
  organizationId?: string

  @IsNumber()
  @IsOptional()
  roleId?: number

  @IsString()
  @IsOptional()
  projectId?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  userIds?: string[]
}

export class SearchUserResultItem extends User {
  role: Role
  organization: Organization
  userSubscriptions: UserSubscription[]
}

export class SearchUserDtoOut {
  data: SearchUserResultItem[]
  total: number
}
