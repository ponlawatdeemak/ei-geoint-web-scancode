import { api } from '@/api/core'
import {
  SearchTasksDtoIn,
  SearchTasksDtoOut,
  GetTasksDtoOut,
  PostTasksDtoIn,
  PostTasksDtoOut,
  PutTasksDtoIn,
  PostSearchLayersTasksDtoOut,
  PostSearchLayersTasksDtoIn,
  GetModelAllDtoOut,
  GetThumbnailsTaskDtoOut,
} from '@interfaces/index'

const tasks = {
  search: async (payload?: SearchTasksDtoIn): Promise<SearchTasksDtoOut> =>
    (await api.post('/tasks/search', payload || {}))?.data,
  get: async (id: string): Promise<GetTasksDtoOut> => (await api.get(`/tasks/${id}`))?.data,
  getAll: async (projectId: string): Promise<GetTasksDtoOut[]> => (await api.get(`/tasks/get-all/${projectId}`))?.data,
  create: async (payload: PostTasksDtoIn): Promise<PostTasksDtoOut> => (await api.post('/tasks', payload))?.data,
  update: async (id: string, payload: PutTasksDtoIn): Promise<void> => (await api.put(`/tasks/${id}`, payload))?.data,
  delete: async (id: string): Promise<void> => (await api.delete(`/tasks/${id}`))?.data,
  checkStatusProject: async (projectId: string): Promise<void> =>
    (await api.get(`/tasks/project/${projectId}/check-status`))?.data,
  saveAnalysisResultSuccess: async (payload: FormData): Promise<void> =>
    (await api.post('/tasks/result-callback-sar', payload))?.data,
  saveAnalysisResultFailed: async (id: string): Promise<void> =>
    (await api.put(`/tasks/result-sar/failed/${id}`, {}))?.data,
  postLayers: async (payload: PostSearchLayersTasksDtoIn): Promise<PostSearchLayersTasksDtoOut> =>
    (await api.post(`/tasks/search-layers`, payload))?.data,
  postThumbnails: async (taskId: string, file: File): Promise<void> => {
    const formData = new FormData()
    formData.append('thumbnail', file)
    return (await api.post(`/tasks/thumbnails/${taskId}`, formData))?.data
  },
  getThumbnails: async (taskIds: string[]): Promise<GetThumbnailsTaskDtoOut> => {
    const params = new URLSearchParams()
    for (const id of taskIds) {
      params.append('ids', id)
    }
    return (await api.get(`/tasks/thumbnails?${params}`))?.data
  },
  getSubscriptionServicesTasks: async (): Promise<GetModelAllDtoOut[]> =>
    (await api.get(`/tasks/subscription/services`))?.data,
  getSubscriptionModelsTasks: async (): Promise<GetModelAllDtoOut[]> =>
    (await api.get(`/tasks/subscription/models`))?.data,
}

export default tasks
