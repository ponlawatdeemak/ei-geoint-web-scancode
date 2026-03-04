/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback } from 'react'
import type { UseFormSetValue } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useProfileStore } from '@/hook/useProfileStore'
import { buildHierarchicalLookup, HierarchicalLookupNode } from '@/utils/transformData'
import { ModelConfig, RootModelConfig, ServiceConfig } from '@interfaces/config'
import { GetResultImageDtoOut } from '@interfaces/index'
import { nanoid } from 'nanoid'
import type { FormValues, Model, ModelResult, SarFeature, Service } from './types'

interface UseTaskFormDataParams {
  projectId?: string
  taskId?: string
  isOpenFromGallery?: boolean
  isProcessed?: boolean | null
  defaultServiceId?: number | null
  propViewOnly?: boolean
  setValue: UseFormSetValue<FormValues>
}

const getLookups = async (isOpenFromGallery: boolean, defaultServiceId: number | null | undefined) => {
  const s = (await service.tasks.getSubscriptionServicesTasks()) as Service[]
  const filtered = s.filter((svc) => {
    if (isOpenFromGallery) return svc.id === defaultServiceId
    return svc.id !== 3
  })
  const ms = (await service.tasks.getSubscriptionModelsTasks()) as Model[]
  return { fetchedServices: filtered, fetchedModels: ms || [] }
}

const mapAoiCoordinate = (item: any) => {
  let sourceData: any = { coordinateTypeId: item.coordinateTypeId }
  switch (item.coordinateTypeId) {
    case 1:
      sourceData = {
        ...sourceData,
        xMin: Number(item.xMin),
        xMax: Number(item.xMax),
        yMin: Number(item.yMin),
        yMax: Number(item.yMax),
      }
      break
    case 2:
    case 3:
      sourceData = {
        ...sourceData,
        zoneId: item.zoneId,
        xMin: Number(item.xMin),
        xMax: Number(item.xMax),
        yMin: Number(item.yMin),
        yMax: Number(item.yMax),
      }
      break
    case 4:
      sourceData = {
        ...sourceData,
        mgrsMin: item.mgrsMin,
        mgrsMax: item.mgrsMax,
      }
      break
  }
  return {
    id: nanoid(),
    geomType: item.geometry.type,
    coords: item.geometry.type === 'Polygon' ? item.geometry.coordinates[0] : item.geometry.coordinates,
    source: 'extent',
    sourceData,
  }
}

const getSarFeaturesFromTask = (tsk: any): SarFeature[] => {
  return [
    ...(tsk.taskAoiVectors || []).map((item: any) => ({
      id: nanoid(),
      geomType: item.aoiVectors[0].geometry.type,
      coords:
        item.aoiVectors[0].geometry.type === 'Polygon'
          ? item.aoiVectors[0].geometry.coordinates[0]
          : item.aoiVectors[0].geometry.coordinates,
      source: 'import',
    })),
    ...(tsk.aoiCoordinates || []).map(mapAoiCoordinate),
    ...(tsk.aoiGeometryCollections || []).map((item: any) => ({
      id: nanoid(),
      geomType: item.geometry.type,
      coords: item.geometry.type === 'Polygon' ? item.geometry.coordinates[0] : item.geometry.coordinates,
      source: 'draw',
    })),
  ]
}

const processTaskData = async (tsk: any, fetchedModels: Model[], projectId?: string) => {
  const filteredModels = fetchedModels.filter((m) => m.parentModelId == null && m.serviceId === tsk.serviceId)

  const tree = buildHierarchicalLookup(fetchedModels, 'parentModelId')
  const node = tree.find((n) => n.id === tsk.rootModelId)

  const selectedIds = (tsk.models || []).map((tm: any) => tm.id)

  const images = await Promise.all(
    tsk.images.map((image: any) => service.image.resultImage(image.imageId, tsk.projectId || projectId)),
  )

  const selectedModelResults = (tsk.selectResults || []).map((result: any) => ({
    comparisonsTypeId: result.taskImage.comparisonsTypeId,
    groupModelId: Number(result.groupModelId),
    selectResultTaskId: String(result.selectResultTaskId),
    resultId: String(result.selectResultTask.resultId ?? 0),
  }))

  const sarFeatures = tsk.serviceId === 2 ? getSarFeaturesFromTask(tsk) : []

  return { filteredModels, node, selectedIds, images, selectedModelResults, sarFeatures }
}

