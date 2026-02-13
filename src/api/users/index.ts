import { api } from '@/api/core'
import {
  GetUserDtoOut,
  PostUserDtoIn,
  PostUserDtoOut,
  PatchUserDtoIn,
  PutChangePasswordDtoIn,
  SearchUserDtoIn,
  SearchUserDtoOut,
  DeleteUserDtoIn,
  PostRefreshEmailFirstTimeLoginDtoIn,
} from '@interfaces/index'

const users = {
  get: async (id: string): Promise<GetUserDtoOut> => (await api.get(`/users/${id}`))?.data,
  create: async (payload: PostUserDtoIn): Promise<PostUserDtoOut> => (await api.post('/users', payload))?.data,
  patch: async (id: string, payload: PatchUserDtoIn): Promise<void> => (await api.patch(`/users/${id}`, payload))?.data,
  changePassword: async (payload: PutChangePasswordDtoIn): Promise<void> =>
    (await api.put('/users/change-password', payload))?.data,
  search: async (payload: SearchUserDtoIn): Promise<SearchUserDtoOut> =>
    (await api.post('/users/search', payload))?.data,
  delete: async (payload: DeleteUserDtoIn): Promise<void> => (await api.post('/users/delete-many', payload))?.data,
  resendSetupPasswordLink: async (payload: PostRefreshEmailFirstTimeLoginDtoIn): Promise<void> =>
    (await api.post('/users/refresh-email-first-time-login', payload))?.data,
}

export default users
