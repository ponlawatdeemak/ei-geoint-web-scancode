'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import service from '@/api'
import SearchWrapper, { FilterFieldConfig } from '@/components/layout/SearchWrapper'
import { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { SortType } from '@interfaces/config'
import { formatDateTime } from '@/utils/formatDate'
import { Button, Chip } from '@mui/material'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import NavigationBar from '@/components/layout/NavigationBar'

const initialFilters = {
  keyword: '',
  orgId: '',
}

const ApiManagementPage = () => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [searchTrigger, setSearchTrigger] = useState<number>(0) // force re-search

  const columns: MuiTableColumn<any>[] = [
    {
      id: 'name',
      label: t('form.searchApiKey.column.organization'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => (language === 'th' ? row.name : row.nameEn),
    },
    {
      id: 'status',
      label: t('form.searchApiKey.column.status'),
      className: 'min-w-40',
      align: 'center',
      render: (row) => (
        <Chip
          label={
            row.isApiSharingEnabled ? t('form.searchApiKey.status.active') : t('form.searchApiKey.status.inactive')
          }
          color={row.isApiSharingEnabled ? 'success' : 'error'}
          size='small'
        />
      ),
    },
  ]

  const filtersConfig: FilterFieldConfig[] = [
    {
      name: 'keyword',
      label: '',
      type: 'text',
      placeholder: 'form.searchApiKey.filter.keywordOrgPlaceholder',
      isPrimary: true,
    },
    {
      name: 'isApiSharingEnabled',
      label: 'form.searchApiKey.filter.status',
      type: 'select',
      minWidth: 120,
      options: [
        { id: 'true', name: 'เปิดใช้งาน', nameEn: 'Active' },
        { id: 'false', name: 'ปิดใช้งาน', nameEn: 'Inactive' },
      ],
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
        name: filters.keyword,
        isApiSharingEnabled: filters.isApiSharingEnabled ? filters.isApiSharingEnabled === 'true' : undefined,
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

  const handleEdit = (row: any) => {
    router.push(`/api/${row.id}`)
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar items={[{ label: 'navigation.manageApiKey' }]}>
          <div className='flex flex-1'>
            <div className='hidden flex-1 md:block' />
            {/* <Button
              className='hidden! md:flex!'
              variant='contained'
              color='primary'
              startIcon={<AddIcon />}
              component={Link}
              href='/api-management/create'
            >
              {t('form.searchApiKey.addApiKeyButton')}
            </Button> */}
            <Button
              className='md:hidden! min-w-0! px-2!'
              variant='contained'
              color='primary'
              component={Link}
              href='/api-management/create'
            >
              <AddIcon />
            </Button>
          </div>
        </NavigationBar>
      </div>
      <div className='min-h-0 flex-1'>
        <SearchWrapper
          columns={columns}
          filtersConfig={filtersConfig}
          onSearch={onSearch}
          onEdit={handleEdit}
          initialFilters={initialFilters}
          initialSort={{ orderBy: 'createdAt', order: SortType.DESC }}
        />
      </div>
    </div>
  )
}

export default ApiManagementPage