const parseGalleryParams = (
  searchParams: any,
  fetchedModels: Model[],
  isOpenFromGallery: boolean,
  isProcessed: boolean | null | undefined,
) => {
  if (!searchParams) return {}
  const qName = searchParams.get('name')
  const qServiceId = Number(searchParams.get('serviceId'))
  const qRootModelId = Number(searchParams.get('rootModelId'))
  const qModelIds = qServiceId === ServiceConfig.sar ? [] : searchParams.get('modelIds')?.split(',').map(Number) || []
  const qImageId = searchParams.get('imageId')

  let filteredModels: Model[] = []
  let tree: HierarchicalLookupNode[] = []

  if (qServiceId) {
    filteredModels = fetchedModels.filter((m) => {
      const defaultCondition = m.parentModelId == null && m.serviceId === qServiceId
      if (isOpenFromGallery && !isProcessed && m.id === ModelConfig.changeDetection) {
        return false
      }
      return defaultCondition
    })
  }

  if (qRootModelId && qServiceId) {
    const fullTree = buildHierarchicalLookup(fetchedModels, 'parentModelId')
    const node = fullTree.find((n) => n.id === qRootModelId)
    if (node) tree = [node]
  }

  return { qName, qServiceId, qRootModelId, qModelIds, qImageId, filteredModels, tree }
}

interface CalculateSelectedModelResultsParams {
  prev: ModelResult[]
  slot: number
  image: GetResultImageDtoOut
  featureTree: HierarchicalLookupNode[]
  overrideFeatureTree?: HierarchicalLookupNode[]
  overrideModelIds?: number[]
  getLeafIds?: (node: HierarchicalLookupNode) => number[]
  currentWatchedModelIds?: number[]
}

function calculateSelectedModelResults({
  prev,
  slot,
  image,
  featureTree,
  overrideFeatureTree,
  overrideModelIds,
  getLeafIds,
  currentWatchedModelIds,
}: CalculateSelectedModelResultsParams) {
  const filtered = prev.filter((mr) => mr.comparisonsTypeId !== slot + 1)
  const treeToUse = overrideFeatureTree || featureTree
  const idsToUse = overrideModelIds || currentWatchedModelIds || []

  if (treeToUse.length === 0 || !getLeafIds) {
    return filtered
  }

  treeToUse[0].children
    .filter((node) => node.children.flatMap((n) => getLeafIds(n)).some((leafId) => idsToUse.includes(leafId)))
    .forEach((node) => {
      const latestResult = (image.modelResult || []).find((row) => row.mappingModelId === node.id)
      if (latestResult) {
        filtered.push({
          comparisonsTypeId: slot + 1,
          groupModelId: Number(latestResult.mappingModelId!),
          selectResultTaskId: String(latestResult.taskId),
          resultId: String(latestResult.resultId ?? 0),
        })
      }
    })

  return filtered
}

const fetchTaskUpdates = async (taskId: string, fetchedModels: Model[], profileId: string, projectId?: string) => {
  const tsk: any = await service.tasks.get(taskId || '')
  const processed = await processTaskData(tsk, fetchedModels, projectId)

  return {
    taskStatusId: tsk.statusId,
    name: tsk.name,
    serviceId: tsk.serviceId,
    rootModelId: tsk.rootModelId,
    isTaskOwner: tsk.createdByUser?.id === profileId,
    ...processed,
  }
}

const applyTaskUpdatesToState = (updates: any, actions: any) => {
  actions.setTaskStatusId(updates.taskStatusId)
  if (updates.name) actions.setValue('name', updates.name)
  if (updates.serviceId !== undefined) actions.setValue('serviceId', updates.serviceId)
  if (updates.rootModelId !== undefined) actions.setValue('rootModelId', updates.rootModelId)
  actions.setIsTaskOwner(updates.isTaskOwner)

  actions.setModels(updates.filteredModels)
  actions.setFeatureTree(updates.node ? [updates.node] : [])
  actions.setValue('modelIds', updates.selectedIds)
  actions.setSelectedImages(updates.images)
  actions.setSelectedModelResults(updates.selectedModelResults)
  if (updates.sarFeatures.length > 0) actions.setSarFeatures(updates.sarFeatures)
}

