'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useProfileStore } from '@/hook/useProfileStore'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import service from '@/api'
import { Roles, SortType, SearchTasksDataManagementDtoOut } from '@interfaces/index'
import { bytesToTB } from '@/utils/convert'
import { formatDate } from '@/utils/formatDate'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import MuiTableHOC, { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import Empty from '@/components/common/empty'

interface TaskStorageDialogProps {
  open: boolean
  onClose: () => void
  projectId?: string
  name?: string
  organizationId?: string
}

type TaskItem = SearchTasksDataManagementDtoOut['data'][number]

const TaskStorageDialog = ({ open, onClose, projectId, name, organizationId }: TaskStorageDialogProps) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortState, setSortState] = useState<{ orderBy: string; order: SortType }>({
    orderBy: 'total',
    order: SortType.DESC,
  })
  const [currentToken, setCurrentToken] = useState<number | null>(null)

  const isAdminOrSuperAdmin = useMemo(() => {
    return profile && [Roles.superAdmin, Roles.admin].includes(profile.roleId)
  }, [profile])

  const {
    data: tasksData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['data-management-tasks', projectId, rowsPerPage, sortState, currentToken],
    queryFn: () =>
      service.dataManagement.searchTasks({
        projectId: projectId ?? '',
        organizationId: organizationId ?? '',
        limit: rowsPerPage,
        sortOrder: sortState.order,
        token: currentToken?.toString() ?? undefined,
      }),
    enabled: open && !!projectId && !!profile,
  })

  const isPageLoading = isLoading || isFetching

  useEffect(() => {
    if (isPageLoading) {
      showLoading()
    } else {
      hideLoading()
    }
  }, [isPageLoading, showLoading, hideLoading])

  const nextToken = tasksData?.nextToken ? Number(tasksData.nextToken) : null
  const prevToken = tasksData?.prevToken ? Number(tasksData.prevToken) : null

  const columns: MuiTableColumn<TaskItem>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('dataManagement.taskName'),
        sortable: false,
        render: (row) => row.name,
      },
      {
        id: 'createdByUser',
        label: t('dataManagement.createdBy'),
        sortable: false,
        render: (row) => (row.createdByUser ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}` : '-'),
      },
      {
        id: 'createdAt',
        label: t('dataManagement.createdAt'),
        sortable: false,
        render: (row) => (row.createdAt ? formatDate(row.createdAt, language) : '-'),
      },
      {
        id: 'service',
        label: t('dataManagement.taskType'),
        sortable: false,
        render: (row) => (language === 'th' ? row.service?.name : row.service?.nameEn) || '-',
      },
      {
        id: 'rootModel',
        label: t('dataManagement.taskModel'),
        sortable: false,
        render: (row) => (language === 'th' ? row.rootModel?.name : row.rootModel?.nameEn) || '-',
      },
      {
        id: 'taskModels',
        label: t('dataManagement.taskProperties'),
        sortable: false,
        render: (row) =>
          row.taskModels?.map((tm) => (language === 'th' ? tm.model?.name : tm.model?.nameEn)).join(', ') || '-',
      },
      {
        id: 'total',
        label: t('dataManagement.size'),
        align: 'right',
        sortable: true,
        render: (row) => (row.total !== null ? bytesToTB(row.total) : '-'),
      },
    ],
    [t, language],
  )

  const handlePageChange = (newPage: number) => {
    if (newPage > page && nextToken) {
      // Next page
      setCurrentToken(nextToken)
      setPage(newPage)
    } else if (newPage < page && prevToken !== null) {
      // Previous page
      setCurrentToken(prevToken)
      setPage(newPage)
    } else if (newPage < page && newPage === 0) {
      // Back to first page
      setCurrentToken(null)
      setPage(0)
    }
  }

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage)
    setPage(0)
    setCurrentToken(null)
  }

  const handleSortChange = (orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
    setPage(0)
    setCurrentToken(null)
  }

  const handleClose = () => {
    setPage(0)
    setCurrentToken(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='xl' fullWidth>
      <DialogTitle>{name}</DialogTitle>
      <DialogContent className='h-[500px]'>
        {(tasksData?.data ?? []).length === 0 ? (
          isPageLoading ? null : (
            <Empty message={t('table.noData')} className='h-full' />
          )
        ) : (
          <MuiTableHOC
            columns={columns}
            rows={tasksData?.data ?? []}
            rowKey={(row) => row.id}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={tasksData?.total ?? 0}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            sortState={sortState}
            onSortChange={handleSortChange}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} sx={{ color: '#185A9D' }}>
          {t('button.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TaskStorageDialog
