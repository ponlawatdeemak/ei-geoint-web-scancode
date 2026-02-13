'use client'

import React, { useEffect, useState } from 'react'
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
import service from '@/api'
import { PostSubscriptionDtoIn, PutSubscriptionDtoIn } from '@interfaces/index'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { Checkbox, Divider } from '@mui/material'
import { buildHierarchicalLookup, HierarchicalLookupNode } from '@/utils/transformData'

type Props = {
  subscriptionId?: string
}

type FormValues = {
  name: string
  nameEn: string
  modelIds: number[]
}

const EditSubscriptionForm: React.FC<Props> = ({ subscriptionId }) => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<HierarchicalLookupNode[]>([])
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([])

  // Helpers for hierarchical checkbox behavior
  const getLeafIds = (node: HierarchicalLookupNode): number[] => {
    if (!node.children || node.children.length === 0) return [node.id]
    return node.children.flatMap((child) => getLeafIds(child))
  }

  const isNodeChecked = (node: HierarchicalLookupNode) => {
    const leafIds = getLeafIds(node)
    if (leafIds.length === 0) return false
    return leafIds.every((id) => selectedModelIds.includes(id))
  }

  const isNodeIndeterminate = (node: HierarchicalLookupNode) => {
    const leafIds = getLeafIds(node)
    if (leafIds.length === 0) return false
    const some = leafIds.some((id) => selectedModelIds.includes(id))
    return some && !isNodeChecked(node)
  }

  const toggleNode = (node: HierarchicalLookupNode, checked: boolean) => {
    const leafIds = getLeafIds(node)
    setSelectedModelIds((prev) => {
      const set = new Set(prev)
      if (checked) {
        for (const id of leafIds) set.add(id)
      } else {
        for (const id of leafIds) set.delete(id)
      }
      return Array.from(set)
    })
  }

  // Global helpers for top-level "select all"
  const getAllLeafIds = () => services.flatMap((s) => getLeafIds(s))

  const isAllChecked = () => {
    const all = getAllLeafIds()
    if (all.length === 0) return false
    return all.every((id) => selectedModelIds.includes(id))
  }

  const isAllIndeterminate = () => {
    const all = getAllLeafIds()
    if (all.length === 0) return false
    const some = all.some((id) => selectedModelIds.includes(id))
    return some && !isAllChecked()
  }

  const toggleAll = (checked: boolean) => {
    const all = getAllLeafIds()
    setSelectedModelIds(() => (checked ? Array.from(new Set(all)) : []))
  }

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

  useEffect(() => {
    const load = async () => {
      try {
        showLoading()
        const services = await service.lookup.get({ name: 'services' })
        const models = await service.lookup.getModelAll()
        setServices(
          services.map((s) => ({
            ...s,
            children: buildHierarchicalLookup(
              models.filter((m) => m.serviceId === s.id),
              'parentModelId',
            ),
          })),
        )
        if (subscriptionId) {
          const sub = await service.subscriptions.get(subscriptionId)
          setValue('name', sub.name || '')
          setValue('nameEn', sub.nameEn || '')
          const ids = (sub.subscriptionModels || []).map(({ modelId }) => modelId)
          setSelectedModelIds(ids)
          setValue('modelIds', ids, { shouldValidate: true })
        }
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        hideLoading()
      }
    }
    void load()
  }, [subscriptionId, setValue, showLoading, hideLoading, showAlert])

  const save = async (data: FormValues) => {
    setLoading(true)
    try {
      // Build payload matching PostSubscriptionDtoIn | PutSubscriptionDtoIn
      const payload: Partial<PostSubscriptionDtoIn | PutSubscriptionDtoIn> = {
        name: data.name,
        nameEn: data.nameEn,
        modelIds: selectedModelIds,
      }

      if (subscriptionId) {
        // update existing subscription
        await service.subscriptions.update(subscriptionId, payload as PutSubscriptionDtoIn)
      } else {
        // create new subscription
        await service.subscriptions.create(payload as PostSubscriptionDtoIn)
      }

      showAlert({ status: 'success', title: t('alert.saveSuccess') })

      router.replace('/subscription')
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

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
        void save(data as FormValues)
      },
    })
  }

  const handleDelete = () => {
    showAlert({
      status: 'confirm-delete',
      showCancel: true,
      onConfirm: async () => {
        setLoading(true)
        try {
          await service.subscriptions.delete({ ids: [subscriptionId as string] })
          router.replace('/subscription')
        } catch (err: any) {
          showAlert({
            status: 'error',
            errorCode: err?.message,
          })
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
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
              {/* Recursive renderer for hierarchical nodes. Only leaf node ids are stored in selectedModelIds. */}
              {service.children?.map(function renderNode(node) {
                const hasChildren = !!node.children && node.children.length > 0
                const isRoot = !(node as any).parentModelId && hasChildren
                return (
                  <div key={node.id} className={`flex flex-col ${isRoot ? 'md:col-span-2' : ''}`}>
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
                        {(node.children || []).map(renderNode)}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </form>
    </FormWrapper>
  )
}

export default EditSubscriptionForm