const applyGalleryParamsToState = async (parsed: any, actions: any) => {
  if (parsed.qName) actions.setValue('name', parsed.qName)
  if (parsed.qServiceId) actions.setValue('serviceId', parsed.qServiceId)
  if (parsed.filteredModels?.length > 0) actions.setModels(parsed.filteredModels)

  if (parsed.qRootModelId) {
    actions.setValue('rootModelId', parsed.qRootModelId)
    if (parsed.tree?.length > 0) actions.setFeatureTree(parsed.tree)
    if (parsed.qModelIds?.length > 0) actions.setValue('modelIds', parsed.qModelIds)
  }

  if (parsed.qImageId) {
    if (parsed.qRootModelId === RootModelConfig.objectDetection) {
      await actions.handleSelectObjectDetectionImage(parsed.qImageId)
    } else if (parsed.qRootModelId === RootModelConfig.changeDetection || parsed.qServiceId === 2) {
      await actions.handleSelectChangeDetectionImage(
        0,
        parsed.qImageId,
        parsed.tree,
        parsed.qModelIds,
        actions.getLeafIds,
        parsed.qModelIds,
      )
    }
  }
  actions.setActiveStep(1)
}

interface ExecuteLoadFormDataParams {
  taskId: string | undefined
  searchParams: any
  isOpenFromGallery: boolean
  isProcessed: boolean | null | undefined
  defaultServiceId: number | null | undefined
  propViewOnly: boolean | undefined
  projectId: string | undefined
  profileId: string
  router: any
  actions: any
  mountedObj: { current: boolean }
}

const executeLoadFormData = async (params: ExecuteLoadFormDataParams) => {
  const {
    taskId,
    searchParams,
    isOpenFromGallery,
    isProcessed,
    defaultServiceId,
    propViewOnly,
    projectId,
    profileId,
    router,
    actions,
    mountedObj,
  } = params

  actions.showLoading()
  try {
    const { fetchedServices, fetchedModels } = await getLookups(isOpenFromGallery, defaultServiceId)
    if (!mountedObj.current) return

    actions.setServices(fetchedServices)
    actions.setAllModels(fetchedModels)
    actions.setModels([])

    if (taskId) {
      const updates = await fetchTaskUpdates(taskId, fetchedModels, profileId, projectId)
      if (!mountedObj.current) return
      applyTaskUpdatesToState(updates, actions)
    } else if (searchParams?.get('openFrom') === 'gallery') {
      const parsed = parseGalleryParams(searchParams, fetchedModels, isOpenFromGallery, isProcessed)
      await applyGalleryParamsToState(parsed, actions)
    } else if (propViewOnly) {
      router.replace(`/project/${projectId}/task`)
      return
    }
  } catch (err: any) {
    if (mountedObj.current) actions.showAlert({ status: 'error', errorCode: err?.message })
  } finally {
    if (mountedObj.current) actions.hideLoading()
  }
}

