import { Geometry, Polygon } from 'geojson'
import { ItvDrawPolygonType, ItvDrawType, ItvLayerType } from '../config'

export class Model {
  id: number
  serviceId: number
  parentModelId?: number | null
  name: string
  nameEn: string
  key?: string
}
export class Role {
  id: number
  name: string
  nameEn: string
}
export class Service {
  id: number
  name: string
  nameEn: string
}

export class Organization {
  id: string
  name: string
  nameEn: string
  contactName?: string
  contactEmail?: string
  adminNumber?: number | null
  userNumber?: number | null
  viewerNumber?: number | null
  storageNumber?: number | null
  projectNumber?: number | null
  token?: string
  isActive: boolean
  isApiSharingEnabled: boolean
}

export class OrganizationSubscription {
  id: string
  organizationId: string
  subscriptionId: string
  startAt: Date
  endAt: Date
}

export class Subscription {
  id: string
  name: string
  nameEn: string
}

export class SubscriptionModel {
  id: string
  modelId: number
  subscriptionId: string
}

export class UserSubscription {
  id: string
  userId: string
  subscriptionId: string
  subscription?: Subscription
}

export class User {
  id: string
  roleId: number
  organizationId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  userName: string
  isActive: boolean
  isDeleted: boolean
  isLoginFirstTime: boolean
}

export class Project {
  id: string
  name: string
  detail?: string | null
  statusId?: string | null
  organizationId: string
  geometry?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
  organization?: Organization | null
}

export class ProjectUser {
  id: string
  projectId: string
  userId: string
}

export class Image {
  id: string
  name: string
  imagingDate?: Date | null
  metadata?: string | null
  chunkSize?: number | null
  chunkAmount?: number | null
  fileName?: string | null
  fileSize?: number | null
  fileType?: string | null
  uploadId?: string | null
  itemId?: string | null
  serviceId: string
  statusId: string
  organizationId: string
  isDeleted: boolean
  createdAt: Date
  createdBy: string
  updatedAt?: Date | null
  updatedBy?: string | null
  imageHashtags?: ImageHashtag[]
  shareImages?: SharedImages[]
  createdByUser?: User
  service?: Service
  status?: LutImageStatus
}

export class ImageHashtag {
  id: string
  imageId: string
  hashtagsId: string
  hashtag: Hashtag
}

export class Hashtag {
  id: string
  name: string
}

export class SharedImages {
  id: string
  imageId: string
  userId: string
}
export class Task {
  id: string
  projectId: string
  name: string
  processAt?: Date | null
  resultId?: string | null
  resultAt?: Date | null
  serviceId?: number
  rootModelsId?: string
  statusId: number
  status?: LutTaskStatus
  // organizationId: string
  isDeleted: boolean
  createdAt: Date
  createdBy: string
  updatedAt?: Date | null
  updatedBy?: string | null
  thaicomTaskId?: string | null
  order?: number | null
  project?: Project
  rootModel?: LutModel
  service?: Service
  createdByUser?: User
  taskModels?: TaskModel[]
  taskImages?: TaskImage[]
  selectResults?: TaskImageSelectResult[]
  aoiGeometryCollections?: AoiGeometryCollection[]
  aoiCoordinates?: AoiCoordinate[]
  taskAoiVectors?: TaskAoiVector[]
  thumbnail?: string | null
}

export class TaskImageSelectResult {
  id: string
  taskImageId: string
  groupModelId: string
  selectResultTaskId: string
  taskImage: TaskImage
  groupModel: LutModel
  selectResultTask: Task
}

export class TaskImage {
  id: string
  tasksId: string
  imageId: string
  comparisonsTypeId?: number | null
  task: Task
  image: Image
  selectResults: TaskImageSelectResult[]
}

export class TaskModel {
  id: string
  taskId: string
  modelId: string
  task: Task
  model: LutModel
}

export class LutTaskStatus {
  id: number
  name: string
  nameEn: string
}

export class LutImageStatus {
  id: number
  name: string
  nameEn: string
}

export class LutModel {
  id: number
  serviceId: number
  parentModelId?: number | null
  name: string
  nameEn: string
  key?: string
}

export class LutCoordinateType {
  id: number
  name: string
  nameEn: string
}

