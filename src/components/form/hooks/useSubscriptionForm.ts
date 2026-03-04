import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UseFormSetValue } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { PostSubscriptionDtoIn, PutSubscriptionDtoIn } from '@interfaces/index'
import { buildHierarchicalLookup, HierarchicalLookupNode } from '@/utils/transformData'

interface UseSubscriptionFormParams {
  subscriptionId?: string
  setValue: UseFormSetValue<{ name: string; nameEn: string; modelIds: number[] }>
  setSelectedModelIds: (ids: number[]) => void
}

export function useSubscriptionForm({ subscriptionId, setValue, setSelectedModelIds }: UseSubscriptionFormParams) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<HierarchicalLookupNode[]>([])

  const loadData = useCallback(async () => {
    try {
      showLoading()
      const servicesData = (await service.lookup.get({ name: 'services' })) as {
        id: number
        name: string
        nameEn: string
      }[]
      const modelsData = (await service.lookup.getModelAll()) as {
        id: number
        name: string
        nameEn: string
        parentModelId?: number | null
        serviceId?: number
      }[]
      setServices(
        servicesData.map((s) => ({
          ...s,
          children: buildHierarchicalLookup(
            modelsData.filter((m) => m.serviceId === s.id),
            'parentModelId',
          ),
        })),
      )
      if (subscriptionId) {
        const sub = await service.subscriptions.get(subscriptionId)
        setValue('name', sub.name || '')
        setValue('nameEn', sub.nameEn || '')
        const ids = (sub.subscriptionModels || []).map(({ modelId }: { modelId: number }) => modelId)
        setSelectedModelIds(ids)
      }
    } catch (err: unknown) {
      showAlert({
        status: 'error',
        errorCode: err instanceof Error ? err.message : String(err),
      })
    } finally {
      hideLoading()
    }
  }, [subscriptionId, setValue, setSelectedModelIds, showLoading, hideLoading, showAlert])

  const saveData = useCallback(
    async (data: { name: string; nameEn: string }, selectedModelIds: number[]) => {
      setLoading(true)
      try {
        const payload: Partial<PostSubscriptionDtoIn | PutSubscriptionDtoIn> = {
          name: data.name,
          nameEn: data.nameEn,
          modelIds: selectedModelIds,
        }

        if (subscriptionId) {
          await service.subscriptions.update(subscriptionId, payload as PutSubscriptionDtoIn)
        } else {
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
    },
    [subscriptionId, router, showAlert, t],
  )

  const deleteSubscription = useCallback(async () => {
    if (!subscriptionId) return
    setLoading(true)
    try {
      await service.subscriptions.delete({ ids: [subscriptionId] })
      router.replace('/subscription')
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }, [subscriptionId, router, showAlert])

  return {
    loading,
    setLoading,
    services,
    loadData,
    saveData,
    deleteSubscription,
  }
}
