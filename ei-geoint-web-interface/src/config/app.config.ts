import type { Geometry } from 'geojson'
import { TaskDownloadItem } from '../dto/tasks'
import { ItvFeatureProperties, ItvImage, ItvLayer } from '../entities'
import { SearchImagesResultItem } from '../dto/images'

export enum AuthPath {
  Login = '/auth/login',
  ForgotPassword = '/auth/forgot-password',
  ResetPassword = '/auth/reset-pwd',
}

export enum PrivatePath {
  Profile = '/profile',
  PasswordReset = '/profile/password-reset',
  UM = '/UM',
}

export const authPathPrefix = '/auth'
export const errorPathPrefix = '/error'

export const AppPath = { ...AuthPath, ...PrivatePath }

export class ResponseDto<T = any> {
  constructor(param?: ResponseDtoConstructorParam<T>) {
    this.total = param?.total
    this.data = param?.data as any
  }
  total?: number
  data: T
}

class ResponseDtoConstructorParam<T = any> {
  total?: number
  data: T
}

export class ResponseLanguage {
  th: string
  en: string
}

export enum SortType {
  ASC = 'asc',
  DESC = 'desc',
}

export enum Language {
  EN = 'en',
  TH = 'th',
}

export enum TaskMode {
  save = 'SAVE',
  saveAndProcess = 'SAVE_AND_PROCESS',
  editNameOnly = 'EDIT_NAME_ONLY',
}

// enum from DB
export enum LogTypes {
  add = 1,
  edit = 2,
  delete = 3,
  firstTimeChangePassword = 4,
  resetPassword = 5,
  login = 6,
  logout = 7,
}

export enum LogStatus {
  fail = 0,
  success = 1,
}

export enum PasswordResetTypes {
  firstTimePassword = 1,
  restPassword = 2,
}

export enum Roles {
  superAdmin = 1,
  admin = 2,
  customerAdmin = 3,
  user = 4,
  viewer = 5,
}

export enum ServiceConfig {
  optical = 1,
  sar = 2,
  weekly = 3,
}

export enum RootModelConfig {
  objectDetection = 1,
  changeDetection = 4,
  sarBattleDamage = 13,
  sarChangeDetection = 14,
}

export enum ModelConfig {
  objectDetection = 1,
  objectDetection_road = 2,
  objectDetection_building = 3,
  changeDetection = 4,
  change_detection_road = 5,
  change_detection_road_v1_new = 6,
  change_detection_road_v1_removed = 7,
  change_detection_building = 8,
  change_detection_building_v1_new = 9,
  change_detection_building_v1_removed = 10,
  change_detection_building_v1_expanded = 11,
  change_detection_building_no_change = 12,
  change_detection_road_v1_expanded = 22,
  sar_battle_damage_assessment_v1 = 13,
  sar_change_detection_v1 = 14,
}

export enum TaskStatus {
  draft = 1,
  inProgress = 2,
  completed = 3,
  failed = 4,
  waitingForResults = 5,
}

export enum ComparisionType {
  before = 1,
  after = 2,
}

export const ModelMapping = {
  [ModelConfig.change_detection_road]: [ModelConfig.objectDetection_road],
  [ModelConfig.change_detection_building]: [ModelConfig.objectDetection_building],
}

export const MappingChangeToObject = {
  [ModelConfig.objectDetection_road]: [
    ModelConfig.change_detection_road_v1_new,
    ModelConfig.change_detection_road_v1_removed,
    ModelConfig.change_detection_road_v1_expanded,
  ],
  [ModelConfig.objectDetection_building]: [
    ModelConfig.change_detection_building_v1_new,
    ModelConfig.change_detection_building_v1_removed,
    ModelConfig.change_detection_building_v1_expanded,
  ],
}

export enum ImageStatus {
  draft = 1, // แบบร่าง (ไม่ได้ใช้)
  uploadPending = 2, // รออัปโหลด (สถานะตั้งต้น)
  uploadComplete = 3, // อัปโหลดเสร็จ (ไม่ได้ใช้)
  inProgress = 4, // กำลังดำเนินการ (ถ้ากำลัง validate ใน geoint จะเป็นสถานะนี้)
  completed = 5, // สำเร็จ
  aborted = 6, // ยกเลิก
  failed = 7, // ล้มเหลว
}

export enum MapType {
  vector = 'vector',
  tile = 'tile',
  geojson = 'geojson',
  heatmap = 'heatmap',
  itvGallery = 'itv-gallery',
  itvVectorTile = 'itv-vector-tile',
  itvRasterTile = 'itv-raster-tile',
  itvPhoto = 'itv-photo',
  itvVector = 'itv-vector',
  itvDraw = 'itv-draw',
  itvAnnotation = 'itv-annotation',
}

