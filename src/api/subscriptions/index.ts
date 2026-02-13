import { api } from '@/api/core'
import {
  GetLookupDtoOut,
  GetAllSubscriptionsDtoOut,
  SearchSubscriptionDtoIn,
  SearchSubscriptionDtoOut,
  GetSubscriptionDtoOut,
  PostSubscriptionDtoIn,
  PostSubscriptionDtoOut,
  PutSubscriptionDtoIn,
  DeleteSubscriptionDtoIn,
} from '@interfaces/index'

const subscriptions = {
  getItemByOrg: async (id: string): Promise<GetLookupDtoOut[]> =>
    (await api.get(`/subscriptions/get-item-by-org/${id}`))?.data,
  all: async (): Promise<GetAllSubscriptionsDtoOut[]> => (await api.get('/subscriptions/all'))?.data,
  search: async (payload?: SearchSubscriptionDtoIn): Promise<SearchSubscriptionDtoOut> =>
    (await api.post('/subscriptions/search', payload || {}))?.data,
  get: async (id: string): Promise<GetSubscriptionDtoOut> => (await api.get(`/subscriptions/${id}`))?.data,
  create: async (payload: PostSubscriptionDtoIn): Promise<PostSubscriptionDtoOut> =>
    (await api.post('/subscriptions', payload))?.data,
  update: async (id: string, payload: PutSubscriptionDtoIn): Promise<void> =>
    (await api.put(`/subscriptions/${id}`, payload))?.data,
  delete: async (payload: DeleteSubscriptionDtoIn): Promise<void> =>
    (await api.post('/subscriptions/delete-many', payload))?.data,
}

export default subscriptions
