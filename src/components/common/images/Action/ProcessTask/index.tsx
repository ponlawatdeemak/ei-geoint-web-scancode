import service from '@/api'
import MuiTableHOC, { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { useSettings } from '@/hook/useSettings'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { formatDateTime } from '@/utils/formatDate'
import { SortType } from '@interfaces/config'
import { GetImagesProcessedDtoOut } from '@interfaces/dto/images'
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { feature } from '@turf/turf'
import { FC, memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  visible: boolean
  setVisible: (visible: boolean) => void
  imageId: string | null
  fileName: string | null
}

const ProcessTask: FC<Props> = ({ visible, setVisible, imageId, fileName }) => {
  const { t } = useTranslation('common')
  const { showLoading, hideLoading } = useGlobalUI()
  const { language } = useSettings()

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rows, setRows] = useState<any[]>([])
  const [sortState, setSortState] = useState<{ orderBy: string; order: SortType }>({
    orderBy: 'createdAt',
    order: SortType.DESC,
  })

  const handleSortChange = (orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
  }

  const { data: processData, isFetching }: UseQueryResult<GetImagesProcessedDtoOut[] | undefined, Error> = useQuery({
    queryKey: ['get-process-task', imageId],
    queryFn: () => service.image.getProcessTask(imageId as string),
    enabled: !!imageId,
  })

  useEffect(() => {
    if (processData && processData.length > 0) {
      const rowData = processData.map((item) => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt,
        taskModels: item.taskModels,
        rootModel: item.rootModel,
        service: item.service,
        createdBy: item.createdByUser,
        feature: item.taskModels?.map((tm: any) => (language === 'th' ? tm.model.name : tm.model.nameEn)).join(', '),
        projectName: item.project?.name,
      }))
      const sortedData = rowData.sort((a: any, b: any) => {
        if (sortState.order === SortType.ASC) {
          return a[sortState.orderBy].localeCompare(b[sortState.orderBy])
        } else {
          return b[sortState.orderBy].localeCompare(a[sortState.orderBy])
        }
      })
      setRows(sortedData)
    }
  }, [processData, language, sortState])

  const handleClose = () => {
    setVisible(false)
  }

  const columns: MuiTableColumn<any>[] = [
    {
      id: 'service',
      label: t('gallery.action.processTask.column.service'),
      className: 'min-w-60',
      render: (row) => {
        if (!row.service) return null
        return language === 'th' ? row.service.name : row.service.nameEn
      },
    },
    {
      id: 'rootModel',
      label: t('gallery.action.processTask.column.rootModel'),
      className: 'min-w-60',
      render: (row) => {
        if (!row.rootModel) return null
        return language === 'th' ? row.rootModel.name : row.rootModel.nameEn
      },
    },
    {
      id: 'feature',
      label: t('gallery.action.processTask.column.feature'),
      className: 'min-w-60',
      render: (row: any) => {
        return row.taskModels.map((tm: any) => (language === 'th' ? tm.model.name : tm.model.nameEn)).join(', ')
      },
    },
    {
      id: 'createdAt',
      label: t('gallery.action.processTask.column.createdAt'),
      className: 'min-w-40',
      sortable: true,
      render: (row) => (row.createdAt ? formatDateTime(row.createdAt, language) : ''),
    },
    {
      id: 'createdBy',
      label: t('gallery.action.processTask.column.createdBy'),
      className: 'min-w-60',
      render: (row) => {
        return row.createdBy?.firstName && row.createdBy?.lastName
          ? `${row.createdBy?.firstName} ${row.createdBy?.lastName}`
          : row.createdBy?.firstName || row.createdBy?.lastName || '-'
      },
    },

    {
      id: 'name',
      label: t('gallery.action.processTask.column.name'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => row.name || '-',
    },
    {
      id: 'projectName',
      label: t('gallery.action.processTask.column.projectName'),
      className: 'min-w-60',
      sortable: true,
      render: (row) => row.projectName || '-',
    },
  ]

  return (
    <Dialog open={visible} maxWidth='xl' fullWidth>
      <DialogTitle>
        <div>{t('gallery.action.processTask.title')}</div>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fileName || ''}>
          {fileName || ''}
        </div>
      </DialogTitle>
      <DialogContent>
        <MuiTableHOC
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          page={page}
          rowsPerPage={rowsPerPage}
          totalRows={rows.length}
          sortState={sortState}
          onSortChange={handleSortChange}
        />
        {isFetching && (
          <div className='absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center backdrop-blur-sm'>
            <CircularProgress size={80} color='primary' />
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('button.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default memo(ProcessTask)
