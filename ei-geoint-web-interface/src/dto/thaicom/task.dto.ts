import ThaicomProcessingStatus from '../../config/thaicom.config'

export class ObjectDetectionRequest {
  item_id: string
  model_ids: string[]
  name: string
  org_id: string
  project_id: string
  user_id: string
}

export class ChangeDetectionSelectResultItem {
  model_id: string
  before: string
  after: string
}

export class ChangeDetectionRequest {
  data: ChangeDetectionSelectResultItem[]
  name: string
  org_id: string
  project_id: string
  user_id: string
}

export class ThaicomGeointItem {
  id: string
  task_id: string
  task_type: string
  name: string
  org_id: string
  project_id: string
  user_id: string
  result_id: string | null
  status: boolean
  processing_status: string
  error_message: string | null
  created_at: string
  updated_at: string
  disabled: boolean
}

export class EditDetectionRequest {
  name: string
  processing_status?: ThaicomProcessingStatus
}
export class ShareProjectRequest {
  project_id: string
  share_with: string[]
  item_ids: string[]
}

export class ShareImageRequest {
  share_with: string[]
  item_id: string
}

export class SARRequest {
  after_item_id: string
  before_item_id: string
  file_name: string
  file_size: number
  file_type: string
  model_id: string
  name: string
  org_id: string
  project_id: string
  user_id: string
}

export class SARResponse {
  task_id: string
  upload_url: string
  bucket: string
  object_key: string
}

export class ResultCallbackSARRequest {
  file_name: string
  file_size: number
  file_type: string
  org_id: string
  project_id: string
  task_id: string
  user_id: string
}

export class ResultCallbackSARResponse {
  task_id: string
  result_id: string
  upload_url: string
  bucket: string
  object_key: string
}
