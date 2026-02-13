import { api } from '@/api/core'
import { GetLookupDtoIn, GetLookupDtoOut, GetModelAllDtoOut } from '@interfaces/index'

const lookup = {
  get: async (payload: GetLookupDtoIn): Promise<GetLookupDtoOut[]> =>
    (await api.get('/lookup', undefined, { params: payload }))?.data,
  getModelAll: async (): Promise<GetModelAllDtoOut[]> => (await api.get('/lookup/model-all'))?.data,
}

export default lookup
