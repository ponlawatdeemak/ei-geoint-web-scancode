'use client'

import { useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useProfileStore } from '@/hook/useProfileStore'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import service from '@/api'
import { GetOrganizationDtoOut, Roles } from '@interfaces/index'
import NavigationBar from '@/components/layout/NavigationBar'
import OrganizationHeader from '../component/UserQuotaOverview'
import SubscriptionCards from '../component/SubscriptionCards'
import StorageUsageChart from '../component/StorageUsageChart'
import ProjectStorageTable from '../component/ProjectStorageTable'
import { useStorageData } from '../hook/useStorageData'

const DataManagementDetailPage = () => {
  const params = useParams()
  const organizationId = params.id as string
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const profile = useProfileStore((state) => state.profile)
  const { showLoading, hideLoading } = useGlobalUI()

  const isAdminOrSuperAdmin = useMemo(() => {
    return profile && [Roles.superAdmin, Roles.admin].includes(profile.roleId)
  }, [profile])

  const { data: orgData, isLoading: isOrgLoading } = useQuery<GetOrganizationDtoOut>({
    queryKey: ['organization', organizationId],
    queryFn: () => service.organizations.get(organizationId),
    enabled: !!organizationId,
  })

  const storageData = useStorageData({ organizationId })

  useEffect(() => {
    const isPageLoading = storageData.isLoading || isOrgLoading

    if (isPageLoading) {
      showLoading()
    } else {
      hideLoading()
    }
  }, [isOrgLoading, storageData.isLoading, showLoading, hideLoading])

  // biome-ignore lint/correctness/useExhaustiveDependencies: t is stable
  const organizationName = useMemo(() => {
    if (!orgData) return t('form.searchOrganization.column.name')
    return language === 'th' ? orgData.name : orgData.nameEn
  }, [orgData, language])

  // biome-ignore lint/correctness/useExhaustiveDependencies: t is stable
  const navigationItems = useMemo(() => {
    const items = []
    if (isAdminOrSuperAdmin) {
      items.push({ label: t('menu.manageData'), href: '/data-management' })
    } else {
      items.push({ label: t('menu.manageData') })
    }
    items.push({ label: organizationName })
    return items
  }, [isAdminOrSuperAdmin, organizationName])

  return (
    <div className='flex h-full flex-col'>
      <NavigationBar items={navigationItems} />
      <div className='flex-1 overflow-auto bg-[#F5F7FA] p-4'>
        <div className='grid grid-cols-12'>
          <div className='col-span-12 mt-4'>
            <OrganizationHeader organizationId={organizationId} />
          </div>
          <div className='col-span-12 mt-4'>
            <SubscriptionCards organizationId={organizationId} />
          </div>
          <div className='col-span-12 mt-4'>
            <StorageUsageChart usedStorage={storageData.usedStorage} />
          </div>
          <div className='col-span-12'>
            <ProjectStorageTable
              data={storageData.projectData}
              total={storageData.total}
              page={storageData.page}
              rowsPerPage={storageData.rowsPerPage}
              sortState={storageData.sortState}
              onPageChange={storageData.onPageChange}
              onRowsPerPageChange={storageData.onRowsPerPageChange}
              onSortChange={storageData.onSortChange}
              organizationId={organizationId}
              isLoading={storageData.isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataManagementDetailPage
