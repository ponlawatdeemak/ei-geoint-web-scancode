/* eslint-disable @typescript-eslint/no-explicit-any */

import type { UseFormGetValues, UseFormTrigger } from 'react-hook-form'
import type { GetResultImageDtoOut } from '@interfaces/index'
import type { ComparisionType } from '@interfaces/config'
import type { HierarchicalLookupNode } from '@/utils/transformData'

export type Props = {
  projectId?: string
  taskId?: string
  isOpenFromGallery?: boolean
  isProcessed?: boolean | null
  defaultServiceId?: number | null
  setForm?: (form: { trigger: UseFormTrigger<any>; getValues: UseFormGetValues<any> }) => void
  setIsValid?: (isValid: boolean) => void
  orgId?: string
  viewOnly?: boolean
}

export type FormValues = {
  name: string
  serviceId?: number
  rootModelId?: number
  modelIds: number[]
}

export type Service = { id: number; name?: string; nameEn?: string }

export type Model = {
  id: number
  name: string
  nameEn: string
  parentModelId?: number | null
  serviceId?: number
  key?: string
}

export type SarFeature = {
  id: string
  geomType: 'Point' | 'LineString' | 'Polygon'
  coords: any
  label: string
  metric?: number
  source?: string
  sourceData?: any
}

export interface ModelResult {
  comparisonsTypeId: ComparisionType
  groupModelId: number
  selectResultTaskId: string
  resultId: string
}

/** Return type of useTaskFormData hook */
export interface TaskFormDataState {
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  services: Service[]
  allModels: Model[]
  models: Model[]
  setModels: React.Dispatch<React.SetStateAction<Model[]>>
  featureTree: HierarchicalLookupNode[]
  setFeatureTree: React.Dispatch<React.SetStateAction<HierarchicalLookupNode[]>>
  activeStep: number
  setActiveStep: React.Dispatch<React.SetStateAction<number>>
  selectedImages: (GetResultImageDtoOut | null)[]
  setSelectedImages: React.Dispatch<React.SetStateAction<(GetResultImageDtoOut | null)[]>>
  selectedModelResults: ModelResult[]
  setSelectedModelResults: React.Dispatch<React.SetStateAction<ModelResult[]>>
  sarFeatures: SarFeature[]
  setSarFeatures: React.Dispatch<React.SetStateAction<SarFeature[]>>
  imageLoading: boolean
  setImageLoading: React.Dispatch<React.SetStateAction<boolean>>
  taskStatusId: number
  isTaskOwner: boolean
  showSelectedModelsDialog: boolean
  setShowSelectedModelsDialog: React.Dispatch<React.SetStateAction<boolean>>
  showImagesSelectorDialog: boolean
  setShowImagesSelectorDialog: React.Dispatch<React.SetStateAction<boolean>>
  imagesSelectorSlot: number | undefined
  setImagesSelectorSlot: React.Dispatch<React.SetStateAction<number | undefined>>
  selectedGalleryImage: string | undefined
  setSelectedGalleryImage: React.Dispatch<React.SetStateAction<string | undefined>>
}
