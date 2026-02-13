'use client'

import { useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useProfileStore } from '@/hook/useProfileStore'
import service from '@/api'
import SearchWrapper, { FilterFieldConfig } from '@/components/layout/SearchWrapper'
import { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { SortType } from '@interfaces/config'
import { formatDateTime } from '@/utils/formatDate'
import { Roles } from '@interfaces/index'
import { Button, Chip, IconButton, Tooltip } from '@mui/material'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import NavigationBar from '@/components/layout/NavigationBar'

const initialFilters = {
  keyword: '',
  organizationId: '',
  roleId: '',
  projectId: '',
  isActive: '',
}

const UserPage = () => {
  const router = useRouter()
  const profile = useProfileStore((state) => state.profile)!
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const [searchTrigger, setSearchTrigger] = useState<number>(0) // force re-search

  const columns: MuiTableColumn<any>[] = [
    {
      id: 'name',
      label: t('form.searchUser.column.name'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => [row.firstName, row.lastName].filter(Boolean).join(' '),
    },
    {
      id: 'email',
      label: t('form.searchUser.column.email'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => row.email,
    },
    {
      id: 'organization',
      label: t('form.searchUser.column.organization'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => {
        let organizationName = ''
        if (row.organization) {
          organizationName = language === 'th' ? row.organization.name : row.organization.nameEn
        }
        return organizationName
      },
    },
    {
      id: 'role',
      label: t('form.searchUser.column.role'),
      className: 'min-w-40',
      sortable: true,
      render: (row) => (
        <Chip label={language === 'th' ? row.role.name : row.role.nameEn} color='primary' size='small' />
      ),
    },
    {
      id: 'subscriptions',
      label: t('form.searchUser.column.subscriptions'),
      className: 'min-w-60',
      render: (row) => (
        <div className='flex gap-2'>
          {(row.userSubscriptions as any[])
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
      label: t('form.searchUser.column.status'),
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
      label: t('form.searchUser.column.createdAt'),
      className: 'min-w-40',
      sortable: true,
      render: (row) => (row.createdAt ? formatDateTime(row.createdAt, language) : ''),
    },
    {
      id: 'actions',
      label: t('table.actions'),
      className: 'min-w-32',
      render: (row, { removeKeysFromSelection }) => {
        const pRoleId = Number(profile.roleId)
        const fRoleId = Number(row.roleId)

        const isHigherRank = pRoleId < fRoleId
        const isThcomAdmin = pRoleId === Roles.admin && fRoleId === Roles.admin
        // Special case: THCOM Super Admin (1) can edit THCOM Super Admin (1) (Self-edit ONLY)
        const isSuperAdminSelf = pRoleId === Roles.superAdmin && fRoleId === Roles.superAdmin && profile.id === row.id

        const isSelf = profile.id === row.id
        const canEdit = isHigherRank || isThcomAdmin || isSuperAdminSelf
        const canDelete = (isHigherRank || isThcomAdmin) && !isSelf

        return (
          <>
            <Tooltip title={!canEdit ? t('button.viewDetails') : t('button.edit')} arrow>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(row)
                }}
                color='primary'
                size='small'
              >
                {!canEdit ? <VisibilityIcon /> : <EditIcon />}
              </IconButton>
            </Tooltip>
            {canDelete && (
              <Tooltip title={t('button.delete')} arrow>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation()
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
            )}
          </>
        )
      },
    },
  ]

  const filtersConfig: FilterFieldConfig[] = useMemo(
    () => [
      {
        name: 'keyword',
        label: '',
        type: 'text',
        placeholder: 'form.searchUser.filter.keywordPlaceholder',
        isPrimary: true,
      },
      {
        name: 'organizationId',
        label: 'form.searchUser.filter.organization',
        type: 'select',
        minWidth: 120,
        options: async () => await service.organizations.getItem(),
        onChange:
          profile.roleId <= 2
            ? async (value, filters, { setSelectOptions, setSelectLoading }) => {
                setSelectLoading((prev: any) => ({ ...prev, projectId: true }))
                const { data } = await service.projects.search(value ? { organizationId: value as string } : {})
                setSelectOptions((prev: any) => ({
                  ...prev,
                  projectId: data.map((item) => ({
                    id: item.id,
                    name: item.name,
                  })),
                }))
                setSelectLoading((prev: any) => ({ ...prev, projectId: false }))
                return { ...filters, projectId: '' }
              }
            : undefined,
        disabled: profile.roleId > 2,
      },
      {
        name: 'roleId',
        label: 'form.searchUser.filter.role',
        type: 'select',
        minWidth: 100,
        options: async () => (await service.lookup.get({ name: 'roles' })).filter((role) => role.id >= profile.roleId),
      },
      {
        name: 'projectId',
        label: 'form.searchUser.filter.project',
        type: 'select',
        minWidth: 100,
        options: async () => {
          const { data } = await service.projects.search({
            organizationId: profile.roleId > 2 ? profile.organizationId : undefined,
          })
          return data.map((item) => ({
            id: item.id,
            name: item.name,
          }))
        },
      },
      {
        name: 'isActive',
        label: 'form.searchUser.filter.status',
        type: 'select',
        minWidth: 100,
        options: [
          { id: 'true', name: 'เปิดใช้งาน', nameEn: 'Active' },
          { id: 'false', name: 'ปิดใช้งาน', nameEn: 'Inactive' },
        ],
      },
    ],
    [profile],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: force re-search
  const onSearch = useCallback(
    async (
      filters: Record<string, string>,
      page?: number,
      rowsPerPage?: number,
      sortState?: { orderBy: string; order: SortType },
    ): Promise<{ rows: any[]; totalRows: number }> => {
      const { data, total } = await service.users.search({
        keyword: filters.keyword,
        organizationId: filters.organizationId,
        roleId: filters.roleId ? Number(filters.roleId) : undefined,
        projectId: filters.projectId,
        isActive: filters.isActive ? filters.isActive === 'true' : undefined,
        offset: page! * rowsPerPage!,
        limit: rowsPerPage!,
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

  const onClear = async ({
    setSelectOptions,
    setSelectLoading,
  }: {
    setSelectOptions: (value: unknown) => void
    setSelectLoading: (value: unknown) => void
  }) => {
    setSelectLoading((prev: any) => ({ ...prev, projectId: true }))
    const { data } = await service.projects.search()
    setSelectOptions((prev: any) => ({
      ...prev,
      projectId: data.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    }))
    setSelectLoading((prev: any) => ({ ...prev, projectId: false }))
  }

  const deleteMany = useCallback(
    (ids: string[], onComplete?: () => void) => {
      showAlert({
        status: 'confirm-delete',
        showCancel: true,
        onConfirm: async () => {
          showLoading()
          try {
            await service.users.delete({ ids })
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
    router.push(`/user/${row.id}`)
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
        <NavigationBar items={[{ label: 'navigation.manageUser' }]}>
          {profile.roleId < 5 && (
            <div className='flex flex-1'>
              <div className='hidden flex-1 md:block' />
              <Button
                className='hidden! md:flex!'
                variant='contained'
                color='primary'
                startIcon={<AddIcon />}
                component={Link}
                href='/user/create'
              >
                {t('form.searchUser.addUserButton')}
              </Button>
              <Button
                className='md:hidden! min-w-0! px-2!'
                variant='contained'
                color='primary'
                component={Link}
                href='/user/create'
              >
                <AddIcon />
              </Button>
            </div>
          )}
        </NavigationBar>
      </div>
      <div className='min-h-0 flex-1'>
        <SearchWrapper
          columns={columns}
          filtersConfig={filtersConfig}
          onSearch={onSearch}
          onClear={profile.roleId <= 2 ? onClear : undefined}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMultiDelete={handleMultiDelete}
          initialFilters={{ ...initialFilters, organizationId: profile.roleId > 2 ? profile.organizationId : '' }}
          initialSort={{ orderBy: 'name', order: SortType.ASC }}
          isRowSelectable={(row) => {
            const pRoleId = Number(profile.roleId)
            const fRoleId = Number(row.roleId)

            const isHigherRank = pRoleId < fRoleId
            const isThcomAdmin = pRoleId === Roles.admin && fRoleId === Roles.admin

            return isHigherRank || isThcomAdmin
          }}
        />
      </div>
    </div>
  )
}

export default UserPage
