'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useForm, Controller, set } from 'react-hook-form'
import type { Resolver, UseFormGetValues, UseFormTrigger } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import {
  TextField,
  Button,
  Checkbox,
  Divider,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  Menu,
  MenuItem,
  useMediaQuery,
  Tooltip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Autocomplete from '@mui/material/Autocomplete'
import FormWrapper from '@/components/layout/FormWrapper'
import service from '@/api'
import Image from 'next/image'
import { GetResultImageDtoOut, PostTasksDtoIn, PutTasksDtoIn } from '@interfaces/index'
import {
  ComparisionType,
  Language,
  MappingChangeToObject,
  ModelConfig,
  Roles,
  RootModelConfig,
  ServiceConfig,
  SortType,
  TaskMode,
} from '@interfaces/config'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useProfileStore } from '@/hook/useProfileStore'
import { buildHierarchicalLookup, HierarchicalLookupNode } from '@/utils/transformData'
import InputLabel from '@/components/common/input/InputLabel'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import InfoIcon from '@mui/icons-material/Info'
import DeleteIcon from '@mui/icons-material/Delete'
import ImageIcon from '@mui/icons-material/Image'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useSettings } from '@/hook/useSettings'
import { formatDateTime } from '@/utils/formatDate'
import ImagesSelector from '../common/images'
import { ImagesMode } from '../common/images/images'
import { ProcessCompleteIcon } from '../common/images/svg'
import SarAnalysisAreaForm from '@/components/form/SarAnalysisAreaForm'
import { nanoid } from 'nanoid'
import useResponsive from '@/hook/responsive'

