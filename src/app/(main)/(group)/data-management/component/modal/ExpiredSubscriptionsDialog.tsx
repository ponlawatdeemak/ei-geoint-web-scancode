'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useProfileStore } from '@/hook/useProfileStore'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import service from '@/api'
import { Roles, SortType, SearchSubscriptionExpireDataManagementItem } from '@interfaces/index'
import { formatDate } from '@/utils/formatDate'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import MuiTableHOC, { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import Empty from '@/components/common/empty'

interface ExpiredSubscriptionsDialogProps {
  open: boolean
  onClose: () => void
  organizationId?: string
}

const ExpiredSubscriptionsDialog = ({ open, onClose, organizationId }: ExpiredSubscriptionsDialogProps) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortState, setSortState] = useState<{ orderBy: string; order: SortType }>({
    orderBy: 'endAt',
    order: SortType.DESC,
  })

  const isAdminOrSuperAdmin = useMemo(() => {
    return profile && [Roles.superAdmin, Roles.admin].includes(profile.roleId)
  }, [profile])

  const {
    data: subscriptionData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['data-management-expired-subscriptions', organizationId, page, rowsPerPage, sortState],
    queryFn: () =>
      service.dataManagement.searchSubscriptionExpire({
        organizationId: isAdminOrSuperAdmin && organizationId ? organizationId : null,
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        sortField: sortState.orderBy,
        sortOrder: sortState.order,
      }),
    enabled: open && !!profile,
  })

  const isPageLoading = isLoading || isFetching

  useEffect(() => {
    if (isPageLoading) {
      showLoading()
    } else {
      hideLoading()
    }
  }, [isPageLoading, showLoading, hideLoading])

  const columns: MuiTableColumn<SearchSubscriptionExpireDataManagementItem>[] = useMemo(
    () => [
      {
        id: language === 'th' ? 'name' : 'nameEn',
        label: t('dataManagement.subscriptionName'),
        sortable: true,
        render: (row) => (language === 'th' ? row.name : row.nameEn),
      },
      {
        id: 'startAt',
        label: t('dataManagement.startDate'),
        align: 'center',
        sortable: true,
        render: (row) => formatDate(row.startAt, language),
      },
      {
        id: 'endAt',
        label: t('dataManagement.endDate'),
        align: 'center',
        sortable: true,
        render: (row) => formatDate(row.endAt, language),
      },
    ],
    [language, t],
  )

  const handleSortChange = (orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
    setPage(0)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xl' fullWidth>
      <DialogTitle>{t('dataManagement.expiredSubscriptions')}</DialogTitle>
      <DialogContent className='h-[500px]'>
        {(subscriptionData?.data ?? []).length === 0 ? (
          isPageLoading ? null : (
            <Empty message={t('table.noData')} className='h-full' />
          )
        ) : (
          <MuiTableHOC
            columns={columns}
            rows={subscriptionData?.data ?? []}
            rowKey={(row) => row.id}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={subscriptionData?.total ?? 0}
            onPageChange={setPage}
            onRowsPerPageChange={(rpp) => {
              setRowsPerPage(rpp)
              setPage(0)
            }}
            sortState={sortState}
            onSortChange={handleSortChange}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#185A9D' }}>
          {t('button.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ExpiredSubscriptionsDialog
