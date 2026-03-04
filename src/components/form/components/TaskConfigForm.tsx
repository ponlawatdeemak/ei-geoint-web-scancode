'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react'
import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { TextField } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import InputLabel from '@/components/common/input/InputLabel'
import { Language } from '@interfaces/config'
import { HierarchicalLookupNode } from '@/utils/transformData'
import type { FormValues, Service, Model } from '../hooks/types'
import FeatureTreePanel from './FeatureTreePanel'

interface TaskConfigFormProps {
  activeStep: number
  taskStatusId: number
  viewOnly: boolean
  loading: boolean
  language: string
  isOpenFromGallery: boolean
  services: Service[]
  models: Model[]
  featureTree: HierarchicalLookupNode[]
  watchedServiceId?: number
  watchedRootModelId?: number
  watchedModelIds: number[]
  control: Control<FormValues>
  register: UseFormRegister<FormValues>
  errors: FieldErrors<FormValues>
  isSubmitted: boolean
  getLeafIds: (node: HierarchicalLookupNode) => number[]
  setValue: (field: 'modelIds', value: number[]) => void
  handleChangeService: (id?: number) => void
  handleChangeRootModel: (id?: number) => void
  renderNode: (node: HierarchicalLookupNode, disabled?: boolean) => React.ReactNode
  t: (key: string, options?: any) => string
}

const TaskConfigForm: React.FC<TaskConfigFormProps> = ({
  activeStep,
  taskStatusId,
  viewOnly,
  loading,
  language,
  isOpenFromGallery,
  services,
  models,
  featureTree,
  watchedServiceId,
  watchedRootModelId,
  watchedModelIds,
  control,
  register,
  errors,
  isSubmitted,
  getLeafIds,
  setValue,
  handleChangeService,
  handleChangeRootModel,
  renderNode,
  t,
}) => {
  const showFeatureTree = watchedServiceId === 1 && watchedRootModelId && featureTree.length > 0

  return (
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

          {showFeatureTree && (
            <>
              <FeatureTreePanel
                featureTree={featureTree}
                watchedModelIds={watchedModelIds}
                getLeafIds={getLeafIds}
                setValue={setValue}
                loading={loading}
                disabled={viewOnly}
                t={t}
                renderNode={renderNode}
              />
              {errors.modelIds && (isSubmitted || watchedModelIds.length > 0) ? (
                <div className='pl-4 text-error text-xs'>{errors.modelIds.message}</div>
              ) : null}
            </>
          )}
        </>
      )}
    </form>
  )
}

export default TaskConfigForm
