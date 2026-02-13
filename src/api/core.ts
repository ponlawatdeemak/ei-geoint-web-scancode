import { APIConfigType, APIService, AppAPI, ErrorResponse, RetryQueueItem } from '@interfaces/dto/core'
import axios, { AxiosRequestConfig } from 'axios'
import service from './index'
import { errorResponse } from '@interfaces/config'

const APIConfigs: { [key: string]: APIConfigType } = {
  [APIService.WebAPI]: {
    baseURL: process.env.API_URL,
    apiKey: process.env.API_KEY,
  },
  [APIService.MapAPI]: {
    baseURL: process.env.API_URL_MAP,
    apiKey: process.env.API_KEY_MAP,
  },

  [APIService.ThaicomAPI]: {
    baseURL: process.env.THAICOM_API_URL,
    apiKey: '',
  },
}

export let apiAccessToken: string | null = null
let apiRefreshToken: string | null = null
let apiUserId: string | null = null
// let isRefreshing = false
// const refreshAndRetryQueue: RetryQueueItem[] = []

const instance = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    'x-api-key': process.env.API_KEY || '',
  },
})

const getConfig = (service: APIService, config: AxiosRequestConfig<any> | undefined) => ({
  ...config,
  baseURL: APIConfigs[service].baseURL,
  headers: {
    'x-api-key': APIConfigs[service].apiKey || '',
  },
})

export const api: AppAPI = {
  ...instance,
  get: async (url: string, service: APIService = APIService.WebAPI, config?: AxiosRequestConfig<any> | undefined) =>
    await instance.get(url, getConfig(service, config)),
  post: async (
    url: string,
    data: any,
    service: APIService = APIService.WebAPI,
    config?: AxiosRequestConfig<any> | undefined,
  ) => await instance.post(url, data, getConfig(service, config)),
  put: async (
    url: string,
    data: any,
    service: APIService = APIService.WebAPI,
    config?: AxiosRequestConfig<any> | undefined,
  ) => await instance.put(url, data, getConfig(service, config)),
  delete: async (url: string, service: APIService = APIService.WebAPI, config?: AxiosRequestConfig<any> | undefined) =>
    await instance.delete(url, getConfig(service, config)),
  patch: async (
    url: string,
    data: any,
    service: APIService = APIService.WebAPI,
    config?: AxiosRequestConfig<any> | undefined,
  ) => await instance.patch(url, data, getConfig(service, config)),
}

export const refreshAccessToken = async () => {
  const res = await service.auth.refreshToken({
    accessToken: apiAccessToken || '',
    refreshToken: apiRefreshToken || '',
  })

  if (!res) {
    throw new Error(errorResponse.internalServerError)
  }

  const accessToken = res?.accessToken === '' ? undefined : res?.accessToken
  updateAccessToken({ accessToken })
  return { accessToken, apiRefreshToken }
}

instance.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const errorData = error?.response?.data?.error || {}
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config as any
      if (!originalRequest?._retry) {
        originalRequest._retry = true
        const { accessToken } = await refreshAccessToken()
        error.config.headers.Authorization = `Bearer ${accessToken}`

        return instance({
          ...originalRequest,
          headers: {
            ...originalRequest.headers,
            authorization: `Bearer ${accessToken}`,
          },
        }).catch((err) => {
          console.log(' err ', err)
          // ถ้า refresh ไม่ผ่าน → redirect ไป login
          forceLogout()
          throw err
        })
      }
    } else if (error.response && error.response.status === 403) {
      // ถ้า 403 → บังคับ logout
      forceLogout()
    }
    const err: ErrorResponse = {
      message: errorData.message || error.message,
      title: errorData.title || 'Error',
      status: errorData.status || error.status,
      details: errorData.details || null,
    }
    return Promise.reject(err)
  },
)

const forceLogout = () => {
  // กรณีไม่สามารถต่ออายุ token ได้ จะบังคับ login ใหม่
  const href = window.location.href
  const query = href.split('?')?.[1]
  let newHref = href
  if (!query?.includes('sessionExpired=1')) {
    newHref += href.includes('?') ? '&sessionExpired=1' : '?sessionExpired=1'
  }
  window.history.pushState(null, '', newHref)
}

export function updateAccessToken({
  accessToken,
  refreshToken,
  userId,
}: {
  accessToken?: string
  refreshToken?: string
  userId?: string
}) {
  if (accessToken) {
    instance.defaults.headers.common.authorization = `Bearer ${accessToken}`
    apiAccessToken = accessToken
    if (refreshToken) apiRefreshToken = refreshToken
    if (userId) apiUserId = userId
  } else {
    instance.defaults.headers.common.authorization = null
    apiAccessToken = null
    apiRefreshToken = null
    apiUserId = null
  }
}
