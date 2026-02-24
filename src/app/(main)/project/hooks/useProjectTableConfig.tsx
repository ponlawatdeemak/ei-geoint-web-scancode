import { useMemo } from 'react'
import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Language } from '@interfaces/config'
import type { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import type { FilterFieldConfig } from '@/components/layout/SearchWrapper'
import { ProjectActionButtons } from '../components/ProjectActionButtons'
import { formatDateTime } from '@/utils/formatDate'
import service from '@/api'
import { statusColor } from '../page'
import type { SearchProjectResultItem, GetLookupDtoOut } from '@interfaces/index'
import type { UserProfile } from '@/hook/useProfileStore'

interface UseProjectTableConfigProps {
  language: Language
  profile: UserProfile | null
  cacheTaskStatuses: GetLookupDtoOut[]
  onEdit: (row: SearchProjectResultItem) => void
  onDelete: (row: SearchProjectResultItem) => void
}

export const useProjectTableConfig = ({
  language,
  profile,
  cacheTaskStatuses,
  onEdit,
  onDelete,
}: UseProjectTableConfigProps) => {
  const { t } = useTranslation('common')

  const columns: MuiTableColumn<SearchProjectResultItem>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('form.searchProject.column.name'),
        className: 'min-w-60',
        sortable: true,
        render: (row) => row.name,
      },
      {
        id: 'task',
        label: t('form.searchProject.column.task'),
        className: 'min-w-60',
        align: 'right',
        render: (row) => row.tasks.length,
      },
      {
        id: 'status',
        label: t('form.searchProject.column.status'),
        className: 'min-w-40',
        sortable: true,
        render: (row) => {
          if (!row.status) {
            return null
          }
          return (
            <Chip
              className='text-white!'
              label={language === Language.TH ? row.status.name : row.status.nameEn}
              color={statusColor[Number(row.status.id)]}
              size='small'
            />
          )
        },
      },
      {
        id: 'createdAt',
        label: t('form.searchProject.column.createdAt'),
        className: 'min-w-40',
        sortable: true,
        render: (row) => (row.createdAt ? formatDateTime(row.createdAt, language) : ''),
      },
      {
        id: 'updatedAt',
        label: t('form.searchProject.column.updatedAt'),
        className: 'min-w-40',
        sortable: true,
        render: (row) => (row.updatedAt ? formatDateTime(row.updatedAt, language) : ''),
      },
      {
        id: 'createdBy',
        label: t('form.searchProject.column.createdBy'),
        className: 'min-w-60',
        sortable: true,
        render: (row) => [row.createdByUser?.firstName, row.createdByUser?.lastName].filter(Boolean).join(' '),
      },
      {
        id: 'actions',
        label: t('table.actions'),
        className: 'min-w-44',
        align: 'center',
        render: (row, { rowKey, removeKeysFromSelection }) => (
          <ProjectActionButtons
            row={row}
            profile={profile}
            onEdit={onEdit}
            onDelete={onDelete}
            removeKeysFromSelection={removeKeysFromSelection}
            rowKey={rowKey}
          />
        ),
      },
    ],
    [t, language, profile, onEdit, onDelete],
  )

  const filtersConfig: FilterFieldConfig[] = useMemo(
    () => [
      {
        name: 'keyword',
        label: '',
        type: 'text',
        placeholder: 'form.searchProject.filter.keywordPlaceholder',
        isPrimary: true,
        autocompleteOptions: [
          { label: t('form.searchProject.option.name'), value: 'name:' },
          { label: t('form.searchProject.option.description'), value: 'desc:' },
          { label: t('form.searchProject.option.status'), value: 'status:' },
          { label: t('form.searchProject.option.createdBy'), value: 'creator:' },
        ],
        autocompleteSubOptions: {
          'status:': cacheTaskStatuses.map((s) => ({
            label: language === Language.TH ? s.name : s.nameEn,
            value: language === Language.TH ? s.name : s.nameEn,
          })),
        },
      },
      {
        name: 'organizationId',
        label: 'form.searchProject.filter.organization',
        type: 'select',
        minWidth: 120,
        options: async () => await service.organizations.getItem(),
        disabled: (profile?.roleId ?? 99) > 2,
      },
      {
        name: 'subscriptionId',
        label: 'form.searchProject.filter.subscription',
        type: 'select',
        minWidth: 120,
        options: async () =>
          profile?.organizationId ? await service.subscriptions.getItemByOrg(profile.organizationId) : [],
      },
      {
        name: 'createdAt',
        label: 'form.searchProject.filter.createdAtRange',
        type: 'dateRange',
        minWidth: 220,
      },
    ],
    [profile?.organizationId, profile?.roleId, t, cacheTaskStatuses, language],
  )

  return { columns, filtersConfig }
}
