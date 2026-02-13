'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useProfileStore } from '@/hook/useProfileStore'
import service from '@/api'
import { GetSubscriptionsDataManagementDtoOut, Roles } from '@interfaces/index'
import { formatDate, formatDuration } from '@/utils/formatDate'
import HistoryIcon from '@mui/icons-material/History'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import ExpiredSubscriptionsDialog from './modal/ExpiredSubscriptionsDialog'
import Empty from '@/components/common/empty'

interface SubscriptionCardsProps {
  organizationId?: string
}

const SubscriptionCards = ({ organizationId }: SubscriptionCardsProps) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const profile = useProfileStore((state) => state.profile)
  const [openExpiredDialog, setOpenExpiredDialog] = useState(false)

  const isAdminOrSuperAdmin = useMemo(() => {
    return profile && [Roles.superAdmin, Roles.admin].includes(profile.roleId)
  }, [profile])

  const { data: subscriptions = [] } = useQuery<GetSubscriptionsDataManagementDtoOut[]>({
    queryKey: ['data-management-subscriptions', organizationId],
    queryFn: () =>
      service.dataManagement.getSubscriptions(isAdminOrSuperAdmin && organizationId ? { organizationId } : undefined),
    enabled: !!profile,
  })

  return (
    <div className='rounded-lg bg-white p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='font-semibold text-md'>{t('dataManagement.subscription')}</h2>
      </div>

      {subscriptions.length === 0 ? (
        <Empty message={t('table.noData')} className='py-10' />
      ) : (
        <div className='flex flex-wrap justify-center gap-4'>
          {subscriptions.map((subscription) => (
            <SubscriptionCard key={subscription.id} subscription={subscription} language={language} />
          ))}
        </div>
      )}

      <div className='mt-4 flex justify-end'>
        <button type='button' onClick={() => setOpenExpiredDialog(true)} className='flex items-center gap-1 text-sm'>
          <HistoryIcon fontSize='small' />
          <span>{t('dataManagement.expiredSubscriptions')}</span>
        </button>
      </div>

      <ExpiredSubscriptionsDialog
        open={openExpiredDialog}
        onClose={() => setOpenExpiredDialog(false)}
        organizationId={organizationId}
      />
    </div>
  )
}

interface SubscriptionCardProps {
  subscription: GetSubscriptionsDataManagementDtoOut
  language: string
}

const SubscriptionCard = ({ subscription, language }: SubscriptionCardProps) => {
  const { t } = useTranslation('common')

  const subscriptionName = useMemo(() => {
    return language === 'th' ? subscription.name : subscription.nameEn
  }, [subscription, language])

  const startDate = formatDate(subscription.startAt, language)
  const endDate = formatDate(subscription.endAt, language)

  const remainingDaysText = useMemo(() => {
    if (subscription.remainingDays <= 0) {
      return t('dataManagement.expired')
    }
    const now = new Date()
    const endDate = new Date(subscription.endAt)
    const duration = formatDuration(now, endDate, t)
    return `${t('dataManagement.remaining')} ${duration}`
  }, [subscription.remainingDays, subscription.endAt, t])

  const isExpired = subscription.remainingDays <= 0

  // คำนวณเปอร์เซ็นต์ความคืบหน้า (เวลาที่ผ่านไป)
  const progressPercent = useMemo(() => {
    const start = new Date(subscription.startAt).getTime()
    const end = new Date(subscription.endAt).getTime()
    const now = Date.now()

    if (now >= end) return 100
    if (now <= start) return 0

    const total = end - start
    const elapsed = now - start
    return Math.round((elapsed / total) * 100)
  }, [subscription.startAt, subscription.endAt])

  return (
    <div className='w-full rounded-lg border border-[#D9DAD9] bg-white p-4 shadow-sm sm:w-[calc(50%-8px)] xl:w-[calc(25%-12px)]'>
      <h2 className='mb-4 text-start font-semibold text-md'>{subscriptionName}</h2>

      {/* วันที่ */}
      <div className='mb-2 flex items-start justify-between px-2'>
        <div className='text-center'>
          <div className='font-semibold text-[#0B76C8] text-sm'>{startDate}</div>
          <div className='text-xs'>{t('dataManagement.startDate')}</div>
        </div>
        <Divider orientation='vertical' flexItem />
        <div className='text-center'>
          <div className='font-semibold text-[#D32F2F] text-sm'>{endDate}</div>
          <div className='text-xs'>{t('dataManagement.endDate')}</div>
        </div>
      </div>

      {/* แถบความคืบหน้า */}
      <LinearProgress
        variant='determinate'
        value={progressPercent}
        className='mb-3 h-2 rounded-full'
        sx={{
          backgroundColor: '#A7CAED',
          '& .MuiLinearProgress-bar': {
            backgroundColor: '#1976D2',
            borderRadius: '9999px',
          },
        }}
      />

      {/* จำนวนวันคงเหลือ */}
      <div className={`text-center font-semibold text-sm`}>{remainingDaysText}</div>
    </div>
  )
}

export default SubscriptionCards
