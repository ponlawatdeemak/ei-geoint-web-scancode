import { api, apiAccessToken } from '@/api/core'
import { APIService } from '@interfaces/dto/core'
import {
  CreateItvLayerDtoIn,
  UpdateItvLayerDtoIn,
  DeleteItvLayerDtoIn,
  SearchItvLayerDtoIn,
} from '@interfaces/dto/import-to-visualize'
import {
  ConfirmUploadDtoIn,
  ConfirmUploadDtoOut,
  CreateUploadDtoIn,
  CreateUploadDtoOut,
  DeletePhotoDtoIn,
  GetDownloadDtoIn,
  GetDownloadDtoOut,
  GetThumbnailDtoIn,
  UpdatePhotoLatLongDtoIn,
} from '@interfaces/dto/thaicom/image-geotag.dto'

const importToVisualizeApi = {
  //#region CRUD import-to-visualize layer
  async createLayer(payload: CreateItvLayerDtoIn) {
    return await api.post('/import-to-visualize/layer', payload)
  },
  async updateLayer(payload: UpdateItvLayerDtoIn) {
    return await api.put('/import-to-visualize/layer', payload)
  },
  async deleteLayer(query: DeleteItvLayerDtoIn) {
    const filteredParams = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== null && value !== ''),
    )

    const params = new URLSearchParams(filteredParams)
    await api.delete(`/import-to-visualize/layer?${params}`)
  },
  async searchLayers(query: SearchItvLayerDtoIn) {
    const filteredParams = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== null && value !== '' && JSON.stringify(value) !== '[]'),
    )

    const params = new URLSearchParams(filteredParams)
    return (await api.get(`/import-to-visualize/layer/search?${params}`)).data
  },
  //#endregion

  //#region thaicom-image-geotag
  async createUpload(payload: CreateUploadDtoIn): Promise<CreateUploadDtoOut> {
    return (await api.post('/thaicom-image-geotag/upload', payload)).data
  },
  async confirmUpload(payload: ConfirmUploadDtoIn): Promise<ConfirmUploadDtoOut> {
    return (await api.put('/thaicom-image-geotag/confirm-upload', payload)).data
  },
  async updatePhotoLatLong(payload: UpdatePhotoLatLongDtoIn): Promise<void> {
    return (await api.put('/thaicom-image-geotag/update-photo-lat-long', payload)).data
  },
  async getThumbnail(query: GetThumbnailDtoIn, isNative?: boolean): Promise<Blob> {
    const params = new URLSearchParams()
    if (isNative) params.append('isNative', 'true')
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/thaicom-image-geotag/get-thumbnail/${query.uploadId}${queryString}`, APIService.WebAPI, {
      responseType: 'blob',
    })
    return response.data
  },
  async getDownload(query: GetDownloadDtoIn): Promise<GetDownloadDtoOut> {
    return (await api.get(`/thaicom-image-geotag/get-download/${query.uploadId}`)).data
  },
  async deletePhoto(payload: DeletePhotoDtoIn): Promise<void> {
    const filteredParams = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== ''),
    )

    const params = new URLSearchParams(filteredParams)
    await api.delete(`/thaicom-image-geotag/delete-photo?${params}`)
  },
  //#endregion thaicom-image-geotag
}

export default importToVisualizeApi