export function useTaskFormData({
  projectId,
  taskId,
  isOpenFromGallery = false,
  isProcessed = false,
  defaultServiceId,
  propViewOnly,
  setValue,
}: UseTaskFormDataParams) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)!

  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [allModels, setAllModels] = useState<Model[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [featureTree, setFeatureTree] = useState<HierarchicalLookupNode[]>([])
  const [activeStep, setActiveStep] = useState<number>(0)
  const [showSelectedModelsDialog, setShowSelectedModelsDialog] = useState(false)
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | undefined>(undefined)
  const [showImagesSelectorDialog, setShowImagesSelectorDialog] = useState(false)
  const [imagesSelectorSlot, setImagesSelectorSlot] = useState<number | undefined>(undefined)
  const [selectedImages, setSelectedImages] = useState<(GetResultImageDtoOut | null)[]>([])
  const [selectedModelResults, setSelectedModelResults] = useState<ModelResult[]>([])
  const [sarFeatures, setSarFeatures] = useState<SarFeature[]>([])
  const [imageLoading, setImageLoading] = useState(false)
  const [taskStatusId, setTaskStatusId] = useState<number>(1)
  const [isTaskOwner, setIsTaskOwner] = useState(false)

  const handleSelectObjectDetectionImage = useCallback(
    async (id: string) => {
      setImageLoading(true)
      try {
        showLoading()
        const image = await service.image.resultImage(id, projectId || '')
        setSelectedImages([image])
      } catch (err: any) {
        showAlert({ status: 'error', errorCode: err?.message })
      } finally {
        setImageLoading(false)
        hideLoading()
      }
    },
    [projectId, showLoading, hideLoading, showAlert],
  )

  const handleSelectChangeDetectionImage = useCallback(
    async (
      slot: number,
      id: string,
      overrideFeatureTree?: HierarchicalLookupNode[],
      overrideModelIds?: number[],
      getLeafIds?: (node: HierarchicalLookupNode) => number[],
      currentWatchedModelIds?: number[],
    ) => {
      setImageLoading(true)
      try {
        showLoading()
        const image = await service.image.resultImage(id, projectId || '')
        image.modelResult = image.modelResult?.sort(
          (a, b) => new Date(b.processAt || 0).getTime() - new Date(a.processAt || 0).getTime(),
        )

        setSelectedImages((prev) => {
          const newSelectedImages = [...prev]
          newSelectedImages[slot] = image
          return newSelectedImages
        })

        setSelectedModelResults((prev) =>
          calculateSelectedModelResults({
            prev,
            slot,
            image,
            featureTree,
            overrideFeatureTree,
            overrideModelIds,
            getLeafIds,
            currentWatchedModelIds,
          }),
        )
      } catch (err: any) {
        showAlert({ status: 'error', errorCode: err?.message })
      } finally {
        setImageLoading(false)
        hideLoading()
      }
    },
    [projectId, showLoading, hideLoading, showAlert, featureTree],
  )

  // Initial data load
  // biome-ignore lint/correctness/useExhaustiveDependencies: handleSelectObjectDetectionImage and handleSelectChangeDetectionImage are intentionally excluded to prevent the effect from re-running when featureTree changes (which would wipe models state via setModels([]))
  useEffect(() => {
    const mountedObj = { current: true }

    const actions = {
      setValue,
      setTaskStatusId,
      setIsTaskOwner,
      setServices,
      setAllModels,
      setModels,
      setFeatureTree,
      setSelectedImages,
      setSelectedModelResults,
      setSarFeatures,
      setActiveStep,
      handleSelectObjectDetectionImage,
      handleSelectChangeDetectionImage,
      showLoading,
      hideLoading,
      showAlert,
    }

    void executeLoadFormData({
      taskId,
      searchParams,
      isOpenFromGallery,
      isProcessed,
      defaultServiceId,
      propViewOnly,
      projectId,
      profileId: profile.id,
      router,
      actions,
      mountedObj,
    })

    return () => {
      mountedObj.current = false
    }
  }, [
    hideLoading,
    showLoading,
    setValue,
    taskId,
    showAlert,
    projectId,
    router.replace,
    searchParams,
    isOpenFromGallery,
    isProcessed,
    defaultServiceId,
    profile.id,
    propViewOnly,
    router,
  ])

  return {
    loading,
    setLoading,
    services,
    allModels,
    models,
    setModels,
    featureTree,
    setFeatureTree,
    activeStep,
    setActiveStep,
    selectedImages,
    setSelectedImages,
    selectedModelResults,
    setSelectedModelResults,
    sarFeatures,
    setSarFeatures,
    imageLoading,
    setImageLoading,
    taskStatusId,
    isTaskOwner,
    showSelectedModelsDialog,
    setShowSelectedModelsDialog,
    showImagesSelectorDialog,
    setShowImagesSelectorDialog,
    imagesSelectorSlot,
    setImagesSelectorSlot,
    selectedGalleryImage,
    setSelectedGalleryImage,
    handleSelectObjectDetectionImage,
    handleSelectChangeDetectionImage,
  }
}
