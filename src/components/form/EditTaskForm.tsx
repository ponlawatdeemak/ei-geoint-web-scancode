'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import {
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
  Button,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import FormWrapper from '@/components/layout/FormWrapper'
import InfoIcon from '@mui/icons-material/Info'
import { useSettings } from '@/hook/useSettings'
import { formatDateTime } from '@/utils/formatDate'
import { HierarchicalLookupNode } from '@/utils/transformData'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useProfileStore } from '@/hook/useProfileStore'
import ImagesSelector from '../common/images'
import { ImagesMode } from '../common/images/images'
import SarAnalysisAreaForm from '@/components/form/SarAnalysisAreaForm'
import { Language, MappingChangeToObject, Roles, RootModelConfig } from '@interfaces/config'

import type { FormValues, Props, SarFeature, Model } from './hooks/types'
import { useTaskFormData } from './hooks/useTaskFormData'
import { useFeatureTree } from './hooks/useFeatureTree'
import { useTaskFormValidation } from './hooks/useTaskFormValidation'
import { useTaskFormSave } from './hooks/useTaskFormSave'

import ObjectDetectionForm from './components/ObjectDetectionForm'
import ChangeDetectionForm from './components/ChangeDetectionForm'
import FeatureTreePanel from './components/FeatureTreePanel'
import TaskConfigForm from './components/TaskConfigForm'
import TaskFormActions from './components/TaskFormActions'

