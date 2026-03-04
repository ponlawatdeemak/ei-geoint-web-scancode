'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import InputLabel from '@/components/common/input/InputLabel'
import FormWrapper from '@/components/layout/FormWrapper'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { Checkbox, Divider } from '@mui/material'
import type { HierarchicalLookupNode } from '@/utils/transformData'
import { useHierarchicalCheckboxes } from './hooks/useHierarchicalCheckboxes'
import { useSubscriptionForm } from './hooks/useSubscriptionForm'

type Props = {
  subscriptionId?: string
}

type FormValues = {
  name: string
  nameEn: string
  modelIds: number[]
}

const NodeItem: React.FC<{
  node: HierarchicalLookupNode & { parentModelId?: number | null }
  language: string
  isNodeChecked: (node: HierarchicalLookupNode) => boolean
  isNodeIndeterminate: (node: HierarchicalLookupNode) => boolean
  toggleNode: (node: HierarchicalLookupNode, checked: boolean) => void
}> = ({ node, language, isNodeChecked, isNodeIndeterminate, toggleNode }) => {
  const hasChildren = !!node.children && node.children.length > 0
  const isRoot = !node.parentModelId && hasChildren

  return (
    <div className={`flex flex-col ${isRoot ? 'md:col-span-2' : ''}`}>
      <div className='flex items-center'>
        <Checkbox
          checked={isNodeChecked(node)}
          indeterminate={isNodeIndeterminate(node)}
          onChange={(e) => toggleNode(node, e.target.checked)}
        />
        <InputLabel className={isRoot ? 'font-medium' : undefined}>
          {language === 'th' ? node.name : node.nameEn}
        </InputLabel>
      </div>
      {hasChildren ? (
        <div className={`ml-8 ${isRoot ? 'grid md:grid-cols-2' : ''}`}>
          {(node.children || []).map((child) => (
            <NodeItem
              key={child.id}
              node={child}
              language={language}
              isNodeChecked={isNodeChecked}
              isNodeIndeterminate={isNodeIndeterminate}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

const EditSubscriptionForm: React.FC<Props> = ({ subscriptionId }) => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showAlert } = useGlobalUI()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    nameEn: Yup.string().required(),
    modelIds: Yup.array().of(Yup.number()).min(1),
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: yupResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      nameEn: '',
      modelIds: [],
    },
  })

  const { selectedModelIds, setSelectedModelIds, isNodeChecked, isNodeIndeterminate, toggleNode, getLeafIds } =
    useHierarchicalCheckboxes()

  const { loading, services, loadData, saveData, deleteSubscription } = useSubscriptionForm({
    subscriptionId,
    setValue,
    setSelectedModelIds,
  })

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Global helpers for top-level "select all"
  const allLeafIds = useMemo(() => services.flatMap((s) => getLeafIds(s)), [services, getLeafIds])

  const isAllChecked = useCallback(() => {
    if (allLeafIds.length === 0) return false
    return allLeafIds.every((id) => selectedModelIds.includes(id))
  }, [allLeafIds, selectedModelIds])

  const isAllIndeterminate = useCallback(() => {
    if (allLeafIds.length === 0) return false
    const some = allLeafIds.some((id) => selectedModelIds.includes(id))
    return some && !isAllChecked()
  }, [allLeafIds, selectedModelIds, isAllChecked])

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedModelIds(() => (checked ? Array.from(new Set(allLeafIds)) : []))
    },
    [allLeafIds, setSelectedModelIds],
  )

  // Sync selectedModelIds into form value so validation runs
  useEffect(() => {
    setValue('modelIds', selectedModelIds, { shouldValidate: true })
  }, [selectedModelIds, setValue])

  const onSubmit = (data: unknown) => {
    showAlert({
      status: 'confirm-save',
      content: t('form.subscriptionForm.confirmContent'),
      showCancel: true,
      onConfirm: () => {
        void saveData(data as FormValues, selectedModelIds)
      },
    })
  }

  const handleDelete = () => {
    showAlert({
      status: 'confirm-delete',
      showCancel: true,
      onConfirm: deleteSubscription,
    })
  }

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)

  return (
    <FormWrapper
      title={subscriptionId ? t('form.subscriptionForm.editTitle') : t('form.subscriptionForm.addTitle')}
      actions={
        <div className='flex justify-end gap-2'>
          {subscriptionId ? (
            <>
              <Button
                className='hidden! md:flex!'
                variant='outlined'
                color='error'
                disabled={loading}
                onClick={handleDelete}
              >
                {t('button.delete')}
              </Button>
              <Button
                className='md:hidden! min-w-0! px-2!'
                variant='outlined'
                onClick={handleMenuOpen}
                disabled={loading}
              >
                <MoreVertIcon />
              </Button>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem
                  className='text-error!'
                  onClick={() => {
                    setAnchorEl(null)
                    handleDelete()
                  }}
                >
                  {t('button.delete')}
                </MenuItem>
              </Menu>
            </>
          ) : null}
          <div className='flex-grow' />
          <Button
            variant='outlined'
            disabled={loading}
            startIcon={<CloseIcon />}
            onClick={() => router.replace('/subscription')}
          >
            {t('button.cancel')}
          </Button>
          <Button
            variant='contained'
            color='primary'
            loading={loading}
            startIcon={<SaveIcon />}
            onClick={handleSubmit(onSubmit)}
          >
            {t('button.save')}
          </Button>
        </div>
      }
      fullWidth
    >
      <form className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        <div className='flex flex-col'>
          <InputLabel required>{t('form.subscriptionForm.name')}</InputLabel>
          <TextField
            placeholder={t('form.subscriptionForm.name')}
            variant='outlined'
            fullWidth
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        </div>
        <div className='flex flex-col'>
          <InputLabel required>{t('form.subscriptionForm.nameEn')}</InputLabel>
          <TextField
            placeholder={t('form.subscriptionForm.nameEn')}
            variant='outlined'
            fullWidth
            {...register('nameEn')}
            error={!!errors.nameEn}
            helperText={errors.nameEn?.message}
          />
        </div>
        <div className='mt-2 flex items-center md:col-span-2'>
          <div className='relative flex-grow'>
            <label className='font-medium text-lg text-primary'>{t('form.subscriptionForm.analysisType')}</label>
            {errors.modelIds && (isSubmitted || selectedModelIds.length > 0) ? (
              <div className='absolute top-6 pl-3.5 text-error text-xs'>{errors.modelIds.message}</div>
            ) : null}
          </div>
          <Checkbox
            checked={isAllChecked()}
            indeterminate={isAllIndeterminate()}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <InputLabel>{t('form.subscriptionForm.selectAll')}</InputLabel>
        </div>
        {services.map((service) => (
          <div
            key={service.id}
            className='flex flex-col rounded-lg bg-(--color-background-default) px-4 py-2 md:col-span-2'
          >
            <div className='flex items-center'>
              <label className='font-medium text-primary'>{language === 'th' ? service.name : service.nameEn}</label>
              <div className='flex-grow' />
              <Checkbox
                checked={isNodeChecked(service)}
                indeterminate={isNodeIndeterminate(service)}
                onChange={(e) => toggleNode(service, e.target.checked)}
              />
              <InputLabel>{t('form.subscriptionForm.selectAll')}</InputLabel>
            </div>
            <Divider />
            <div className='grid md:grid-cols-2'>
              {service.children?.map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  language={language}
                  isNodeChecked={isNodeChecked}
                  isNodeIndeterminate={isNodeIndeterminate}
                  toggleNode={toggleNode}
                />
              ))}
            </div>
          </div>
        ))}
      </form>
    </FormWrapper>
  )
}

export default EditSubscriptionForm
