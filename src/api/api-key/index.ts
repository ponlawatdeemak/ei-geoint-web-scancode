import { ShareApiDtoIn, ShareApiDtoOut } from '@interfaces/dto/organization-api-key'
import { api } from '../core'

const apiKey = {
  shareApiUrls: async (payload: ShareApiDtoIn): Promise<ShareApiDtoOut> =>
    (await api.post('/api-key/share', payload))?.data,
}

export default apiKey
