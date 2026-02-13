'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UsedStorageProjectItem } from '@/api/data-management'
import { bytesToTB } from '@/utils/convert'
import { SortType } from '@interfaces/index'
import { IconButton } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import MuiTableHOC, { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import Empty from '@/components/common/empty'
import Dialog from './modal/TaskStorageDialog'

interface ProjectStorageTableProps {
  data: UsedStorageProjectItem[]
  total: number
  page: number
  rowsPerPage: number
  sortState: { orderBy: string; order: SortType }
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
  onSortChange: (orderBy: string, order: SortType) => void
  organizationId?: string
  isLoading?: boolean
}

const ProjectStorageTable = ({
  data,
  total,
  page,
  rowsPerPage,
  sortState,
  onPageChange,
  onRowsPerPageChange,
  onSortChange,
  organizationId,
  isLoading = false,
}: ProjectStorageTableProps) => {
  const { t } = useTranslation('common')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
  const [selectedProjectName, setSelectedProjectName] = useState<string | undefined>()

  const handleOpenModal = useCallback((projectId: string, name?: string) => {
    setSelectedProjectId(projectId)
    setSelectedProjectName(name)
    setModalOpen(true)
  }, [])

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedProjectId(undefined)
    setSelectedProjectName(undefined)
  }

  const columns: MuiTableColumn<UsedStorageProjectItem>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('dataManagement.project'),
        className: 'min-w-200',
        sortable: false,
        render: (row) => row.name || '-',
      },
      {
        id: 'total',
        label: t('dataManagement.size'),
        align: 'right',
        sortable: true,
        render: (row) => bytesToTB(row.total),
      },
      {
        id: 'actions',
        label: t('dataManagement.details'),
        className: 'flex justify-end',
        render: (row) => (
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              handleOpenModal(row.id, row.name)
            }}
            color='primary'
            size='small'
            disabled={!row.name}
          >
            <MenuIcon />
          </IconButton>
        ),
      },
    ],
    [t, handleOpenModal],
  )

  return (
    <>
      <div className='rounded-lg bg-white'>
        {data.length === 0 ? (
          isLoading ? null : (
            <Empty message={t('table.noData')} className='py-10' />
          )
        ) : (
          <MuiTableHOC
            columns={columns}
            rows={data}
            rowKey={(row) => row.id}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={total}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            sortState={sortState}
            onSortChange={onSortChange}
          />
        )}
      </div>

      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        projectId={selectedProjectId}
        name={selectedProjectName}
        organizationId={organizationId}
      />
    </>
  )
}

export default ProjectStorageTable