type Props = {
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

type FormValues = {
  name: string
  serviceId?: number
  rootModelId?: number
  modelIds: number[]
}

// Lightweight local types to avoid excessive `any` usage
type Service = { id: number; name?: string; nameEn?: string }
type Model = {
  id: number
  name: string
  nameEn: string
  parentModelId?: number | null
  serviceId?: number
}

// Small presentational component for image preview used in both forms
const ImagePreview: React.FC<{
  image: GetResultImageDtoOut | null
  onRemove: () => void
  language: string
  titleLabel?: React.ReactNode
  captureDateLabel?: React.ReactNode
  hashtagLabel?: React.ReactNode
  formatDateFn?: (date: string | Date, lang?: string) => string
  loading?: boolean
  viewOnly?: boolean
}> = ({ image, onRemove, language, titleLabel, captureDateLabel, hashtagLabel, formatDateFn, loading, viewOnly }) => {
  const { is2K } = useResponsive()
  if (!image) return null
  return (
    <div className='relative flex flex-col items-start rounded-lg bg-(--color-background-default) sm:flex-row'>
      <div className='relative h-24 w-full shrink-0 overflow-hidden rounded sm:m-4 sm:w-24'>
        {image.imageUrl ? (
          <Image className='object-cover' src={image.imageUrl} alt={image.image.name} fill />
        ) : (
          <div className='flex h-full w-full items-center justify-center sm:h-auto'>
            <ProcessCompleteIcon width={is2K ? 105 : 70} height={is2K ? 105 : 70} />
          </div>
        )}
      </div>
      <div className='flex w-full min-w-0 flex-1 flex-col gap-4 p-4 text-sm sm:px-0'>
        <div className='flex gap-1'>
          <label className='shrink-0 text-(--color-text-secondary)'>{titleLabel}:</label>
          <Tooltip title={image.image.name} arrow>
            <label className='truncate'>{image.image.name}</label>
          </Tooltip>
        </div>
        <div className='flex gap-1'>
          <label className='shrink-0 text-(--color-text-secondary)'>{captureDateLabel}:</label>
          <label className='truncate'>
            {image.image.imagingDate && formatDateFn ? formatDateFn(image.image.imagingDate, language) : ''}
          </label>
        </div>
        <div className='flex gap-1'>
          <label className='shrink-0 text-(--color-text-secondary)'>{hashtagLabel}:</label>
          <div className='-mt-[3px] flex flex-wrap gap-2'>
            {image.image.imageHashtags?.map(({ id, hashtag }) => (
              <Chip key={id} label={hashtag.name} size='small' color='primary' />
            ))}
          </div>
        </div>
      </div>
      {!viewOnly && (
        <div className='absolute top-0 right-0 flex-shrink-0 p-2 sm:relative'>
          <IconButton color='error' onClick={onRemove} size='small' disabled={loading}>
            <DeleteIcon />
          </IconButton>
        </div>
      )}
    </div>
  )
}
interface ModelResult {
  comparisonsTypeId: ComparisionType
  groupModelId: number
  selectResultTaskId: string
  resultId: string
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
const EditTaskForm: React.FC<Props> = ({
  projectId,
  taskId,
  isOpenFromGallery = false,
  isProcessed = false,
  defaultServiceId,
  setForm,
  setIsValid,
  orgId,
  viewOnly: propViewOnly,
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation('common')
  const { language } = useSettings()
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
  // SAR analysis area features (controlled for SarAnalysisAreaForm)
  type SarFeature = {
    id: string
    geomType: 'Point' | 'LineString' | 'Polygon'
    coords: any
    label: string
    metric?: number
    source?: string
    sourceData?: any
  }
  const [sarFeatures, setSarFeatures] = useState<SarFeature[]>([])
  const [imageLoading, setImageLoading] = useState(false)
  const [taskStatusId, setTaskStatusId] = useState<number>(1)

  const [isTaskOwner, setIsTaskOwner] = useState(false)
  const viewOnly = useMemo(() => {
    if (propViewOnly !== undefined) return propViewOnly
    // Admin roles always have edit access
    if ([Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId)) return false
    // User role
    if (profile.roleId === Roles.user) {
      // Create mode -> can edit
      if (!taskId || taskId === 'create') return false
      // Edit mode -> check ownership (defaults to false/viewOnly until fetched)
      return !isTaskOwner
    }
    return true
  }, [profile.roleId, propViewOnly, isTaskOwner, taskId])

  const theme = useTheme()
  const isFullScreen = useMediaQuery(theme.breakpoints.down('md'))

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    ...(taskStatusId === 1
      ? {
          serviceId: Yup.number().required(),
          rootModelId: Yup.number().required(),
          // modelIds is required only when serviceId === 1 (service 1 requires selecting feature models)
          modelIds: Yup.array().when('serviceId', (serviceId: unknown, schema: any) =>
            Number(serviceId as any) === 1 ? schema.min(1).required() : schema.notRequired(),
          ),
        }
      : {}),
  })

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted },
    trigger,
    getValues,
  } = useForm<FormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      name: '',
      serviceId: defaultServiceId || undefined,
      rootModelId: undefined,
      modelIds: [],
    },
  })

  useEffect(() => {
    if (isOpenFromGallery && setForm) {
      setForm({ trigger, getValues })
    }
  }, [trigger, getValues, setForm, isOpenFromGallery])

  const watchedName = watch('name')
  const watchedServiceId = watch('serviceId')
  const watchedRootModelId = watch('rootModelId')
  const watchedModelIds = watch('modelIds')

  useEffect(() => {
    let mounted = true

    const fetchLookups = async () => {
      // load services and models
      const s = (await service.tasks.getSubscriptionServicesTasks()) as Service[]
      const filtered = s.filter((svc) => {
        if (isOpenFromGallery) {
          return svc.id === defaultServiceId
        }
        return svc.id !== 3
      })
      if (!mounted) return { allModels: [] as Model[] }
      setServices(filtered || [])
      const ms = (await service.tasks.getSubscriptionModelsTasks()) as Model[]
      if (!mounted) return { allModels: [] as Model[] }
      setAllModels(ms || [])
      // Do not pre-populate root models until a service is selected
      setModels([])
      return { allModels: ms || [] }
    }

    const populateTask = async (id: string, allModels: Model[]) => {
      if (!mounted) return

      const tsk: any = await service.tasks.get(id)
      setTaskStatusId(tsk.statusId)
      if (tsk.name) setValue('name', tsk.name)
      if (tsk.serviceId !== undefined) setValue('serviceId', tsk.serviceId)
      if (tsk.rootModelId !== undefined) setValue('rootModelId', tsk.rootModelId)
      // Check ownership
      if (tsk.createdByUser?.id === profile.id) {
        setIsTaskOwner(true)
      } else {
        setIsTaskOwner(false)
      }

      const models = id ? allModels.filter((m) => m.parentModelId == null && m.serviceId === tsk.serviceId) : []
      setModels(models)

      const tree = buildHierarchicalLookup(allModels, 'parentModelId')
      const node = tree.find((n) => n.id === tsk.rootModelId)
      if (node) setFeatureTree([node])
      else setFeatureTree([])

      const selectedIds = (tsk.models || []).map((tm: any) => tm.id)
      setValue('modelIds', selectedIds)

      const images = await Promise.all(
        tsk.images.map((image: any) => service.image.resultImage(image.imageId, tsk.projectId)),
      )
      setSelectedImages(images)
      setSelectedModelResults(
        (tsk.selectResults || []).map((result: any) => ({
          comparisonsTypeId: result.taskImage.comparisonsTypeId,
          groupModelId: result.groupModelId,
          selectResultTaskId: result.selectResultTaskId,
          resultId: result.selectResultTask.resultId,
        })),
      )
      if (tsk.serviceId === 2) {
        const getId = () => nanoid()
        const features: SarFeature[] = [
          ...(tsk.taskAoiVectors || []).map((item: any) => ({
            id: getId(),
            geomType: item.aoiVectors[0].geometry.type,
            coords:
              item.aoiVectors[0].geometry.type === 'Polygon'
                ? item.aoiVectors[0].geometry.coordinates[0]
                : item.aoiVectors[0].geometry.coordinates,
            source: 'import',
          })),
          ...(tsk.aoiCoordinates || []).map((item: any) => {
            let sourceData: any = {
              coordinateTypeId: item.coordinateTypeId,
            }
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
              id: getId(),
              geomType: item.geometry.type,
              coords: item.geometry.type === 'Polygon' ? item.geometry.coordinates[0] : item.geometry.coordinates,
              source: 'extent',
              sourceData,
            }
          }),
          ...(tsk.aoiGeometryCollections || []).map((item: any) => ({
            id: getId(),
            geomType: item.geometry.type,
            coords: item.geometry.type === 'Polygon' ? item.geometry.coordinates[0] : item.geometry.coordinates,
            source: 'draw',
          })),
        ]
        setSarFeatures(features)
      }
    }

    const handleGalleryParams = async (allModels: Model[]) => {
      const qName = searchParams.get('name')
      const qServiceId = Number(searchParams.get('serviceId'))
      const qRootModelId = Number(searchParams.get('rootModelId'))
      const qModelIds =
        qServiceId === ServiceConfig.sar ? [] : searchParams.get('modelIds')?.split(',').map(Number) || []
      const qImageId = searchParams.get('imageId')

      if (qName) setValue('name', qName)
      if (qServiceId) {
        setValue('serviceId', qServiceId)
        const models = allModels.filter((m) => {
          const defaultCondition = m.parentModelId == null && m.serviceId === qServiceId
          if (isOpenFromGallery && !isProcessed) {
            return defaultCondition && m.id !== ModelConfig.changeDetection
          }
          return defaultCondition
        })
        setModels(models)

        let tree: HierarchicalLookupNode[] = []
        if (qRootModelId) {
          setValue('rootModelId', qRootModelId)
          const fullTree = buildHierarchicalLookup(allModels, 'parentModelId')
          const node = fullTree.find((n) => n.id === qRootModelId)
          if (node) {
            tree = [node]
            setFeatureTree(tree)
          } else {
            setFeatureTree([])
          }

          if (qModelIds.length > 0) {
            setValue('modelIds', qModelIds)
          }
        }

        if (qImageId) {
          if (qRootModelId === RootModelConfig.objectDetection) {
            await handleSelectObjectDetectionImage(qImageId)
          } else if (qRootModelId === RootModelConfig.changeDetection || qServiceId === 2) {
            await handleSelectChangeDetectionImage(0, qImageId, tree, qModelIds)
          }
        }
      }
      setActiveStep(1)
    }

    const load = async () => {
      showLoading()
      try {
        const { allModels } = await fetchLookups()
        if (taskId) {
          await populateTask(taskId, allModels)
        } else if (searchParams.get('openFrom') === 'gallery') {
          handleGalleryParams(allModels)
        } else if (viewOnly) {
          router.replace(`/project/${projectId}/task`)
          return
        }
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        if (mounted) {
          hideLoading()
        }
      }
    }

    void load()
    return () => {
      mounted = false
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
  ])

  // helpers for hierarchical checkbox behavior (copied/adapted from EditSubscriptionForm)
  // Tree helpers (memoized to keep stable references)
  const getLeafIds = useCallback((node: HierarchicalLookupNode): number[] => {
    if (!node.children || node.children.length === 0) return [node.id]
    return node.children.flatMap((child) => getLeafIds(child))
  }, [])

  const isNodeChecked = useCallback(
    (node: HierarchicalLookupNode) => {
      const leafIds = getLeafIds(node)
      if (leafIds.length === 0) return false
      return leafIds.every((id) => watchedModelIds.includes(id))
    },
    [getLeafIds, watchedModelIds],
  )

  const isNodeIndeterminate = useCallback(
    (node: HierarchicalLookupNode) => {
      const leafIds = getLeafIds(node)
      if (leafIds.length === 0) return false
      const some = leafIds.some((id) => watchedModelIds.includes(id))
      return some && !isNodeChecked(node)
    },
    [getLeafIds, watchedModelIds, isNodeChecked],
  )

  const toggleNode = useCallback(
    (node: HierarchicalLookupNode, checked: boolean) => {
      const leafIds = getLeafIds(node)
      const set = new Set(watchedModelIds)
      if (checked) {
        for (const id of leafIds) set.add(id)
      } else {
        for (const id of leafIds) set.delete(id)
      }
      const arr = Array.from(set)
      setValue('modelIds', arr)
    },
    [getLeafIds, setValue, watchedModelIds],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: false
  useEffect(() => {
    setSelectedImages([])
    setSelectedModelResults([])
  }, [watchedModelIds])

  const handleChangeRootModel = useCallback(
    (id?: number) => {
      setValue('rootModelId', id)
      if (id) {
        const tree = buildHierarchicalLookup(allModels, 'parentModelId')
        const node = tree.find((n) => n.id === id)
        if (node) setFeatureTree([node])
        else setFeatureTree([])
      } else {
        setFeatureTree([])
      }
      setValue('modelIds', [])
    },
    [setValue, allModels],
  )

  const handleChangeService = useCallback(
    (id?: number) => {
      setValue('serviceId', id)
      const models = id
        ? allModels.filter((m) => {
            const defaultCondition = m.parentModelId == null && m.serviceId === id
            if (isOpenFromGallery && !isProcessed) {
              // ถ้าเปิดจาก gallery แล้วเลือกภาพที่ไม่เคยทำ Object Detection จะไม่สามารถเลือก Model Config ที่เป็น Change Detection ได้
              return defaultCondition && m.id !== ModelConfig.changeDetection
            }
            return defaultCondition
          })
        : []
      setModels(models)
      handleChangeRootModel()
    },
    [setValue, handleChangeRootModel, allModels, isOpenFromGallery, isProcessed],
  )

  useEffect(() => {
    if (isOpenFromGallery && defaultServiceId) {
      handleChangeService(defaultServiceId)
    }
  }, [defaultServiceId, handleChangeService, isOpenFromGallery])

  // Recursive renderer for hierarchical nodes so all descendants are shown
  const renderNode = useCallback(
    (node: HierarchicalLookupNode, disabled?: boolean) => {
      const hasChildren = !!node.children && node.children.length > 0
      const isRoot = !(node as unknown as { parentModelId?: number | null }).parentModelId && hasChildren
      return (
        <div key={node.id} className={`flex flex-col ${isRoot ? 'md:col-span-2' : ''}`}>
          <div className='flex items-center'>
            <Checkbox
              checked={isNodeChecked(node)}
              indeterminate={isNodeIndeterminate(node)}
              onChange={(e) => toggleNode(node, e.target.checked)}
              disabled={loading || disabled}
            />
            <span className={isRoot ? 'font-medium' : undefined}>{language === Language.TH ? node.name : node.nameEn}</span>
          </div>
          {hasChildren ? (
            <div className={`ml-8 ${isRoot ? 'grid md:grid-cols-2' : ''}`}>
              {(node.children || []).map((child) => renderNode(child, disabled))}
            </div>
          ) : null}
        </div>
      )
    },
    [isNodeChecked, isNodeIndeterminate, toggleNode, loading, language],
  )

  const saveName = () => async (data: FormValues) => {
    setLoading(true)
    if (taskId) {
      try {
        await service.tasks.update(taskId, {
          mode: TaskMode.editNameOnly,
          name: data.name,
        } as PutTasksDtoIn)
        showAlert({ status: 'success', title: t('alert.saveSuccess') })
        router.replace(`/project/${projectId}/task`)
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const save = (mode: TaskMode) => async (data: FormValues) => {
    setLoading(true)
    try {
      const includedPayload: Partial<PostTasksDtoIn | PutTasksDtoIn> = {}
      if (watchedServiceId === 2) {
        // SAR
        includedPayload.images = selectedImages
          .filter((item) => item !== null)
          .map(({ image }, idx) => ({
            imageId: image.id,
            itemId: image.itemId ?? '',
            comparisonsTypeId: idx === 0 ? 1 : 2,
          }))
        const importedFeatures = []
        const extentFeatures = []
        const drawingFeatures = []
        for (const feature of sarFeatures) {
          const jsonFeature = JSON.stringify({
            type: feature.geomType,
            coordinates: feature.geomType === 'Polygon' ? [feature.coords] : feature.coords,
          })
          switch (feature.source) {
            case 'import':
              importedFeatures.push({
                geometry: jsonFeature,
              })
              break
            case 'extent':
              extentFeatures.push({
                geometry: jsonFeature,
                ...feature.sourceData,
              })
              break
            case 'draw':
              drawingFeatures.push({
                geometry: jsonFeature,
              })
              break
          }
        }
        includedPayload.aoiVectors = importedFeatures as any[]
        includedPayload.aoiCoordinates = extentFeatures
        includedPayload.aoiGeometryCollections = drawingFeatures
      } else {
        switch (watchedRootModelId) {
          case 1: // Object Detection
            includedPayload.images = selectedImages
              .filter((item) => item !== null)
              .map(({ image }) => ({
                imageId: image.id,
                itemId: image.itemId ?? '',
              }))
            break
          case 4: // Change Detection
            includedPayload.images = selectedImages
              .filter((item) => item !== null)
              .map(({ image }, idx) => ({
                imageId: image.id,
                itemId: image.itemId ?? '',
                comparisonsTypeId: idx === 0 ? 1 : 2,
              }))
            includedPayload.selectResults = selectedModelResults
            break
        }
      }
      const payload: Partial<PostTasksDtoIn | PutTasksDtoIn> = {
        projectId,
        mode,
        name: data.name,
        serviceId: Number(data.serviceId),
        rootModelId: Number(data.rootModelId),
        modelIds: data.modelIds.map(Number),
        ...includedPayload,
      }

      let resultId: string | undefined
      if (taskId) {
        await service.tasks.update(String(taskId), payload as PutTasksDtoIn)
        resultId = String(taskId)
      } else {
        resultId = (await service.tasks.create(payload as PostTasksDtoIn)).id
      }

      showAlert({ status: 'success', title: t('alert.saveSuccess') })

      if (mode === TaskMode.saveAndProcess) {
        router.replace(`/project/${projectId}/task`)
      } else if (resultId) {
        router.replace(`/project/${projectId}/task/${resultId}`)
      }
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (viewOnly) {
      router.replace(`/project/${projectId}/task`)
    } else {
      showAlert({
        status: 'confirm-cancel',
        showCancel: true,
        onConfirm: () => router.replace(`/project/${projectId}/task`),
      })
    }
  }

  const enableNextButton = useMemo(() => {
    switch (watchedServiceId) {
      case 1:
        return watchedName && watchedRootModelId && watchedModelIds.length > 0
      case 2:
        return (
          watchedName &&
          watchedRootModelId &&
          (activeStep === 0 || selectedImages.filter((item) => item !== null).length === 2)
        )
      default:
        return false
    }
  }, [watchedServiceId, watchedRootModelId, watchedModelIds, watchedName, activeStep, selectedImages])

  useEffect(() => {
    if (isOpenFromGallery) {
      setIsValid?.(!!enableNextButton)
    }
  }, [enableNextButton, setIsValid, isOpenFromGallery])

  const enableSaveDraftButton = useMemo(() => {
    switch (watchedServiceId) {
      case 1:
        return watchedName && watchedRootModelId && watchedModelIds.length > 0
      case 2:
        return watchedName && watchedRootModelId
      default:
        return false
    }
  }, [watchedServiceId, watchedRootModelId, watchedModelIds, watchedName])

  const enableSaveAndProcessButton = useMemo(() => {
    switch (watchedServiceId) {
      case 1:
        if (watchedRootModelId === 1) {
          return selectedImages.filter((item) => item !== null).length === 1
        } else if (watchedRootModelId === 4) {
          return (
            selectedImages.filter((item) => item !== null).length === 2 &&
            selectedModelResults.length ===
              featureTree[0].children.filter((node) =>
                node.children.flatMap((n) => getLeafIds(n)).some((id) => watchedModelIds.includes(id)),
              ).length *
                2
          )
        }
        return false
      case 2:
        return selectedImages.filter((item) => item !== null).length === 2 && sarFeatures.length > 0
      default:
        return false
    }
  }, [
    watchedRootModelId,
    selectedImages,
    watchedServiceId,
    featureTree,
    getLeafIds,
    watchedModelIds,
    selectedModelResults,
    sarFeatures.length,
  ])

  // human-readable labels for the summary step
  const selectedServiceLabel = useMemo(() => {
    const svc = services.find((s) => String(s.id) === String(watchedServiceId))
    return svc ? (language === Language.TH ? svc.name : svc.nameEn) || String(svc.id) : '-'
  }, [services, watchedServiceId, language])

  const selectedRootModelLabel = useMemo(() => {
    const m =
      allModels.find((mm) => String(mm.id) === String(watchedRootModelId)) ||
      models.find((mm) => String(mm.id) === String(watchedRootModelId))
    return m ? (language === Language.TH ? m.name : m.nameEn) || String(m.id) : '-'
  }, [allModels, models, watchedRootModelId, language])

  const handleSelectObjectDetectionImage = async (id: string) => {
    setImageLoading(true)
    try {
      showLoading()
      const image = await service.image.resultImage(id, projectId || '')
      setSelectedImages([image])
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setImageLoading(false)
      hideLoading()
    }
  }

  const handleSelectChangeDetectionImage = async (
    slot: number,
    id: string,
    overrideFeatureTree?: HierarchicalLookupNode[],
    overrideModelIds?: number[],
  ) => {
    setImageLoading(true)
    try {
      showLoading()
      const image = await service.image.resultImage(id, projectId || '')
      image.modelResult = image.modelResult?.sort(
        (a, b) => new Date(b.processAt || 0).getTime() - new Date(a.processAt || 0).getTime(),
      )
      const newSelectedImages = [...selectedImages]
      newSelectedImages[slot] = image
      setSelectedImages(newSelectedImages)
      const newSelectedModelResults = selectedModelResults.filter((mr) => mr.comparisonsTypeId !== slot + 1)
      const treeToUse = overrideFeatureTree || featureTree
      const idsToUse = overrideModelIds || watchedModelIds
      if (treeToUse.length > 0) {
        treeToUse[0].children
          .filter((node) => node.children.flatMap((n) => getLeafIds(n)).some((id) => idsToUse.includes(id)))
          .forEach((node) => {
            const latestResult = (image.modelResult || []).filter((row) => row.mappingModelId === node.id)[0]
            if (latestResult) {
              newSelectedModelResults.push({
                comparisonsTypeId: slot + 1,
                groupModelId: latestResult.mappingModelId!,
                selectResultTaskId: latestResult.taskId,
                resultId: latestResult.resultId!,
              })
            }
          })
      }

      setSelectedModelResults(newSelectedModelResults)
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setImageLoading(false)
      hideLoading()
    }
  }

  const renderObjectDetectionForm = () => {
    const handleRemoveImage = () => {
      setSelectedImages([])
    }

    return (
      <div className='md:col-span-2'>
        <InputLabel className='font-medium' required>
          {t('form.taskForm.selectImage')}
        </InputLabel>
        {selectedImages[0] ? (
          <ImagePreview
            image={selectedImages[0]}
            onRemove={handleRemoveImage}
            language={language}
            titleLabel={t('form.taskForm.imageName')}
            captureDateLabel={t('form.taskForm.captureDate')}
            hashtagLabel={t('form.taskForm.hashtag')}
            formatDateFn={formatDateTime}
            loading={loading}
            viewOnly={viewOnly}
          />
        ) : (
          <div className='flex items-center justify-center rounded-lg border border-primary border-dashed p-6'>
            <Button
              variant='contained'
              color='primary'
              disabled={imageLoading || viewOnly}
              onClick={() => {
                setImagesSelectorSlot(undefined)
                setSelectedGalleryImage(undefined)
                setShowImagesSelectorDialog(true)
              }}
              startIcon={<ImageIcon />}
            >
              {t('form.taskForm.selectFromGallery')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderChangeDetectionForm = () => {
    const handleRemoveImage = (slot: number) => {
      const newSelectedImages = [...selectedImages]
      newSelectedImages[slot] = null
      setSelectedImages(newSelectedImages)
      const newSelectedModelResults = selectedModelResults.filter((mr) => mr.comparisonsTypeId !== slot + 1)
      setSelectedModelResults(newSelectedModelResults)
    }

    const handleSelectModelResult = (modelResult: ModelResult) => {
      const newSelectedModelResults = selectedModelResults.filter(
        (mr) => mr.comparisonsTypeId !== modelResult.comparisonsTypeId || mr.groupModelId !== modelResult.groupModelId,
      )
      newSelectedModelResults.push(modelResult)
      setSelectedModelResults(newSelectedModelResults)
    }

    const renderSlot = (slot: number, label: string) => {
      const image = selectedImages[slot]
      return (
        <div>
          <InputLabel className='font-medium' required>
            {t(`form.taskForm.${label}`)}
          </InputLabel>
          {image ? (
            <div className='flex flex-col gap-4'>
              <ImagePreview
                image={image}
                onRemove={() => handleRemoveImage(slot)}
                language={language}
                titleLabel={t('form.taskForm.imageName')}
                captureDateLabel={t('form.taskForm.captureDate')}
                hashtagLabel={t('form.taskForm.hashtag')}
                formatDateFn={formatDateTime}
                loading={loading}
                viewOnly={viewOnly}
              />
              {featureTree[0]?.children
                ?.filter((node) =>
                  node.children.flatMap((n) => getLeafIds(n)).some((id) => watchedModelIds.includes(id)),
                )
                .map((node) => {
                  return (
                    <div key={node.id}>
                      <Divider className='mb-4! hidden lg:block' />
                      <InputLabel className='font-medium' required>
                        {t('form.taskForm.selectDetectionModel', {
                          name: language === Language.TH ? node.name : node.nameEn,
                        })}
                      </InputLabel>
                      <div className='overflow-hidden rounded-lg border border-(--color-divider)'>
                        <div className='overflow-x-auto'>
                          <ModelResultsTable
                            slot={slot}
                            modelId={node.id}
                            image={image}
                            selectedModelResults={selectedModelResults}
                            onSelectModelResult={handleSelectModelResult}
                            loading={loading}
                            viewOnly={viewOnly}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className='flex items-center justify-center rounded-lg border border-primary border-dashed p-6'>
              <Button
                variant='contained'
                color='primary'
                disabled={imageLoading || viewOnly}
                onClick={() => {
                  setImagesSelectorSlot(slot)
                  setSelectedGalleryImage(undefined)
                  setShowImagesSelectorDialog(true)
                }}
                startIcon={<ImageIcon />}
              >
                {t('form.taskForm.selectFromGallery')}
              </Button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className='flex flex-col items-center'>
        <div className='flex w-full max-w-[calc(100vw-80px)] flex-col gap-4 lg:w-7xl lg:max-w-[calc(100vw-112px)] lg:flex-row'>
          <div className='flex-1 overflow-hidden'>{renderSlot(0, 'selectBaseImage')}</div>
          <div className='border-(--color-divider) border-t lg:border-t-0 lg:border-r' />
          <div className='flex-1 overflow-hidden'>{renderSlot(1, 'selectComparisonImage')}</div>
        </div>
      </div>
    )
  }

  const renderSarImageSelectionForm = () => renderChangeDetectionForm()

  const renderSarAreaSelectionForm = () => {
    return (
      <SarAnalysisAreaForm
        imageBefore={selectedImages[0]!}
        imageAfter={selectedImages[1]!}
        viewOnly={viewOnly}
        loading={loading}
        features={sarFeatures}
        onFeaturesChange={(next) => setSarFeatures(next as SarFeature[])}
      />
    )
  }

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)

  const modelKeys = useMemo(() => {
    // Map the currently selected model ids (watchedModelIds) to the
    // corresponding `key` property on each model in `allModels`.
    // Return unique string keys and ignore any missing entries.
    const selectedIds = (watchedModelIds || []).map(Number)
    const keys = selectedIds
      .map((id) => allModels.find((m) => Number(m.id) === id))
      .filter((m): m is Model & { key?: unknown } => !!m && !!(m as any).key)
      .map((m) => String((m as any).key))
    return Array.from(new Set(keys))
  }, [allModels, watchedModelIds])

  const modelObjectDetectionKeys = useMemo(() => {
    // 1. watchedModelIds เอาไปหา MappingChangeToObject เพื่อให้ได้ ID ของ Object Detection model
    const objectDetectionIds = new Set<number>()

    for (const changeModelId of watchedModelIds) {
      // หา Object Detection model ID ที่ map กับ Change Detection model
      for (const [objectDetectionId, changeDetectionIds] of Object.entries(MappingChangeToObject)) {
        if ((changeDetectionIds as number[]).includes(Number(changeModelId))) {
          objectDetectionIds.add(Number(objectDetectionId))
        }
      }
    }

    // 2. จากนั้นเอา Id ไปหา allModels เพื่อให้ได้ key ของ model นั้น
    const keys: string[] = []
    for (const id of objectDetectionIds) {
      const model = allModels.find((m) => m.id === id) as Model & {
        key?: string
      }
      if (model?.key) {
        keys.push(model.key)
      }
    }

    return keys
  }, [allModels, watchedModelIds])

  const title = useMemo(() => {
    return isOpenFromGallery
      ? `${taskId ? t('form.taskForm.editTitle') : t('form.taskForm.addTitle')}${activeStep > 0 ? ` ${watchedName}` : ''}`
      : undefined
  }, [taskId, activeStep, watchedName, t, isOpenFromGallery])

  const actions = isOpenFromGallery ? undefined : (
    <div className='flex justify-end gap-2'>
      {taskStatusId === 1 && (!viewOnly || activeStep > 0) && (
        <Button className='md:hidden! min-w-0! px-2!' variant='outlined' onClick={handleMenuOpen} disabled={loading}>
          <MoreVertIcon />
        </Button>
      )}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {taskStatusId === 1 && activeStep > 0 && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              setActiveStep((prev) => prev - 1)
            }}
          >
            {t('form.taskForm.button.back')}
          </MenuItem>
        )}
        {!viewOnly && taskStatusId === 1 && (
          <MenuItem
            disabled={!enableSaveDraftButton}
            onClick={() => {
              setAnchorEl(null)
              handleSubmit(save(TaskMode.save))()
            }}
          >
            {t('form.taskForm.button.saveDraft')}
          </MenuItem>
        )}
      </Menu>
      {taskStatusId === 1 && activeStep > 0 && (
        <Button
          className='hidden! md:flex!'
          variant='outlined'
          disabled={loading}
          onClick={() => setActiveStep((prev) => prev - 1)}
        >
          {t('form.taskForm.button.back')}
        </Button>
      )}
      <div className='flex-grow' />
      <Button variant='outlined' startIcon={<CloseIcon />} disabled={loading} onClick={handleCancel}>
        {t(viewOnly ? 'button.close' : 'button.cancel')}
      </Button>
      {taskStatusId === 1 ? (
        <>
          {!viewOnly && (
            <Button
              className='hidden! md:flex!'
              variant='outlined'
              startIcon={<SaveIcon />}
              disabled={!enableSaveDraftButton}
              loading={loading}
              onClick={handleSubmit(save(TaskMode.save))}
            >
              {t('form.taskForm.button.saveDraft')}
            </Button>
          )}
          {(activeStep === 0 || (watchedServiceId === 2 && activeStep === 1)) && (
            <Button
              variant='contained'
              color='primary'
              endIcon={<ChevronRightIcon />}
              disabled={!enableNextButton}
              loading={loading}
              onClick={() => setActiveStep((prev) => prev + 1)}
            >
              {t('form.taskForm.button.next')}
            </Button>
          )}
          {!viewOnly &&
            ((watchedServiceId === 1 && activeStep === 1) || (watchedServiceId === 2 && activeStep === 2)) && (
              <Button
                variant='contained'
                startIcon={<SaveIcon />}
                color='primary'
                disabled={!enableSaveAndProcessButton}
                loading={loading}
                onClick={handleSubmit(save(TaskMode.saveAndProcess))}
              >
                {t('form.taskForm.button.saveAndProcess')}
              </Button>
            )}
        </>
      ) : (
        !viewOnly && (
          <Button
            variant='contained'
            startIcon={<SaveIcon />}
            color='primary'
            loading={loading}
            onClick={handleSubmit(saveName())}
          >
            {t('button.save')}
          </Button>
        )
      )}
    </div>
  )

  return (
    <FormWrapper
      isOpenFromGallery={isOpenFromGallery}
      title={title}
      actions={actions}
      fullHeight={activeStep === 2 && watchedServiceId === 2}
      fullWidth
    >
      {taskStatusId === 1 && (
        <>
          {activeStep > 0 && (
            <div className='mb-4 flex flex-wrap items-center justify-center gap-4 text-sm'>
              <div className='flex gap-1'>
                <label className='shrink-0 text-(--color-text-secondary)'>{t('form.taskForm.service')}:</label>
                <label className='truncate font-medium text-(--color-primary)'>{selectedServiceLabel}</label>
              </div>
              <div className='flex items-center gap-1'>
                <label className='shrink-0 text-(--color-text-secondary)'>{t('form.taskForm.rootModel')}:</label>
                <label className='truncate font-medium text-(--color-primary)'>{selectedRootModelLabel}</label>
                {watchedServiceId === 1 && (
                  <IconButton
                    className='text-(--color-text-secondary)!'
                    onClick={() => setShowSelectedModelsDialog(true)}
                  >
                    <InfoIcon />
                  </IconButton>
                )}
              </div>
            </div>
          )}

          {!isOpenFromGallery && (
            <Stepper activeStep={activeStep} alternativeLabel>
              <Step key={0}>
                <StepLabel>{t('form.taskForm.step1')}</StepLabel>
              </Step>
              <Step key={1}>
                <StepLabel>{t('form.taskForm.step2')}</StepLabel>
              </Step>
              {watchedServiceId === 2 && (
                <Step key={2}>
                  <StepLabel>{t('form.taskForm.step3')}</StepLabel>
                </Step>
              )}
            </Stepper>
          )}

          {!isOpenFromGallery && !(activeStep === 2 && watchedServiceId === 2) && <Divider className='my-4!' />}
        </>
      )}
      <form className={`grid grid-cols-1 gap-2 md:grid-cols-2 ${activeStep === 0 ? '' : 'hidden'}`}>
        <div className='flex flex-col md:col-span-2'>
          <InputLabel required>{t('form.taskForm.name')}</InputLabel>
          <TextField
            fullWidth
            placeholder={viewOnly ? '' : t('form.taskForm.name')}
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
            disabled={loading || viewOnly}
          />
        </div>
        {taskStatusId === 1 && (
          <>
            <div className='flex flex-col'>
              <InputLabel required>{t('form.taskForm.service')}</InputLabel>
              <Controller
                control={control}
                name='serviceId'
                render={({ field, fieldState }) => (
                  <Autocomplete
                    options={services}
                    getOptionLabel={(opt) => String(language === Language.TH ? opt.name : opt.nameEn)}
                    value={services.find((s) => String(s.id) === String(field.value)) ?? null}
                    onChange={(_, v) => {
                      const id = v ? Number(v.id) : undefined
                      field.onChange(id)
                      handleChangeService(id)
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={viewOnly ? '' : t('form.taskForm.service')}
                        fullWidth
                        error={!!fieldState.error || services.length <= 0}
                        helperText={
                          fieldState.error?.message ??
                          (services.length <= 0 ? t('form.taskForm.noServicePermission') : '')
                        }
                      />
                    )}
                    disabled={loading || viewOnly || services.length <= 0 || isOpenFromGallery}
                  />
                )}
              />
            </div>

            <div className='flex flex-col'>
              <InputLabel required>{t('form.taskForm.rootModel')}</InputLabel>
              <Controller
                control={control}
                name='rootModelId'
                render={({ field, fieldState }) => (
                  <Autocomplete
                    disabled={loading || viewOnly || !watchedServiceId}
                    options={models}
                    getOptionLabel={(opt) => String(language === Language.TH ? opt.name : opt.nameEn)}
                    value={models.find((m) => String(m.id) === String(field.value)) ?? null}
                    onChange={(_, v) => {
                      const id = v ? Number(v.id) : undefined
                      field.onChange(id)
                      handleChangeRootModel(id)
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={viewOnly ? '' : t('form.taskForm.rootModel')}
                        fullWidth
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                )}
              />
            </div>
            {watchedServiceId === 1 && watchedRootModelId && featureTree.length > 0 ? (
              <>
                <div className='mt-2 flex flex-col rounded-lg bg-(--color-background-default) px-4 py-2 md:col-span-2'>
                  <div className='flex items-center'>
                    <label className='font-medium text-primary'>{t('form.taskForm.feature')}</label>
                    <div className='flex-grow' />
                    <Checkbox
                      checked={featureTree.flatMap((n) => getLeafIds(n)).every((id) => watchedModelIds.includes(id))}
                      indeterminate={
                        featureTree.flatMap((n) => getLeafIds(n)).some((id) => watchedModelIds.includes(id)) &&
                        !featureTree.flatMap((n) => getLeafIds(n)).every((id) => watchedModelIds.includes(id))
                      }
                      onChange={(e) => {
                        const all = featureTree.flatMap((n) => getLeafIds(n))
                        setValue('modelIds', e.target.checked ? Array.from(new Set(all)) : [])
                      }}
                      disabled={loading || viewOnly}
                    />
                    <InputLabel>{t('form.taskForm.selectAll')}</InputLabel>
                  </div>
                  <Divider />
                  <div className='grid md:grid-cols-2'>
                    {(featureTree.flatMap((n) => n.children || []) || []).map((node) => renderNode(node, viewOnly))}
                  </div>
                </div>
                {errors.modelIds && (isSubmitted || watchedModelIds.length > 0) ? (
                  <div className='pl-4 text-error text-xs'>{errors.modelIds.message}</div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </form>
      {activeStep === 1 && watchedRootModelId === 1 && renderObjectDetectionForm()}
      {activeStep === 1 && watchedRootModelId === 4 && renderChangeDetectionForm()}
      {activeStep === 1 && watchedServiceId === 2 && renderSarImageSelectionForm()}
      {activeStep === 2 && watchedServiceId === 2 && renderSarAreaSelectionForm()}
      {/* Dialog showing selected models (read-only) */}
      <Dialog
        open={showSelectedModelsDialog}
        onClose={() => setShowSelectedModelsDialog(false)}
        fullWidth
        maxWidth='md'
      >
        <DialogTitle>{t('form.taskForm.feature')}</DialogTitle>
        <DialogContent>
          <div className='mt-2 flex flex-col rounded-lg bg-(--color-background-default) px-4 py-2 md:col-span-2'>
            <div className='flex items-center'>
              <label className='font-medium text-primary'>{t('form.taskForm.feature')}</label>
              <div className='flex-grow' />
              <Checkbox
                checked={featureTree.flatMap((n) => getLeafIds(n)).every((id) => watchedModelIds.includes(id))}
                indeterminate={
                  featureTree.flatMap((n) => getLeafIds(n)).some((id) => watchedModelIds.includes(id)) &&
                  !featureTree.flatMap((n) => getLeafIds(n)).every((id) => watchedModelIds.includes(id))
                }
                disabled
              />
              <InputLabel>{t('form.taskForm.selectAll')}</InputLabel>
            </div>
            <Divider />
            <div className='grid md:grid-cols-2'>
              {(featureTree.flatMap((n) => n.children || []) || []).map((node) => renderNode(node, true))}
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSelectedModelsDialog(false)}>{t('button.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showImagesSelectorDialog}
        onClose={() => setShowImagesSelectorDialog(false)}
        fullWidth
        fullScreen={isFullScreen}
        sx={{
          '& .MuiDialog-paper': {
            width: '100%',
            maxWidth: 'none',
            [theme.breakpoints.up('md')]: { width: '90%', height: '90%' },
          },
        }}
      >
        <DialogTitle>{t('form.taskForm.gallery')}</DialogTitle>
        <DialogContent className='p-0!'>
          {showImagesSelectorDialog && (
            <ImagesSelector
              mode={ImagesMode.Selector}
              serviceId={watchedServiceId}
              modelList={watchedRootModelId === RootModelConfig.changeDetection ? modelObjectDetectionKeys : []}
              projectId={projectId}
              onSelect={(image: any) => {
                setSelectedGalleryImage(image.id)
              }}
              externalOrgId={orgId}
              pageUse='task'
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button color='inherit' onClick={() => setShowImagesSelectorDialog(false)}>
            {t('button.cancel')}
          </Button>
          <Button
            onClick={() => {
              if (imagesSelectorSlot === undefined) {
                handleSelectObjectDetectionImage(selectedGalleryImage!)
              } else {
                handleSelectChangeDetectionImage(imagesSelectorSlot, selectedGalleryImage!)
              }
              setShowImagesSelectorDialog(false)
            }}
            disabled={!selectedGalleryImage || viewOnly}
          >
            {t('button.select')}
          </Button>
        </DialogActions>
      </Dialog>
    </FormWrapper>
  )
}

const ModelResultsTable: React.FC<{
  slot: number
  modelId: number
  image: GetResultImageDtoOut
  selectedModelResults: ModelResult[]
  onSelectModelResult: (mr: ModelResult) => void
  loading?: boolean
  viewOnly?: boolean
}> = ({ slot, modelId, image, selectedModelResults, onSelectModelResult, loading, viewOnly }) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()

  const [sortState, setSortState] = useState<{
    orderBy: string
    order: SortType
  }>({
    orderBy: 'processAt',
    order: SortType.DESC,
  })

  const columns: any[] = useMemo(
    () => [
      {
        id: 'model',
        label: t('form.taskForm.modelResultColumn.model'),
        className: 'min-w-32',
        sortable: true,
        render: (row: any) => (language === Language.TH ? row.rootModel.name : row.rootModel.nameEn),
      },
      {
        id: 'feature',
        label: t('form.taskForm.modelResultColumn.feature'),
        className: 'min-w-20',
        sortable: true,
        render: (row: any) => (language === Language.TH ? row.model.name : row.model.nameEn),
      },
      {
        id: 'processAt',
        label: t('form.taskForm.modelResultColumn.processAt'),
        className: 'min-w-40',
        sortable: true,
        render: (row: any) => (row.processAt ? formatDateTime(row.processAt, language) : ''),
      },
      {
        id: 'project',
        label: t('form.taskForm.modelResultColumn.project'),
        className: 'min-w-40',
        sortable: true,
        render: (row: any) => row.project.name,
      },
    ],
    [t, language],
  )
  const handleSortChange = (orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
  }
  const results = useMemo(() => {
    const rows = (image.modelResult || []).filter((row) => row.mappingModelId === modelId)
    const { orderBy, order } = sortState || {
      orderBy: '',
      order: SortType.ASC,
    }
    if (!orderBy) return rows

    const getValue = (row: any, key: string): string | number => {
      switch (key) {
        case 'model':
          return language === Language.TH ? (row.rootModel?.name ?? '') : (row.rootModel?.nameEn ?? '')
        case 'feature':
          return language === Language.TH ? (row.model?.name ?? '') : (row.model?.nameEn ?? '')
        case 'processAt':
          return row.processAt ? new Date(row.processAt).getTime() : 0
        case 'project':
          return row.project?.name ?? ''
        default:
          return ''
      }
    }

    const compareValues = (va: any, vb: any, ord: SortType) => {
      const a = va == null ? '' : va
      const b = vb == null ? '' : vb

      if (typeof a === 'number' && typeof b === 'number') {
        return ord === SortType.ASC ? a - b : b - a
      }

      const sa = String(a).toLowerCase()
      const sb = String(b).toLowerCase()
      if (sa === sb) return 0
      return (sa < sb ? -1 : 1) * (ord === SortType.ASC ? 1 : -1)
    }

    const sorted = [...rows].sort((a: any, b: any) => {
      const va = getValue(a, orderBy)
      const vb = getValue(b, orderBy)
      return compareValues(va, vb, order)
    })

    return sorted
  }, [image.modelResult, modelId, sortState, language])
  return (
    <Table stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell className='bg-white!' padding='checkbox'></TableCell>
          {columns.map((col) => (
            <TableCell
              key={col.id}
              className={`bg-white! ${col.className || ''}`}
              align={col.align || 'left'}
              sortDirection={sortState && sortState.orderBy === col.id ? sortState.order : false}
            >
              {col.sortable ? (
                <TableSortLabel
                  active={sortState?.orderBy === col.id}
                  direction={sortState?.orderBy === col.id ? sortState.order : SortType.ASC}
                  onClick={() => {
                    const isAsc = sortState?.orderBy === col.id && sortState.order === SortType.ASC
                    handleSortChange(col.id, isAsc ? SortType.DESC : SortType.ASC)
                  }}
                >
                  {col.label}
                </TableSortLabel>
              ) : (
                col.label
              )}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {results.map((row, idx) => {
          const checked =
            selectedModelResults.filter(
              (mr) =>
                mr.comparisonsTypeId === slot + 1 &&
                mr.groupModelId === row.mappingModelId &&
                mr.selectResultTaskId === row.taskId &&
                mr.resultId === row.resultId,
            ).length > 0
          return (
            <TableRow key={idx} className={idx % 2 === 0 ? 'bg-(--color-background-default)' : ''}>
              <TableCell padding='checkbox'>
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectModelResult({
                        comparisonsTypeId: slot + 1,
                        groupModelId: row.mappingModelId!,
                        selectResultTaskId: row.taskId,
                        resultId: row.resultId!,
                      })
                    }
                  }}
                  disabled={loading || results.length === 1 || viewOnly}
                />
              </TableCell>
              {columns.map((col) => (
                <TableCell key={col.id} align={col.align || 'left'}>
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default EditTaskForm
