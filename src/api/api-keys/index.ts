import { api } from '@/api/core'
import {
  CreateOrganizationApiKeyDtoIn,
  CreateOrganizationApiKeyDtoOut,
  GetOrganizationApiKeyDtoIn,
  GetOrganizationApiKeyDtoOut,
  OrganizationApiDtoIn,
  OrganizationApiDtoOut,
  UpdateOrganizationApiKeyDtoIn,
  UpdateOrganizationApiKeyDtoOut,
} from '@interfaces/dto/organization-api-key'

const apiKeys = {
  get: async (payload: GetOrganizationApiKeyDtoIn): Promise<GetOrganizationApiKeyDtoOut> =>
    (await api.get('/api-key/', undefined, { params: payload }))?.data,
  create: async (payload: CreateOrganizationApiKeyDtoIn): Promise<CreateOrganizationApiKeyDtoOut> =>
    (await api.post('/api-key', payload))?.data,
  update: async (payload: UpdateOrganizationApiKeyDtoIn): Promise<UpdateOrganizationApiKeyDtoOut> =>
    (await api.put('/api-key', payload))?.data,
  revoke: async (payload: OrganizationApiDtoIn): Promise<OrganizationApiDtoOut> =>
    (await api.put('/api-key/revoke', payload))?.data,
  activate: async (payload: OrganizationApiDtoIn): Promise<OrganizationApiDtoOut> =>
    (await api.put('/api-key/activate', payload))?.data,
}

export default apiKeys