export enum ProjectMapViewPageLevel {
  project = 'project',
  task = 'task',
}

export enum ProjectMapViewMode {
  layer = 'layer',
  weekly = 'weekly',
}

export type ProjectMapViewLayer = {
  id: string
  label: string
  color: string
  type: MapType
  key: string
  itemCount?: number | null
  totalArea?: MapArea
}

export type ProjectMapViewGroup = {
  groupId: string
  groupName: string
  projectId?: string
  rootModelName?: string
  serviceId?: ServiceConfig
  taskId?: string
  rootModelId?: RootModelConfig
  // สำหรับ Display UI
  layers: ProjectMapViewLayer[]
  // สำหรับแผนที่
  layerConfigs?: LayerConfig[]
  statusId?: number
  download?: TaskDownloadItem[]
  layerType: ItvLayerType
  order: number
  itvLayerInfo: ItvLayer | undefined
}

export type MapArea = {
  rai?: number | null
  sqm?: number | null
  sqkm?: number | null
  acre?: number | null
  hectare?: number | null
  sqmile?: number | null
  sqnauticmile?: number | null
}

// --- Layer config types (serializable) -------------------------------------------------
export type TileLayerConfig = {
  type: MapType.tile
  id: string
  galleryId?: string
  inputId?: string
  label?: string
  index: number
  template?: string
  data?: string | string[]
  tiles?: string | string[]
  geometry: Geometry | null
  bands?: number[]
  bandsCount?: number
  imageType?: number
  colormapName?: string
}

export type VectorLayerConfig = {
  type: MapType.vector | MapType.heatmap
  id: string
  data: string | string[]
  assetKey?: string
  color_code?: string
  geometry: Geometry | null
}

export type GeoJsonLayerConfig = {
  type: MapType.geojson
  id: string
  data: GeoJSON.FeatureCollection | string | string[] | null
  assetKey?: string
  color_code?: string
  geometry: Geometry | null
  label?: string
}

export type ItvLayerConfig = Omit<GeoJsonLayerConfig, 'type'> & {
  type: MapType.itvVector | MapType.itvDraw | MapType.itvPhoto
}

export type ItvTileLayerConfig = Omit<TileLayerConfig, 'type'> & {
  type: MapType.itvRasterTile
}

export type ItvVectorLayerConfig = Omit<VectorLayerConfig, 'type'> & {
  type: MapType.itvVectorTile
  label?: string
}

export type ItvGalleryLayerConfig = Omit<TileLayerConfig, 'type'> & {
  type: MapType.itvGallery
  image: ItvImage | null
}

export type ItvAnnotationLayerConfig = Omit<GeoJsonLayerConfig, 'type'> & {
  type: MapType.itvAnnotation
  features: ItvFeatureProperties[] | null
}

export type LayerConfig =
  | TileLayerConfig
  | VectorLayerConfig
  | GeoJsonLayerConfig
  | ItvLayerConfig
  | ItvTileLayerConfig
  | ItvVectorLayerConfig
  | ItvGalleryLayerConfig
  | ItvAnnotationLayerConfig

export const SARStatusText = {
  1: 'draft',
  2: 'inProgress',
  3: 'completed',
  4: 'failed',
  5: 'waitingForResults',
}

export const SARBattleDamageKey = 'sar-battle_damage_assessment_v1'
export const SARChangeDetectionKey = 'sar-battle_damage_assessment_v1-point'

export const CheckWeeklyObjectDetection = 'objectdetection'
export const CheckWeeklyChangeDetection = 'changedetection'

export const ItvLayerType = {
  GALLERY: 'GALLERY',
  VECTOR_TILE: 'VECTOR_TILE',
  RASTER_TILE: 'RASTER_TILE',
  PHOTO: 'PHOTO',
  VECTOR: 'VECTOR',
  DRAW: 'DRAW',
  ANNOTATION: 'ANNOTATION',
  TASK: 'TASK', // layer ที่ได้จากการสร้าง Task
} as const

export type ItvLayerType = (typeof ItvLayerType)[keyof typeof ItvLayerType]

export const ItvDrawType = {
  POINT: 'POINT',
  LINE: 'LINE',
  POLYGON: 'POLYGON',
  TEXT: 'TEXT',
} as const

export type ItvDrawType = (typeof ItvDrawType)[keyof typeof ItvDrawType]

export const ItvDrawPolygonType = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  POLYGON: 'polygon',
}

export type ItvDrawPolygonType = (typeof ItvDrawPolygonType)[keyof typeof ItvDrawPolygonType]
