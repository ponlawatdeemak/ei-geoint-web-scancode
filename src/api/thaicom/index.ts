import { api } from '@/api/core'
import { APIService } from '@interfaces/dto/core'
import { GetImagesTCDtoOut, GetTaskTCDtoOut } from '@interfaces/dto/thaicom/stac.dto'
import {
  GetUploadTCDtoOut,
  PostUploadCompleteTCDtoIn,
  PostUploadMultipartAbortTCDtoIn,
  PostUploadMultipartAbortTCDtoOut,
  PostUploadMultipartCompleteTCDtoIn,
  PostUploadMultipartCompleteTCDtoOut,
  PostUploadMultipartConfirmTCDtoIn,
  PostUploadMultipartConfirmTCDtoOut,
  PostUploadMultipartStartTCDtoIn,
  PostUploadMultipartStartTCDtoOut,
  PostUploadMultipartStatusTCDtoIn,
  PostUploadMultipartStatusTCDtoOut,
  PostUploadMultipartUploadTCDtoIn,
  PostUploadMultipartUploadTCDtoOut,
  PostUploadTCDtoIn,
  PostUploadTCDtoOut,
  PutUploadTCDtoIn,
  PutUploadTCDtoOut,
} from '@interfaces/dto/thaicom/upload.dto'

const thaicom = {
  getUpload: async (uploadId: string): Promise<GetUploadTCDtoOut> =>
    (await api.get(`/api/upload/${uploadId}`, APIService.ThaicomAPI))?.data,
  postUpload: async (payload: PostUploadTCDtoIn): Promise<{ data: PostUploadTCDtoOut }> =>
    await api.post(`/api/upload`, payload, APIService.ThaicomAPI),
  putUpload: async (uploadId: string, payload: Partial<PutUploadTCDtoIn>): Promise<PutUploadTCDtoOut> =>
    (await api.put(`/api/upload/${uploadId}`, payload, APIService.ThaicomAPI))?.data,
  deleteUpload: async (uploadId: string): Promise<void> =>
    (await api.delete(`/api/upload/${uploadId}`, APIService.ThaicomAPI))?.data,
  postUploadComplete: async (payload: PostUploadCompleteTCDtoIn): Promise<void> =>
    (await api.post(`/api/upload/complete`, payload, APIService.ThaicomAPI))?.data,
  postUploadMultipartStart: async (
    payload: PostUploadMultipartStartTCDtoIn,
  ): Promise<PostUploadMultipartStartTCDtoOut> =>
    (await api.post(`/api/upload/multipart/start`, payload, APIService.ThaicomAPI))?.data,
  postUploadMultipartUpload: async (
    payload: PostUploadMultipartUploadTCDtoIn,
  ): Promise<PostUploadMultipartUploadTCDtoOut> =>
    (await api.post(`/api/upload/multipart/upload`, payload, APIService.ThaicomAPI))?.data,
  postUploadMultipartConfirm: async (
    payload: PostUploadMultipartConfirmTCDtoIn,
  ): Promise<PostUploadMultipartConfirmTCDtoOut> =>
    (await api.post(`/api/upload/multipart/confirm`, payload, APIService.ThaicomAPI))?.data,
  postUploadMultipartStatus: async (
    payload: PostUploadMultipartStatusTCDtoIn,
  ): Promise<PostUploadMultipartStatusTCDtoOut> =>
    (await api.post(`/api/upload/multipart/status`, payload, APIService.ThaicomAPI))?.data,
  postUploadMultipartAbort: async (
    payload: PostUploadMultipartAbortTCDtoIn,
  ): Promise<PostUploadMultipartAbortTCDtoOut> =>
    (await api.post(`/api/upload/multipart/abort`, payload, APIService.ThaicomAPI))?.data,
  postUploadMultipartComplete: async (
    payload: PostUploadMultipartCompleteTCDtoIn,
  ): Promise<PostUploadMultipartCompleteTCDtoOut> =>
    (await api.post(`/api/upload/multipart/complete`, payload, APIService.ThaicomAPI))?.data,
  getTaskTC: async (taskId: string): Promise<GetTaskTCDtoOut> => (await api.get(`/thaicom-stac/task/${taskId}`))?.data,
  getImagesTC: async (ids: string[]): Promise<GetImagesTCDtoOut> =>
    (await api.post(`/thaicom-stac/images`, { ids }, APIService.WebAPI))?.data,
}

export default thaicom
