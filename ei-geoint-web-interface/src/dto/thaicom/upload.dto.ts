export interface PostUploadTCDtoIn {
  file_name: string
  file_size: number
  file_type: string
  imaging_date: string
  metadata: string
  image_type: number
  name: string
  org_id: string
  tags: string[]
  user_id: string
}

export interface PostUploadTCDtoOut {
  item_id: string
  upload_id: string
  url: string
}

export interface PostUploadCompleteTCDtoIn {
  upload_id: string
}

export interface PutUploadTCDtoIn {
  item_id: string
  imaging_date: string
  name: string
  tags: string[]
}

export interface PutUploadTCDtoOut {
  message: string
  upload_id: string
}

export interface GetUploadTCDtoOut {
  id: string
  item_id: string
  upload_id: string
  user_id: string
  org_id: string
  filename: string
  name: string
  file_size: number
  content_type: string
  image_type: number
  imaging_date: string
  tags: string[]
  file_metadata: string
  s3_bucket: string
  object_key: string
  key_id: string | null
  upload_status: string
  processing_status: string
  progress_percent: number
  step_started_at: string | null
  step_finished_at: string | null
  error_code: string | null
  error_message: string | null
  validation_report: string | null
  cog_info: string | null
  disabled: boolean
  created_at: string
  updated_at: string
}

export interface PostUploadMultipartStartTCDtoIn extends PostUploadTCDtoIn {
  chunk_size: number
}
export interface PostUploadMultipartStartTCDtoOut {
  upload_id: string
  item_id: string
}

export interface PostUploadMultipartUploadTCDtoIn {
  file_name: string
  part_number: number
  upload_id: string
}

export interface PostUploadMultipartUploadTCDtoOut {
  url: string
}

export interface PostUploadMultipartConfirmTCDtoIn {
  etag: string
  file_name: string
  part_number: number
  upload_id: string
}

export interface PostUploadMultipartConfirmTCDtoOut {
  status: string
}

export interface PostUploadMultipartStatusTCDtoIn {
  upload_id: string
}
export interface PostUploadMultipartStatusTCDtoOut {
  message: string
}

export interface PostUploadMultipartAbortTCDtoIn {
  file_name: string
  upload_id: string
}

export interface PostUploadMultipartAbortTCDtoOut {
  aborted: boolean
}

export interface PostUploadMultipartCompleteTCDtoIn {
  file_name: string
  upload_id: string
  parts: {
    ETag: string
    PartNumber: number
  }[]
}

export interface PostUploadMultipartCompleteTCDtoOut {
  message: string
  upload_id: string
  item_id: string
  total_active_seconds: number
}

export interface PutUploadTCDtoIn {
  item_id: string
  imaging_date: string
  name: string
  tags: string[]
}
