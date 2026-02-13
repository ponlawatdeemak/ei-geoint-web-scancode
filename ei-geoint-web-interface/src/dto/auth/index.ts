import { IsNotEmpty, IsString } from 'class-validator'
import { Organization, OrganizationSubscription, Role, User, UserSubscription } from '../../entities'

export class PostLoginDtoIn {
  @IsString()
  @IsNotEmpty()
  userName: string

  @IsString()
  @IsNotEmpty()
  password: string
}

export class PostLoginDtoOut {
  token: string
  ref: string
  email: string
}

export class PostConfirmOtpLoginDtoIn {
  @IsString()
  @IsNotEmpty()
  token: string

  @IsString()
  @IsNotEmpty()
  otp: string
}

export class PostConfirmOtpLoginDtoOut {
  userId: string
  roleId: number
  accessToken: string
  refreshToken: string
}

export class PostRefreshOtpLoginDtoIn {
  @IsString()
  @IsNotEmpty()
  token: string
}

export class PostRefreshOtpLoginDtoOut {
  token: string
  ref: string
  email: string
}

export class PostForgotPasswordDtoIn {
  @IsString()
  @IsNotEmpty()
  userName: string
}

export class PostVerifyTokenDtoIn {
  @IsString()
  @IsNotEmpty()
  id: string
}

export class PostResetPasswordDtoIn {
  @IsString()
  @IsNotEmpty()
  id: string

  @IsString()
  @IsNotEmpty()
  newPassword: string
}

export class PostRefreshTokenDtoIn {
  @IsString()
  @IsNotEmpty()
  accessToken: string

  @IsString()
  @IsNotEmpty()
  refreshToken: string
}

export class PostRefreshTokenDtoOut {
  accessToken: string
}

export class PostLogoutDtoIn {
  @IsString()
  @IsNotEmpty()
  accessToken: string
}

export class GetProfileDtoOut extends User {
  role: Role
  organization: Organization
  userSubscriptions: UserSubscription[]
  organizationSubscriptions: OrganizationSubscription[]
}
