import { api } from '@/api/core'
import {
  SearchProjectDtoIn,
  SearchProjectDtoOut,
  GetProjectDtoOut,
  PostProjectDtoIn,
  PostProjectDtoOut,
  PutProjectDtoIn,
  DeleteProjectDtoIn,
  PutProjectLayerOrderDtoIn,
  PutProjectLayerOrderDtoOut,
  ListProjectDtoOut,
  ListProjectDtoIn,
  GetThumbnailsProjectDtoOut,
} from '@interfaces/index'

const projects = {
  search: async (payload?: SearchProjectDtoIn): Promise<SearchProjectDtoOut> =>
    (await api.post('/projects/search', payload || {}))?.data,
  get: async (id: string): Promise<GetProjectDtoOut> => (await api.get(`/projects/${id}`))?.data,
  create: async (payload: PostProjectDtoIn): Promise<PostProjectDtoOut> => (await api.post('/projects', payload))?.data,
  update: async (id: string, payload: PutProjectDtoIn): Promise<void> =>
    (await api.put(`/projects/${id}`, payload))?.data,
  delete: async (payload: DeleteProjectDtoIn): Promise<void> =>
    (await api.post('/projects/delete-many', payload))?.data,
  postThumbnails: async (projectId: string, file: File): Promise<void> => {
    const formData = new FormData()
    formData.append('thumbnail', file)
    return (await api.post(`/projects/thumbnails/${projectId}`, formData))?.data
  },
  getThumbnails: async (projectIds: string[]): Promise<GetThumbnailsProjectDtoOut> => {
    const params = new URLSearchParams()
    projectIds.forEach((id) => params.append('ids', id))
    return (await api.get(`/projects/thumbnails?${params}`))?.data
  },
  updateLayerOrder: async (payload: PutProjectLayerOrderDtoIn): Promise<PutProjectLayerOrderDtoOut> =>
    (await api.put('/projects/layer-order', payload))?.data,

  async list(query: ListProjectDtoIn): Promise<ListProjectDtoOut> {
    const filteredParams = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== null && value !== '' && JSON.stringify(value) !== '[]'),
    )

    const params = new URLSearchParams(filteredParams)
    return (await api.get(`/projects/list?${params}`)).data
  },
}

export default projects
