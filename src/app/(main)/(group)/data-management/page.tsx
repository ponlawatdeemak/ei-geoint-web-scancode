'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useProfileStore } from '@/hook/useProfileStore'
import service from '@/api'
import SearchWrapper, { FilterFieldConfig } from '@/components/layout/SearchWrapper'
import { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { Roles, SortType } from '@interfaces/config'
import { IconButton, Tooltip } from '@mui/material'
import NavigationBar from '@/components/layout/NavigationBar'
import VisibilityIcon from '@mui/icons-material/Visibility'
import OrganizationHeader from './component/UserQuotaOverview'
import SubscriptionCards from './component/SubscriptionCards'
import StorageUsageChart from './component/StorageUsageChart'
import ProjectStorageTable from './component/ProjectStorageTable'
import { useStorageData } from './hook/useStorageData'

const initialFilters = {
  keyword: '',
  organizationId: '',
  isActive: '',
}

const DataManagementPage = () => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)
  const [searchTrigger, setSearchTrigger] = useState<number>(0) // force re-search

  const isAdminOrSuperAdmin = useMemo(() => {
    return profile && [Roles.superAdmin, Roles.admin].includes(profile.roleId)
  }, [profile])

  const columns: MuiTableColumn<any>[] = [
    {
      id: 'name',
      label: t('form.searchOrganization.column.name'),
      className: 'min-w-200',
      sortable: true,
      render: (row) => (language === 'th' ? row.name : row.nameEn),
    },

    {
      id: 'actions',
      label: t('table.actions'),
      className: 'flex justify-end',
      render: (row) => (
        <Tooltip title={t('button.viewDetails')} arrow>
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/data-management/${row.id}`)
            }}
            color='primary'
            size='small'
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  const filtersConfig: FilterFieldConfig[] = [
    {
      name: 'name',
      label: '',
      type: 'text',
      placeholder: 'form.searchOrganization.filter.keywordPlaceholder',
      isPrimary: true,
    },
  ]

  // biome-ignore lint/correctness/useExhaustiveDependencies: force re-search
  const onSearch = useCallback(
    async (
      filters: Record<string, string>,
      page?: number,
      rowsPerPage?: number,
      sortState?: { orderBy: string; order: SortType },
    ): Promise<{ rows: any[]; totalRows: number }> => {
      const { data, total } = await service.organizations.search({
        name: filters.name,
        subscriptionId: filters.subscriptionId,
        isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
        offset: page! * rowsPerPage!,
        limit: rowsPerPage,
        sortField: sortState!.orderBy,
        sortOrder: sortState!.order,
      })
      return {
        rows: data,
        totalRows: total,
      }
    },
    [searchTrigger],
  )

  const storageData = useStorageData({ organizationId: profile?.organizationId })

  const isNonAdminView = !isAdminOrSuperAdmin && !!profile?.organizationId

  useEffect(() => {
    if (!isNonAdminView) {
      return
    }

    if (storageData.isLoading) {
      showLoading()
    } else {
      hideLoading()
    }
  }, [isNonAdminView, storageData.isLoading, showLoading, hideLoading])

  if (!isAdminOrSuperAdmin && profile?.organizationId) {
    return (
      <div className='flex h-full flex-col'>
        <NavigationBar items={[{ label: t('menu.manageData') }]} />
        <div className='flex-1 overflow-auto bg-[#F5F7FA] p-4'>
          <div className='grid grid-cols-12 gap-4'>
            <div className='col-span-12'>
              <OrganizationHeader organizationId={profile.organizationId} />
            </div>
            <div className='col-span-12'>
              <SubscriptionCards organizationId={profile.organizationId} />
            </div>
            <div className='col-span-12'>
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
                organizationId={profile?.organizationId}
                isLoading={storageData.isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar items={[{ label: t('menu.manageData') }]} />
      </div>
      <div className='min-h-0 flex-1'>
        <SearchWrapper
          columns={columns}
          filtersConfig={filtersConfig}
          onSearch={onSearch}
          initialFilters={initialFilters}
          initialSort={{ orderBy: language === 'th' ? 'name' : 'nameEn', order: SortType.ASC }}
        />
      </div>
    </div>
  )
}

export default DataManagementPage
