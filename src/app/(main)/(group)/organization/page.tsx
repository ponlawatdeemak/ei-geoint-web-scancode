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
import { Button, Chip, IconButton, Tooltip } from '@mui/material'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import NavigationBar from '@/components/layout/NavigationBar'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ImageIcon from '@mui/icons-material/Image'
import { DataIcon } from '@/icons'

const initialFilters = {
  keyword: '',
  organizationId: '',
  isActive: '',
}

const OrganizationPage = () => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [searchTrigger, setSearchTrigger] = useState<number>(0) // force re-search

  const columns: MuiTableColumn<any>[] = [
    {
      id: 'name',
      label: t('form.searchOrganization.column.name'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => (language === 'th' ? row.name : row.nameEn),
    },
    {
      id: 'subscriptions',
      label: t('form.searchOrganization.column.subscriptions'),
      className: 'min-w-60',
      render: (row) => (
        <div className='flex gap-2'>
          {(row.organizationSubscriptions as any[])
            .sort((a, b) =>
              language === 'th'
                ? a.subscription.name.localeCompare(b.subscription.name)
                : a.subscription.nameEn.localeCompare(b.subscription.nameEn),
            )
            .map(({ subscription }, idx) => (
              <Chip key={idx} label={language === 'th' ? subscription.name : subscription.nameEn} size='small' />
            ))}
        </div>
      ),
    },
    {
      id: 'isActive',
      label: t('form.searchOrganization.column.status'),
      className: 'min-w-32',
      sortable: true,
      render: (row) => (
        <Chip
          className={row.isActive ? undefined : 'bg-(--color-action-disabled)! text-white!'}
          label={row.isActive ? t('status.active') : t('status.inactive')}
          color={row.isActive ? 'success' : undefined}
          size='small'
        />
      ),
    },
    {
      id: 'createdAt',
      label: t('form.searchOrganization.column.createdAt'),
      className: 'min-w-40',
      sortable: true,
      render: (row) => (row.createdAt ? formatDateTime(row.createdAt, language) : ''),
    },
    {
      id: 'actions',
      label: t('table.actions'),
      className: 'min-w-44',
      render: (row, { removeKeysFromSelection }) => (
        <>
          <Tooltip title={t('button.edit')} arrow>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                handleEdit(row)
              }}
              color='primary'
              size='small'
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('button.dataManagement')} arrow>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/data-management/${row.id}`)
              }}
              color='primary'
              size='small'
            >
              <DataIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('button.gallery')} arrow>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/gallery?orgId=${row.id}`)
              }}
              color='primary'
              size='small'
            >
              <ImageIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('button.delete')} arrow>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                // provide onComplete callback so parent can notify when deletion finished
                const keyToRemove = row.id
                handleDelete(row, () => {
                  removeKeysFromSelection([keyToRemove])
                })
              }}
              color='error'
              size='small'
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
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
    {
      name: 'subscriptionId',
      label: 'form.searchOrganization.filter.subscription',
      type: 'select',
      minWidth: 120,
      options: async () => await service.subscriptions.all(),
    },
    {
      name: 'isActive',
      label: 'form.searchOrganization.filter.status',
      type: 'select',
      minWidth: 100,
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

  const deleteMany = useCallback(
    (ids: string[], onComplete?: () => void) => {
      showAlert({
        status: 'confirm-delete',
        showCancel: true,
        onConfirm: async () => {
          showLoading()
          try {
            await service.organizations.delete({ ids })
            onComplete?.()
            setSearchTrigger((prev) => prev + 1) // trigger re-search
          } catch (err: any) {
            showAlert({
              status: 'error',
              errorCode: err?.message,
            })
          } finally {
            hideLoading()
          }
        },
      })
    },
    [showAlert, showLoading, hideLoading],
  )

  const handleEdit = (row: any) => {
    router.push(`/organization/${row.id}`)
  }
  const handleDelete = (row: any, onComplete?: () => void) => {
    deleteMany([row.id], onComplete)
  }
  const handleMultiDelete = (selectedRowKeys: (string | number)[], onComplete?: () => void) => {
    deleteMany(selectedRowKeys as string[], onComplete)
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar items={[{ label: 'navigation.manageOrganization' }]}>
          <div className='flex flex-1'>
            <div className='hidden flex-1 md:block' />
            <Button
              className='hidden! md:flex!'
              variant='contained'
              color='primary'
              startIcon={<AddIcon />}
              component={Link}
              href='/organization/create'
            >
              {t('form.searchOrganization.addOrganizationButton')}
            </Button>
            <Button
              className='md:hidden! min-w-0! px-2!'
              variant='contained'
              color='primary'
              component={Link}
              href='/organization/create'
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
          onMultiDelete={handleMultiDelete}
          initialFilters={initialFilters}
          initialSort={{ orderBy: language === 'th' ? 'name' : 'nameEn', order: SortType.ASC }}
        />
      </div>
    </div>
  )
}

export default OrganizationPage
