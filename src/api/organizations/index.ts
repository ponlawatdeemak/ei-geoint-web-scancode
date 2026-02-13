import { api } from '@/api/core'
import {
  GetLookupDtoOut,
  SearchOrganizationDtoIn,
  SearchOrganizationDtoOut,
  GetOrganizationDtoOut,
  PostOrganizationDtoIn,
  PostOrganizationDtoOut,
  PutOrganizationDtoIn,
  DeleteOrganizationDtoIn,
} from '@interfaces/index'

const organizations = {
  getItem: async (): Promise<GetLookupDtoOut[]> => (await api.get('/organizations/get-item'))?.data,
  search: async (payload?: SearchOrganizationDtoIn): Promise<SearchOrganizationDtoOut> =>
    (await api.post('/organizations/search', payload || {}))?.data,
  get: async (id: string): Promise<GetOrganizationDtoOut> => (await api.get(`/organizations/${id}`))?.data,
  create: async (payload: PostOrganizationDtoIn): Promise<PostOrganizationDtoOut> =>
    (await api.post('/organizations', payload))?.data,
  update: async (id: string, payload: PutOrganizationDtoIn): Promise<void> =>
    (await api.put(`/organizations/${id}`, payload))?.data,
  delete: async (payload: DeleteOrganizationDtoIn): Promise<void> =>
    (await api.post('/organizations/delete-many', payload))?.data,
}

export default organizations
