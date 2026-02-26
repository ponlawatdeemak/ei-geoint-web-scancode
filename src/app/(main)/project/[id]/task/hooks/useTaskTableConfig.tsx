import { useCallback, useMemo } from 'react'
import { Chip, IconButton, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Language, Roles, TaskStatus, ServiceConfig, RootModelConfig } from '@interfaces/config'
import type { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import type { FilterFieldConfig, SelectOption } from '@/components/layout/SearchWrapper'
import { formatDateTime } from '@/utils/formatDate'
import service from '@/api'
import EditIcon from '@mui/icons-material/Edit'
import PublicIcon from '@mui/icons-material/Public'
import DeleteIcon from '@mui/icons-material/Delete'
import type { UserProfile } from '@/hook/useProfileStore'
import type { Task } from '@interfaces/entities'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

const fetchRootModels = async () => {
  return (await service.lookup.getModelAll()).filter((m) => !m.parentModelId && m.serviceId !== 3)
}

const getFilteredModels = (models: SelectOption[], serviceId?: number) => {
  if (!serviceId) return models
  if (serviceId === ServiceConfig.optical) {
    return models.filter((m) =>
      [RootModelConfig.objectDetection, RootModelConfig.changeDetection].includes(Number(m.id)),
    )
  }
  if (serviceId === ServiceConfig.sar) {
    return models.filter((m) =>
      [RootModelConfig.sarBattleDamage, RootModelConfig.sarChangeDetection].includes(Number(m.id)),
    )
  }
  return models
}

const statusColor: Record<number, 'primary' | 'warning' | 'success' | 'error'> = {
  1: 'primary',
  2: 'warning',
  3: 'success',
  4: 'error',
}

interface UseTaskTableConfigProps {
  language: Language
  profile: UserProfile
  projectId: string | undefined
  router: AppRouterInstance
  canManageTask: boolean
  selectedServiceId: string
  setSelectedServiceId: (id: string) => void
}

export const useTaskTableConfig = ({
  language,
  profile,
  projectId,
  router,
  canManageTask,
  selectedServiceId,
  setSelectedServiceId,
}: UseTaskTableConfigProps) => {
  const { t } = useTranslation('common')

  const renderLocalizedName = useCallback(
    (item: { name?: string; nameEn?: string } | undefined | null) => {
      if (!item) return null
      return language === Language.TH ? item.name : item.nameEn
    },
    [language],
  )

  const renderFeature = useCallback(
    (row: Task) => row.taskModels?.map((tm) => renderLocalizedName(tm.model)).join(', '),
    [renderLocalizedName],
  )

  const renderStatus = useCallback(
    (row: Task) => {
      if (!row.status) return null
      return (
        <Chip
          className='text-white!'
          label={renderLocalizedName(row.status)}
          color={statusColor[Number(row.status.id)]}
          size='small'
        />
      )
    },
    [renderLocalizedName],
  )

  const renderActions = useCallback(
    (
      row: Task,
      {
        rowKey,
        removeKeysFromSelection,
        onEdit,
        onDelete,
      }: {
        rowKey: (row: Task) => string | number
        removeKeysFromSelection: (keys: (string | number)[]) => void
        onEdit?: (row: Task) => void
        onDelete?: (row: Task, onComplete?: () => void) => void
      },
    ) => {
      const canUserModify = canManageTask || (profile.roleId === Roles.user && row.createdByUser?.id === profile.id)

      const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        onEdit?.(row)
      }

      const handleViewOnMap = (e: React.MouseEvent) => {
        e.stopPropagation()
        router.push(`/project/${projectId}/task/${row.id}/map`)
      }

      const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        const keyToRemove = rowKey(row)
        onDelete?.(row, () => {
          removeKeysFromSelection([keyToRemove])
        })
      }

      return (
        <>
          {onEdit && canUserModify && (
            <Tooltip title={t('button.edit')} arrow>
              <IconButton onClick={handleEdit} color='primary' size='small'>
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('button.viewOnMap')} arrow>
            <IconButton onClick={handleViewOnMap} color='primary' size='small'>
              <PublicIcon />
            </IconButton>
          </Tooltip>
          {onDelete && canUserModify && (
            <Tooltip title={t('button.delete')} arrow>
              <IconButton onClick={handleDelete} color='error' size='small'>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </>
      )
    },
    [canManageTask, profile, projectId, router, t],
  )

  const columns: MuiTableColumn<Task>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('form.searchTask.column.name'),
        className: 'min-w-60',
        sortable: true,
        render: (row: Task) => row.name || '-',
      },
      {
        id: 'service',
        label: t('form.searchTask.column.service'),
        className: 'min-w-60',
        render: (row: Task) => renderLocalizedName(row.service),
      },
      {
        id: 'rootModel',
        label: t('form.searchTask.column.rootModel'),
        className: 'min-w-60',
        render: (row: Task) => renderLocalizedName(row.rootModel),
      },
      {
        id: 'feature',
        label: t('form.searchTask.column.feature'),
        className: 'min-w-60',
        render: renderFeature,
      },
      {
        id: 'status',
        label: t('form.searchTask.column.status'),
        className: 'min-w-40',
        render: renderStatus,
      },
      {
        id: 'createdAt',
        label: t('form.searchTask.column.createdAt'),
        className: 'min-w-40',
        sortable: true,
        render: (row: Task) => (row.createdAt ? formatDateTime(row.createdAt, language) : ''),
      },
      {
        id: 'createdBy',
        label: t('form.searchTask.column.createdBy'),
        className: 'min-w-60',
        render: (row: Task) => [row.createdByUser?.firstName, row.createdByUser?.lastName].filter(Boolean).join(' '),
      },
      {
        id: 'actions',
        label: t('table.actions'),
        className: 'min-w-40',
        align: 'center',
        render: renderActions,
      },
    ],
    [t, language, renderLocalizedName, renderFeature, renderStatus, renderActions],
  )

  const handleServiceChange = useCallback(
    async (
      value: unknown,
      filters: Record<string, string>,
      helpers: { setSelectOptions: (value: unknown) => void; setSelectLoading: (value: unknown) => void },
    ) => {
      let newModels: SelectOption[] = []
      const allModels = await fetchRootModels()

      if (value) {
        const serviceId = Number(value)
        newModels = getFilteredModels(allModels, serviceId)
      } else {
        newModels = allModels
      }

      const updateOptions = helpers.setSelectOptions as (
        fn: (prev: Record<string, SelectOption[]>) => Record<string, SelectOption[]>,
      ) => void
      updateOptions((prev) => ({
        ...prev,
        rootModelId: newModels,
      }))

      setSelectedServiceId(value ? String(value) : '')
      return { ...filters, rootModelId: '' }
    },
    [setSelectedServiceId],
  )

  const filtersConfig: FilterFieldConfig[] = useMemo(() => {
    const minWidth = 'min-w-55! 2k:min-w-60!'
    return [
      {
        name: 'keyword',
        label: '',
        type: 'text',
        placeholder: 'form.searchTask.filter.keywordPlaceholder',
        isPrimary: true,
        autocompleteOptions: [
          { label: t('form.searchTask.option.name'), value: 'name:' },
          { label: t('form.searchTask.option.createdBy'), value: 'creator:' },
        ],
        className: minWidth,
      },
      {
        name: 'serviceId',
        label: 'form.searchTask.filter.service',
        type: 'select',
        options: async () => (await service.lookup.get({ name: 'services' })).filter((s: SelectOption) => s.id !== 3),
        onChange: handleServiceChange,
        className: minWidth,
      },
      {
        name: 'rootModelId',
        label: 'form.searchTask.filter.rootModel',
        type: 'select',
        options: fetchRootModels,
        disabled: !selectedServiceId,
        className: minWidth,
      },
      {
        name: 'statusId',
        label: 'form.searchTask.filter.status',
        type: 'select',
        options: async () =>
          (await service.lookup.get({ name: 'task_status' })).filter(
            (ts: SelectOption) => ts.id !== TaskStatus.waitingForResults,
          ),
        className: minWidth,
      },
    ]
  }, [selectedServiceId, t, handleServiceChange])

  return { columns, filtersConfig }
}
