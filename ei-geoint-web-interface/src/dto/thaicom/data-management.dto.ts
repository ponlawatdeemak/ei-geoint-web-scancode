import { SortType } from '../../config'

export class ProcessingData {
  processing_object_count: number
  processing_total_bytes: number
  processing_human: HumanSize
}

export class GalleryData {
  gallery_object_count: number
  gallery_total_bytes: number
  gallery_human: HumanSize
}

export class ProjectTaskData {
  org_id: string
  project_id: string
  task_id: string
  object_count: number
  total_bytes: number
  human: HumanSize
}

export class ProjectData {
  org_id: string
  project_id: string
  object_count: number
  total_bytes: number
  human: HumanSize
  tasks: ProjectTaskData[]
  tasks_total_count: number
  task_next_token: string | null
}

export class HumanSize {
  kb: number
  mb: number
  gb: number
  tb: number
}

export class TaskData {
  task_id: string
  object_count: number
  total_bytes: number
  human: HumanSize
}

export class TotalsData {
  object_count: number
  total_bytes: number
  human: HumanSize
}

export class BreakdownData {
  processing: TotalsData
  gallery: TotalsData
  processing_to_gallery_ratio: number
  processing_share_percent: number
  gallery_share_percent: number
}

export class ProjectTotalsData {
  object_count: number
  total_bytes: number
  human: HumanSize
}

export class ProcessingProjectRow {
  project_id: string
  totals: ProjectTotalsData
}

export class ProcessingProjectsData {
  rows: ProcessingProjectRow[]
  row_count: number
  total_count: number
  next_token: string | null
  prev_token: string | null
  current_page: number
  has_next: boolean
  has_prev: boolean
}

export class PostDataManagementTCDtoIn {
  org_id: string
  include_processing: boolean
  include_gallery: boolean
  include_project_breakdown: boolean
  project_limit: number
  project_token: string | null
  project_prev_token: boolean
  sort_by_size?: SortType
}

export class PostDataManagementTCDtoOut {
  as_of: string
  bucket: string
  totals: TotalsData
  breakdown: BreakdownData
  processing_projects: ProcessingProjectsData
}

export class GetDataManagementTCDtoIn {
  user_id: string
  project_limit: number
  project_token: string | null
  sort_by_size?: SortType
}

export class GetDataManagementTCDtoOut {
  bucket: string
  user_id: string
  object_count: number
  total_bytes: number
  human: HumanSize
  processing: ProcessingData
  gallery: GalleryData
  projects: ProjectData[]
  projects_total_count: number
  project_next_token: string | null
  project_prev_token: string | null
}

export class GetTasksDataManagementTCDtoIn {
  org_id: string
  project_id: string
  task_limit: number
  task_token?: string | null
  sort_by_size?: SortType
}

export class GetTasksDataManagementTCDtoOut {
  bucket: string
  org_id: string
  project_id: string
  object_count: number
  total_bytes: number
  human: HumanSize
  tasks: TaskData[]
  tasks_total_count: number
  task_next_token: string | null
  as_of: string
}