export class AoiGeometryCollection {
  id: string
  taskId: string
  geometry: string | Geometry
}

export class AoiCoordinate {
  id: string
  taskId: string
  coordinateTypeId: number
  xMin?: number | null
  yMin?: number | null
  xMax?: number | null
  yMax?: number | null
  mgrsMin?: string | null
  mgrsMax?: string | null
  geometry: string | Geometry
  coordinateType?: LutCoordinateType
}

export class TaskAoiVector {
  id: string
  taskId: string
  name?: string | null
  aoiVectors?: AoiVector[]
}
export class AoiVector {
  id: string
  taskAoiVectorsId: string
  geometry: string | Geometry
}

export class ItvImage extends Image {
  hashtags: Hashtag[]
  tileUrl: string // url จาก geoint ใช้ แสดงบนแผนที่
  geometry: Polygon // boundary จาก geoint ใช้ แสดงบนแผนที่
}

export class ItvLayer {
  id: string
  name: string
  projectId: string
  layerType: ItvLayerType
  imageId: string
  url: string
  features: ItvFeatureProperties[]
  order?: number | null
  image?: ItvImage | null
}

export class ItvFeatureProperties {
  id: string
  itvLayerId: string
  photoUploadId: string | null
  photoGroupId: string | null
  photoImagingDate: string | null // วันที่ถ่ายภาพ
  photoFileName: string | null // ชื่อไฟล์
  vectorArea: number | null
  vectorLength: number | null
  drawType: ItvDrawType | null
  drawSize: number | null
  drawBorderSize: number | null
  drawBorderColor: string | null
  drawFillColor: string | null
  drawPolygonType: ItvDrawPolygonType | null
  drawDegree: number | null
  drawText: string | null
  drawTextColor: string | null
  drawTextHaloColor: string | null
  drawTextHaloSize: number | null
  isDeleted: boolean
  createdAt: string
  createdBy: string | null
  sidc: string | null
  annotationSymbol?: AnnotationSymbolItem | null
  annotationLabel?: AnnotationLabelItem | null
  geometry: Geometry
}

export class AnnotationSymbolItem {
  symbolSize: number
  context: string | null
  identity: string | null
  status: string | null
  headquarters: string | null
  echelon: string | null
  modifier1: string | null
  modifier2?: string | null
  icon: App6eMainIcon | null
  symbolSet: string | null
}

export class AnnotationLabelItem {
  staffComments?: string | null
  uniqueDesignation?: string | null
  type?: string | null
  altitudeDepth?: string | null
  engagementBar?: string | null
  direction?: string | null
  speedLeader?: string | null
  additionalInformation?: string | null
  iffSif?: string | null
  speed?: string | null
  quantity?: string | null
  reinforcedReduced?: string | null
  evaluationRating?: string | null
  combatEffectiveness?: string | null
  higherFormation?: string | null
  dtg?: string | null
  specialHeadquarters?: string | null
  platformType?: string | null
  equipmentTeardownTime?: string | null
  commonIdentifier?: string | null
  headquartersElement?: string | null
  signatureEquipment?: string | null
  hostile?: string | null
  location?: string | null
  country?: string | null
  installationComposition?: string | null
  guardedUnit?: string | null
  specialDesignator?: string | null
}

export interface App6eMainIcon {
  code: string
  entity: string
  entityType: string
  entitySubtype: string
  remarks?: string
  name: string
}

export interface App6eModifier {
  category?: string
  code?: string
  name?: string
  remarks?: string
}

export interface App6eSymbolSet {
  name: string
  symbolset: string
  mainIcon: App6eMainIcon[]
  modifier1: App6eModifier[] | undefined
  modifier2: App6eModifier[] | undefined
}

export type App6eData = Record<string, App6eSymbolSet>

export type GeometryPoint = {
  type: 'Point'
  coordinates: [number, number]
}

export type AnnotationItem = {
  id: string
  sidc: string
  annotationSymbol?: AnnotationSymbolItem | null
  annotationLabel?: AnnotationLabelItem | null
  geometry: GeometryPoint
}

export interface ModifierItem {
  code: string
  name: string
}

export interface AmplifierItem {
  code: string
  field: string
  type: string
  name: string
  desc: string
}

export type AmplifierConfig = Record<string | number, readonly string[]>
