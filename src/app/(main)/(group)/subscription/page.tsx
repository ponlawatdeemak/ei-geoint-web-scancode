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
import { Button, IconButton, Tooltip } from '@mui/material'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import NavigationBar from '@/components/layout/NavigationBar'

const initialFilters = {
  keyword: '',
  organizationId: '',
}

const SubscriptionPage = () => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [searchTrigger, setSearchTrigger] = useState<number>(0) // force re-search

  const columns: MuiTableColumn<any>[] = [
    {
      id: 'name',
      label: t('form.searchSubscription.column.name'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => (language === 'th' ? row.name : row.nameEn),
    },
    {
      id: 'organizationsCount',
      label: t('form.searchSubscription.column.organizationsCount'),
      className: 'min-w-60',
      align: 'right',
      render: (row) => row.organizationSubscriptions.length,
    },
    {
      id: 'createdBy',
      label: t('form.searchSubscription.column.createdBy'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => [row.createdByUser.firstName, row.createdByUser.lastName].filter(Boolean).join(' '),
    },
    {
      id: 'createdAt',
      label: t('form.searchSubscription.column.createdAt'),
      className: 'min-w-40',
      sortable: true,
      render: (row) => (row.createdAt ? formatDateTime(row.createdAt, language) : ''),
    },
    {
      id: 'actions',
      label: t('table.actions'),
      align: 'center',
      className: 'min-w-32',
      render: (row, { onEdit, onDelete }) => {
        const isDeleteDisabled = row.organizationSubscriptions && row.organizationSubscriptions.length > 0
        return (
          <>
            {onEdit && (
              <Tooltip title={t('button.edit')} arrow>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(row)
                  }}
                  color='primary'
                  size='small'
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && !isDeleteDisabled && (
              <Tooltip title={t('button.delete')} arrow>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(row)
                  }}
                  color='error'
                  size='small'
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </>
        )
      },
    },
  ]

  const filtersConfig: FilterFieldConfig[] = [
    {
      name: 'name',
      label: '',
      type: 'text',
      placeholder: 'form.searchSubscription.filter.keywordPlaceholder',
      isPrimary: true,
    },
    {
      name: 'organizationId',
      label: 'form.searchSubscription.filter.organization',
      type: 'select',
      minWidth: 120,
      options: async () => await service.organizations.getItem(),
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
      const { data, total } = await service.subscriptions.search({
        name: filters.name,
        organizationId: filters.organizationId,
        offset: page! * rowsPerPage!,
        limit: rowsPerPage!,
        sortField: language === 'en' && sortState!.orderBy === 'name' ? 'nameEn' : sortState!.orderBy,
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
            await service.subscriptions.delete({ ids })
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
    router.push(`/subscription/${row.id}`)
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
        <NavigationBar items={[{ label: 'navigation.manageSubscription' }]}>
          <div className='flex flex-1'>
            <div className='hidden flex-1 md:block' />
            <Button
              className='hidden! md:flex!'
              variant='contained'
              color='primary'
              startIcon={<AddIcon />}
              component={Link}
              href='/subscription/create'
            >
              {t('form.searchSubscription.addSubscriptionButton')}
            </Button>
            <Button
              className='md:hidden! min-w-0! px-2!'
              variant='contained'
              color='primary'
              component={Link}
              href='/subscription/create'
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
          onDelete={handleDelete}
          onMultiDelete={handleMultiDelete}
          initialFilters={initialFilters}
          initialSort={{ orderBy: language === 'th' ? 'name' : 'nameEn', order: SortType.ASC }}
          isRowSelectable={(row) => !row.organizationSubscriptions || row.organizationSubscriptions.length === 0}
        />
      </div>
    </div>
  )
}

export default SubscriptionPage
