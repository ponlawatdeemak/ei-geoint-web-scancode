import { api } from '@/api/core'
import {
  PostConfirmOtpLoginDtoIn,
  PostConfirmOtpLoginDtoOut,
  PostLoginDtoIn,
  PostLoginDtoOut,
  PostLogoutDtoIn,
  PostRefreshTokenDtoIn,
  PostRefreshTokenDtoOut,
  GetProfileDtoOut,
  PostRefreshOtpLoginDtoIn,
  PostRefreshOtpLoginDtoOut,
  PostForgotPasswordDtoIn,
  PostResetPasswordDtoIn,
  PostVerifyTokenDtoIn,
} from '@interfaces/index'

const auth = {
  profile: async (): Promise<GetProfileDtoOut> => (await api.get('/auth/profile'))?.data,
  login: async (payload: PostLoginDtoIn): Promise<PostLoginDtoOut> => (await api.post('/auth/login', payload))?.data,
  logout: async (payload: PostLogoutDtoIn): Promise<void> => (await api.post('/auth/logout', payload))?.data,
  refreshOtpLogin: async (payload: PostRefreshOtpLoginDtoIn): Promise<PostRefreshOtpLoginDtoOut> =>
    (await api.post('/auth/refresh-otp-login', payload))?.data,
  refreshToken: async (payload: PostRefreshTokenDtoIn): Promise<PostRefreshTokenDtoOut> =>
    (await api.post('/auth/refresh-token', payload))?.data,
  confirmOtpLogin: async (payload: PostConfirmOtpLoginDtoIn): Promise<PostConfirmOtpLoginDtoOut> =>
    (await api.post('/auth/confirm-otp-login', payload))?.data,
  forgotPassword: async (payload: PostForgotPasswordDtoIn): Promise<void> =>
    (await api.post('/auth/forgot-password', payload))?.data,
  resetPassword: async (payload: PostResetPasswordDtoIn): Promise<void> =>
    (await api.post('/auth/reset-password', payload))?.data,
  verifyToken: async (payload: PostVerifyTokenDtoIn): Promise<void> =>
    (await api.post('/auth/verify-token', payload))?.data,
}

export default auth
