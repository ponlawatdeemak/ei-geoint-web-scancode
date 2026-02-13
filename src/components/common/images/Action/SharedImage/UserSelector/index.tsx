import { Dispatch, FC, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react'
import InboxIcon from '@mui/icons-material/Inbox'
import MuiTableHOC, { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { InputLabel, Button, Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import { useSettings } from '@/hook/useSettings'
import { SortType } from '@interfaces/config'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import PickerDialog from '@/components/dialog/PickerDialog'
import { FilterFieldConfig } from '@/components/layout/SearchWrapper'
import service from '@/api'
import { useProfileStore } from '@/hook/useProfileStore'

type Props = {
  orgId: string
  setLoading: (loading: boolean) => void
  value: string[]
  onChange: Dispatch<SetStateAction<string[]>>
}

const UserSelector: FC<Props> = ({ orgId, setLoading, value, onChange }) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const { language } = useSettings()
  const [sortState, setSortState] = useState<{ orderBy: string; order: SortType }>({ orderBy: '', order: SortType.ASC })
  const { showAlert } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)
  const { t } = useTranslation('common')

  const selectedUserIds = useMemo(() => value, [value])

  const userColumns: MuiTableColumn<any>[] = [
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
  ]

  const handleSortChange = (orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
  }

  const handleRemoveUser = (row: any) => {
    showAlert({
      status: 'confirm-delete',
      showCancel: true,
      onConfirm: () => {
        onChange((prev) => prev.filter((x) => x !== row.id))
      },
    })
  }

  const searchUserFiltersConfig: FilterFieldConfig[] = [
    {
      name: 'keyword',
      label: '',
      type: 'text',
      placeholder: 'form.searchUser.filter.keywordPlaceholder',
      isPrimary: true,
    },
    {
      name: 'roleId',
      label: 'form.searchUser.filter.role',
      type: 'select',
      minWidth: 100,
      options: async () => await service.lookup.get({ name: 'roles' }),
    },
  ]

  const userPickerOnSearch = useCallback(
    async (
      filters: Record<string, string>,
      page: number,
      rowsPerPage: number,
      sortState: { orderBy: string; order: SortType },
    ) => {
      const { data, total } = await service.users.search({
        keyword: filters.keyword,
        roleId: filters.roleId ? Number(filters.roleId) : undefined,
        organizationId: orgId,
        isActive: true,
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        sortField: sortState.orderBy,
        sortOrder: sortState.order,
      })
      return { rows: data, totalRows: total }
    },
    [orgId],
  )

  const fetchSelectedUsers = useCallback(async () => {
    if (selectedUserIds.length === 0) {
      setSelectedUsers([])
      return
    }
    setLoading(true)
    try {
      const { data } = await service.users.search({
        userIds: selectedUserIds,
        sortField: sortState.orderBy,
        sortOrder: sortState.order,
      })
      setSelectedUsers(data)
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }, [selectedUserIds, sortState, showAlert, setLoading])

  // biome-ignore lint/correctness/useExhaustiveDependencies: To fetch selected users on userId change only
  useEffect(() => {
    fetchSelectedUsers()
  }, [selectedUserIds, fetchSelectedUsers])

  return (
    <div className='grid grid-cols-1 gap-2'>
      <div className='flex items-center gap-2 pt-2'>
        <InputLabel>{t('form.projectForm.users')}</InputLabel>
        <div className='flex items-center gap-2'>
          <Button
            variant='contained'
            color='primary'
            startIcon={<AddIcon />}
            onClick={() => setPickerOpen(true)}
            disabled={!orgId}
          >
            {t('form.projectForm.addUserButton')}
          </Button>
        </div>
      </div>
      <div className='relative rounded-lg border border-(--color-divider) p-4'>
        {selectedUsers.length === 0 ? (
          <div className='m-auto flex flex-col items-center p-4 text-(--color-action-disabled)'>
            <InboxIcon className='mb-2 text-[80px]! opacity-(--opacity-disabled)' />
            {t('table.noData')}
          </div>
        ) : (
          <MuiTableHOC
            totalLabel='form.projectForm.totalProjectUser'
            columns={userColumns}
            rows={selectedUsers}
            rowKey={(row: any) => row.id}
            totalRows={selectedUsers.length}
            onDelete={handleRemoveUser}
            sortState={sortState}
            onSortChange={handleSortChange}
          />
        )}
      </div>
      <PickerDialog
        open={pickerOpen}
        title={t('form.projectForm.addUserButton')}
        columns={userColumns}
        filtersConfig={searchUserFiltersConfig}
        onSearch={userPickerOnSearch}
        onClose={() => setPickerOpen(false)}
        onConfirm={(rows) => {
          // merge new selections (avoid duplicates)
          onChange((prev) => {
            const existingIds = new Set(prev)
            const merged = [...prev]
            for (const r of rows) if (!existingIds.has(r.id)) merged.push(r.id)
            return merged
          })
          setPickerOpen(false)
        }}
        isRowSelectable={(row) => profile?.id !== row.id && !selectedUsers.some((u) => u.id === row.id)}
      />
    </div>
  )
}

export default UserSelector