function computeViewOnly(
  propViewOnly: boolean | undefined,
  roleId: number,
  taskId: string | undefined,
  isTaskOwner: boolean,
): boolean {
  if (propViewOnly !== undefined) return propViewOnly
  if ([Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(roleId)) return false
  if (roleId === Roles.user) {
    if (!taskId || taskId === 'create') return false
    return !isTaskOwner
  }
  return true
}

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
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showAlert } = useGlobalUI()
  // Profile is always available within an authenticated route
  const profile = useProfileStore((state) => state.profile)!
  const theme = useTheme()
  const isFullScreen = useMediaQuery(theme.breakpoints.down('md'))

  // ----- Form setup -----
  const schema = Yup.object().shape({
    name: Yup.string().required(),
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

  // ----- Custom hooks -----
  const formData = useTaskFormData({
    projectId,
    taskId,
    isOpenFromGallery,
    isProcessed,
    defaultServiceId,
    propViewOnly,
    setValue,
  })

  const {
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
  } = formData

  const viewOnly = useMemo(
    () => computeViewOnly(propViewOnly, profile.roleId, taskId, isTaskOwner),
    [profile.roleId, propViewOnly, isTaskOwner, taskId],
  )

  const { getLeafIds, isNodeChecked, isNodeIndeterminate, toggleNode, handleChangeRootModel, handleChangeService } =
    useFeatureTree({
      allModels,
      watchedModelIds,
      isOpenFromGallery,
      isProcessed,
      language,
      setValue,
      setModels,
      setFeatureTree,
    })

  useEffect(() => {
    if (isOpenFromGallery && defaultServiceId) {
      handleChangeService(defaultServiceId)
    }
  }, [defaultServiceId, handleChangeService, isOpenFromGallery])

  const { enableNextButton, enableSaveDraftButton, enableSaveAndProcessButton } = useTaskFormValidation({
    watchedName,
    watchedServiceId,
    watchedRootModelId,
    watchedModelIds,
    activeStep,
    selectedImages,
    selectedModelResults,
    featureTree,
    getLeafIds,
    sarFeatures,
  })

  useEffect(() => {
    if (isOpenFromGallery) {
      setIsValid?.(!!enableNextButton)
    }
  }, [enableNextButton, setIsValid, isOpenFromGallery])

  const { saveName, save } = useTaskFormSave({
    projectId,
    taskId,
    watchedServiceId,
    watchedRootModelId,
    selectedImages,
    selectedModelResults,
    sarFeatures,
    setLoading,
  })

  // ----- Derived values -----
  const getLocalizedLabel = useCallback(
    (item: { id: number; name?: string; nameEn?: string } | undefined): string => {
      if (!item) return '-'
      const label = language === Language.TH ? item.name : item.nameEn
      return label || String(item.id)
    },
    [language],
  )

  const selectedServiceLabel = useMemo(() => {
    const svc = services.find((s) => String(s.id) === String(watchedServiceId))
    return getLocalizedLabel(svc)
  }, [services, watchedServiceId, getLocalizedLabel])

  const selectedRootModelLabel = useMemo(() => {
    const m =
      allModels.find((mm) => String(mm.id) === String(watchedRootModelId)) ||
      models.find((mm) => String(mm.id) === String(watchedRootModelId))
    return getLocalizedLabel(m)
  }, [allModels, models, watchedRootModelId, getLocalizedLabel])

  const modelObjectDetectionKeys = useMemo(() => {
    const objectDetectionIds = new Set<number>()
    for (const changeModelId of watchedModelIds) {
      for (const [objectDetectionId, changeDetectionIds] of Object.entries(MappingChangeToObject)) {
        if ((changeDetectionIds as number[]).includes(Number(changeModelId))) {
          objectDetectionIds.add(Number(objectDetectionId))
        }
      }
    }
    const keys: string[] = []
    for (const id of objectDetectionIds) {
      const model = allModels.find((m) => m.id === id) as Model & { key?: string }
      if (model?.key) keys.push(model.key)
    }
    return keys
  }, [allModels, watchedModelIds])

  const title = useMemo(() => {
    if (!isOpenFromGallery) return undefined
    const prefix = taskId ? t('form.taskForm.editTitle') : t('form.taskForm.addTitle')
    const suffix = activeStep > 0 ? ` ${watchedName}` : ''
    return `${prefix}${suffix}`
  }, [taskId, activeStep, watchedName, t, isOpenFromGallery])

  const taskListPath = `/project/${projectId}/task`

  const handleCancel = () => {
    if (viewOnly) {
      router.replace(taskListPath)
      return
    }
    showAlert({
      status: 'confirm-cancel',
      showCancel: true,
      onConfirm: () => router.replace(taskListPath),
    })
  }

  const handleOpenObjectDetectionGallery = () => {
    setImagesSelectorSlot(undefined)
    setSelectedGalleryImage(undefined)
    setShowImagesSelectorDialog(true)
  }

  const handleOpenChangeDetectionGallery = (slot: number) => {
    setImagesSelectorSlot(slot)
    setSelectedGalleryImage(undefined)
    setShowImagesSelectorDialog(true)
  }

  const handleGalleryConfirm = () => {
    if (!selectedGalleryImage) return
    if (imagesSelectorSlot === undefined) {
      handleSelectObjectDetectionImage(selectedGalleryImage)
    } else {
      handleSelectChangeDetectionImage(
        imagesSelectorSlot,
        selectedGalleryImage,
        featureTree,
        watchedModelIds,
        getLeafIds,
        watchedModelIds,
      )
    }
    setShowImagesSelectorDialog(false)
  }

  // Recursive tree node renderer
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
            <span className={isRoot ? 'font-medium' : undefined}>
              {language === Language.TH ? node.name : node.nameEn}
            </span>
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

  // ----- Actions bar -----
  const actions = isOpenFromGallery ? undefined : (
    <TaskFormActions
      taskStatusId={taskStatusId}
      activeStep={activeStep}
      viewOnly={viewOnly}
      loading={loading}
      watchedServiceId={watchedServiceId}
      enableNextButton={enableNextButton}
      enableSaveDraftButton={enableSaveDraftButton}
      enableSaveAndProcessButton={enableSaveAndProcessButton}
      handleSubmit={handleSubmit}
      save={save}
      saveName={saveName}
      setActiveStep={setActiveStep}
      handleCancel={handleCancel}
      t={t}
    />
  )

  // ----- Render -----
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

          {!isOpenFromGallery && activeStep !== 2 && <Divider className='my-4!' />}
          {!isOpenFromGallery && activeStep === 2 && watchedServiceId !== 2 && <Divider className='my-4!' />}
        </>
      )}

      <TaskConfigForm
        activeStep={activeStep}
        taskStatusId={taskStatusId}
        viewOnly={viewOnly}
        loading={loading}
        language={language}
        isOpenFromGallery={isOpenFromGallery}
        services={services}
        models={models}
        featureTree={featureTree}
        watchedServiceId={watchedServiceId}
        watchedRootModelId={watchedRootModelId}
        watchedModelIds={watchedModelIds}
        control={control}
        register={register}
        errors={errors}
        isSubmitted={isSubmitted}
        getLeafIds={getLeafIds}
        setValue={setValue}
        handleChangeService={handleChangeService}
        handleChangeRootModel={handleChangeRootModel}
        renderNode={renderNode}
        t={t}
      />

      {/* Step 1: Image selection */}
      {activeStep === 1 && watchedRootModelId === 1 && (
        <ObjectDetectionForm
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          language={language}
          loading={loading}
          imageLoading={imageLoading}
          viewOnly={viewOnly}
          t={t}
          formatDateFn={formatDateTime}
          onOpenGallery={handleOpenObjectDetectionGallery}
        />
      )}
      {activeStep === 1 && (watchedRootModelId === 4 || watchedServiceId === 2) && (
        <ChangeDetectionForm
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          selectedModelResults={selectedModelResults}
          setSelectedModelResults={setSelectedModelResults}
          featureTree={featureTree}
          getLeafIds={getLeafIds}
          watchedModelIds={watchedModelIds}
          language={language}
          loading={loading}
          imageLoading={imageLoading}
          viewOnly={viewOnly}
          t={t}
          onOpenGallery={handleOpenChangeDetectionGallery}
        />
      )}

      {/* Step 2: SAR area */}
      {activeStep === 2 && watchedServiceId === 2 && (
        <SarAnalysisAreaForm
          imageBefore={selectedImages[0]!}
          imageAfter={selectedImages[1]!}
          viewOnly={viewOnly}
          loading={loading}
          features={sarFeatures}
          onFeaturesChange={(next) => setSarFeatures(next as SarFeature[])}
        />
      )}

      {/* Dialog: selected models (read-only) */}
      <Dialog
        open={showSelectedModelsDialog}
        onClose={() => setShowSelectedModelsDialog(false)}
        fullWidth
        maxWidth='md'
      >
        <DialogTitle>{t('form.taskForm.feature')}</DialogTitle>
        <DialogContent>
          <FeatureTreePanel
            featureTree={featureTree}
            watchedModelIds={watchedModelIds}
            getLeafIds={getLeafIds}
            setValue={setValue}
            loading={loading}
            disabled
            t={t}
            renderNode={renderNode}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSelectedModelsDialog(false)}>{t('button.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: image gallery selector */}
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
              onSelect={(image: any) => setSelectedGalleryImage(image.id)}
              externalOrgId={orgId}
              pageUse='task'
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button color='inherit' onClick={() => setShowImagesSelectorDialog(false)}>
            {t('button.cancel')}
          </Button>
          <Button onClick={handleGalleryConfirm} disabled={!selectedGalleryImage || viewOnly}>
            {t('button.select')}
          </Button>
        </DialogActions>
      </Dialog>
    </FormWrapper>
  )
}

export default EditTaskForm
