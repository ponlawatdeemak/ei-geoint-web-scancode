import { api } from '@/api/core'
import {
  DeleteImagesDtoIn,
  GetByItemIdImageDtoOut,
  GetImagesProcessedDtoOut,
  GetInProgressDtoOut,
  GetShareImageDtoOut,
  PostImagesDtoIn,
  PostImagesDtoOut,
  PostShareImageDtoIn,
  PutImagesDtoIn,
  PutImagesDtoOut,
  PutStatusImagesDtoIn,
  SearchImagesDtoIn,
  SearchImagesDtoOut,
} from '@interfaces/dto/images'
import { GetResultImageDtoOut, GetHashTagsDtoOut } from '@interfaces/dto/tasks'
import { AxiosRequestConfig } from 'axios'

const image = {
  resultImage: async (id: string, projectId: string): Promise<GetResultImageDtoOut> =>
    (await api.get(`/images/result/${id}?projectId=${projectId}`))?.data,
  postUpload: async (payload: PostImagesDtoIn): Promise<PostImagesDtoOut> => (await api.post(`/images`, payload))?.data,
  updateStatus: async (payload: PutStatusImagesDtoIn): Promise<void> =>
    (await api.put(`/images/update-status`, payload))?.data,
  getTags: async (keyword: string): Promise<GetHashTagsDtoOut[]> =>
    (await api.get(`/images/tags/${encodeURIComponent(keyword)}`))?.data,
  search: async (
    payload: SearchImagesDtoIn | null,
    config: AxiosRequestConfig,
  ): Promise<SearchImagesDtoOut | undefined> => {
    if (payload) {
      const filteredParams = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value != null && value !== ''),
      )

      const searchParams = new URLSearchParams(filteredParams)
      return (await api.get(`/images/search?${searchParams}`, undefined, config))?.data
    }
  },

  get: async (id: string, config: AxiosRequestConfig): Promise<GetByItemIdImageDtoOut> =>
    (await api.get(`/images/get-by-itemId/${id}`, undefined, config))?.data,

  getInprogress: async (config: AxiosRequestConfig): Promise<GetInProgressDtoOut> =>
    (await api.get(`/images/in-progress`, undefined, config))?.data,

  updateProcess: async (payload: PutStatusImagesDtoIn): Promise<void> => {
    await api.put(`/images/update-status`, payload)
  },

  abortImage: async (id: string): Promise<void> => {
    await api.put(`/images/abort-image-upload/${id}`, {})
  },

  delete: async (payload: DeleteImagesDtoIn): Promise<void> => {
    const filteredParams = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value != null && value !== ''),
    )

    const params = new URLSearchParams(filteredParams)
    await api.delete(`/images?${params}`)
  },
  getProcessTask: async (id: string): Promise<GetImagesProcessedDtoOut[]> =>
    (await api.get(`/images/processed-tasks/${id}`))?.data,

  updateImage: async (id: string, payload: PutImagesDtoIn): Promise<PutImagesDtoOut> =>
    (await api.put(`/images/${id}`, payload))?.data,

  shareImage: async (payload: PostShareImageDtoIn): Promise<void> => {
    await api.post(`/images/share-image`, payload)
  },

  getSharedImage: async (id: string): Promise<GetShareImageDtoOut> =>
    (await api.get(`/images/share-image/${id}`))?.data,
}

export default image
