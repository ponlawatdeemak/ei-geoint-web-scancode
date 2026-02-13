import { api } from '@/api/core'
import {
  GetUsersDataManagementDtoIn,
  GetUsersDataManagementDtoOut,
  GetSubscriptionsDataManagementDtoIn,
  GetSubscriptionsDataManagementDtoOut,
  SearchSubscriptionExpireDataManagementDtoIn,
  SearchSubscriptionExpireDataManagementDtoOut,
  SearchUsedStorageDataManagementDtoIn,
  SearchUsedStorageDataManagementDtoOut,
  SearchTasksDataManagementDtoIn,
  SearchTasksDataManagementDtoOut,
  UsedStorageData,
  UsedStorageProjectItem,
} from '@interfaces/index'

export type {
  UsedStorageData,
  UsedStorageProjectItem,
  SearchUsedStorageDataManagementDtoOut,
  SearchTasksDataManagementDtoOut,
}

const dataManagement = {
  getUsers: async (payload?: GetUsersDataManagementDtoIn): Promise<GetUsersDataManagementDtoOut[]> => {
    const params = payload?.organizationId ? `${payload.organizationId}` : ''
    return (await api.get(`/data-management/users/${params}`))?.data
  },

  getSubscriptions: async (
    payload?: GetSubscriptionsDataManagementDtoIn,
  ): Promise<GetSubscriptionsDataManagementDtoOut[]> => {
    const params = payload?.organizationId ? `${payload.organizationId}` : ''
    return (await api.get(`/data-management/subscriptions/${params}`))?.data
  },

  searchSubscriptionExpire: async (
    payload: SearchSubscriptionExpireDataManagementDtoIn,
  ): Promise<SearchSubscriptionExpireDataManagementDtoOut> =>
    (await api.post('/data-management/subscription-expire/search', payload))?.data,

  getUsedStorage: async (
    payload?: SearchUsedStorageDataManagementDtoIn,
  ): Promise<SearchUsedStorageDataManagementDtoOut> => (await api.post('/data-management/used-storage', payload))?.data,

  searchTasks: async (payload: SearchTasksDataManagementDtoIn): Promise<SearchTasksDataManagementDtoOut> =>
    (await api.post('/data-management/tasks/search', payload))?.data,
}

export default dataManagement
