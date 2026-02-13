import { api } from '@/api/core'
import {
  GetModelSubscriptionWeeklyDtoOut,
  PostSearchFeaturesWeeklyDtoIn,
  PostSearchFeaturesWeeklyDtoOut,
  PostSearchLayersWeeklyDtoIn,
  PostSearchLayersWeeklyDtoOut,
} from '@interfaces/index'

const weekly = {
  getSubscriptionModel: async (): Promise<GetModelSubscriptionWeeklyDtoOut[]> =>
    (await api.get(`/weekly/subscription/model`))?.data,
  postSearchFeatures: async (payload: PostSearchFeaturesWeeklyDtoIn): Promise<PostSearchFeaturesWeeklyDtoOut> =>
    (await api.post(`/weekly/search-features`, payload))?.data,
  postSearchLayers: async (payload: PostSearchLayersWeeklyDtoIn[]): Promise<PostSearchLayersWeeklyDtoOut> =>
    (await api.post(`/weekly/search-layers`, payload))?.data,
}

export default weekly
