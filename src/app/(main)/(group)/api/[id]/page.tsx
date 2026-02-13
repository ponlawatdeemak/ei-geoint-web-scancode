'use client'

import NavigationBar from '@/components/layout/NavigationBar'
import { SortType } from '@interfaces/config'
import { Roles } from '@interfaces/config'
import MuiTableHOC, { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { useSettings } from '@/hook/useSettings'
import { useProfileStore } from '@/hook/useProfileStore'
import service from '@/api'
import { formatDateTime } from '@/utils/formatDate'
import { Chip, IconButton, Tooltip, Button, Switch } from '@mui/material'
import { Visibility, VisibilityOff, ContentCopy, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { OrganizationApiDtoOut, OrgApiKeyItem } from '@interfaces/dto/organization-api-key'
import { Organization } from '@interfaces/entities'

const ApiKeyPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const [id, setId] = useState<string>('')
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [sortState, setSortState] = useState({ orderBy: 'createdAt', order: SortType.DESC })
  const [rows, setRows] = useState<OrgApiKeyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
  const [apiEnabled, setApiEnabled] = useState(true)
  const [hasAnyActiveApiKey, setHasAnyActiveApiKey] = useState(false)
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { profile } = useProfileStore()
  const { showAlert } = useGlobalUI()

  useEffect(() => {
    params.then(({ id: paramId }) => setId(paramId))
  }, [params])

  const checkActiveApiKeys = useCallback(async () => {
    if (!id) return
    try {
      const { data } = await service.apiKeys.get({
        orgId: id,
        offset: 0,
        limit: 1,
        sortField: 'createdAt',
        sortOrder: SortType.DESC,
      })
      setHasAnyActiveApiKey(data.some((row: OrgApiKeyItem) => row.isActive))
    } catch (error) {
      console.error('Error checking active API keys:', error)
    }
  }, [id])

  // Load organization data
  useEffect(() => {
    const loadOrganization = async () => {
      if (id) {
        try {
          const orgData = await service.organizations.get(id)
          setOrganization(orgData)
          setApiEnabled(orgData.isApiSharingEnabled)
        } catch (error) {
          console.error('Error loading organization:', error)
        }
      }
    }
    loadOrganization()
  }, [id])

  // Load data function
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, total } = await service.apiKeys.get({
        orgId: id,
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        sortField: sortState.orderBy,
        sortOrder: sortState.order,
      })
      setRows(data)
      setTotalRows(total)
    } catch (error) {
      console.error('Error loading API keys:', error)
    } finally {
      setLoading(false)
    }
  }, [sortState, id, page, rowsPerPage])

  // Load initial data
  useEffect(() => {
    if (id) {
      loadData()
      checkActiveApiKeys()
    }
  }, [loadData, id, checkActiveApiKeys])

  const columns: MuiTableColumn<any>[] = [
    {
      id: 'apiKey',
      label: t('form.searchApiKey.column.apiKey'),
      className: 'w-30',
      sortable: true,
      render: (row) => (
        <div className='flex items-center gap-2'>
          <span className='font-mono text-sm'>
            {showKeys[row.id] ? row.apiKey : '••••••••••••••••••••••••••••••••••••••'}
          </span>
        </div>
      ),
    },
    {
      id: 'keyManagement',
      label: '',
      className: 'min-w-30 ',
      align: 'left',
      render: (row) => (
        <div>
          <Tooltip title={showKeys[row.id] ? t('form.searchApiKey.hideKey') : t('form.searchApiKey.showKey')} arrow>
            <IconButton size='small' color='primary' onClick={() => handleToggleShowKey(row.id)}>
              {showKeys[row.id] ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('form.searchApiKey.copyKey')} arrow>
            <IconButton size='small' color='primary' onClick={() => handleCopyApiKey(row.apiKey)}>
              <ContentCopy />
            </IconButton>
          </Tooltip>
        </div>
      ),
    },
    {
      id: 'isActive',
      label: t('form.searchApiKey.column.status'),
      className: 'min-w-40',
      align: 'center',
      sortable: true,
      render: (row) => (
        <Chip
          className={row.isActive ? undefined : 'bg-(--color-action-disabled)! text-white!'}
          label={row.isActive ? t('form.searchApiKey.status.active') : t('form.searchApiKey.status.inactive')}
          color={row.isActive ? 'success' : undefined}
          size='small'
        />
      ),
    },
    {
      id: 'createdAt',
      label: t('form.searchApiKey.column.createdAt'),
      className: 'min-w-40',
      sortable: true,
      render: (row) => (row.createdAt ? formatDateTime(row.createdAt, language) : '-'),
    },
    {
      id: 'deactivatedAt',
      label: t('form.searchApiKey.column.deactivatedAt'),
      className: 'min-w-40',
      sortable: true,
      render: (row) => (row.deactivatedAt ? formatDateTime(row.deactivatedAt, language) : '-'),
    },
    {
      id: 'management',
      label: t('table.actions'),
      className: 'min-w-40',
      align: 'center',
      render: (row) => (
        <div>
          {!row.deactivatedAt && canManageApi && (
            <Tooltip title={t('button.delete')} arrow>
              <IconButton size='small' onClick={() => handleDelete(row)} color='error'>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </div>
      ),
    },
  ]

  const handleToggleShowKey = useCallback((keyId: string) => {
    setShowKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }))
  }, [])

  const handleCopyApiKey = useCallback((apiKey: string) => {
    navigator.clipboard.writeText(apiKey)
  }, [])

  const handleToggleApi = useCallback(
    async (enabled: boolean) => {
      if (!id) return

      setLoading(true)
      try {
        if (enabled) {
          await service.apiKeys.activate({ orgId: id })
          await loadData()
          showAlert({
            status: 'success',
            title: t('form.searchApiKey.activateSuccess'),
          })
        } else {
          await service.apiKeys.revoke({ orgId: id })
          showAlert({
            status: 'success',
            title: t('form.searchApiKey.revokeSuccess'),
          })
        }

        setApiEnabled(enabled)
        loadData()
        checkActiveApiKeys()
      } catch (err: any) {
        setApiEnabled(!enabled)
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        setLoading(false)
      }
    },
    [id, showAlert, t, loadData, checkActiveApiKeys],
  )

  const handleCreateApiKey = useCallback(() => {
    showAlert({
      status: 'confirm-save',
      title: t('form.searchApiKey.create.title'),
      content: t('form.searchApiKey.create.confirmContent'),
      showCancel: true,
      onConfirm: async () => {
        setLoading(true)
        try {
          await service.apiKeys.create({ orgId: id })
          showAlert({
            status: 'success',
            title: t('form.searchApiKey.create.successTitle'),
          })
          loadData() // Refresh the table
          checkActiveApiKeys() // Refresh active key check
        } catch (err: any) {
          showAlert({
            status: 'error',
            errorCode: err?.message,
          })
        } finally {
          setLoading(false)
        }
      },
    })
  }, [id, t, loadData, showAlert, checkActiveApiKeys])

  const handleSortChange = useCallback(
    (orderBy: string, order: SortType) => {
      setSortState({ orderBy, order })
      setPage(0) // Reset to first page when sorting changes
      // Reload data with new sort
      loadData()
    },
    [loadData],
  )

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage)
    setPage(0) // Reset to first page when page size changes
  }, [])

  const handleDelete = useCallback(
    (row: OrgApiKeyItem) => {
      showAlert({
        status: 'confirm-save',
        title: t('form.searchApiKey.delete.title'),
        content: t('form.searchApiKey.delete.confirmContent'),
        showCancel: true,
        onConfirm: async () => {
          setLoading(true)
          try {
            await service.apiKeys.update({ apiKeyId: row.id })
            showAlert({
              status: 'success',
              title: t('form.searchApiKey.delete.successTitle'),
            })
            loadData() // Refresh the table
            checkActiveApiKeys() // Refresh active key check
          } catch (err: any) {
            showAlert({
              status: 'error',
              errorCode: err?.message,
            })
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [showAlert, t, loadData, checkActiveApiKeys],
  )

  const getOrganizationName = () => {
    if (!organization) return ''
    return language === 'th' ? organization.name : organization.nameEn
  }

  const canManageApi = useMemo(() => {
    return profile?.roleId === Roles.superAdmin || profile?.roleId === Roles.admin
  }, [profile?.roleId])

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar
          items={[
            { label: 'navigation.manageApiKey', href: '/api' },
            { label: id === 'create' ? 'navigation.addApiKey' : 'navigation.editApiKey' },
          ]}
        />
      </div>
      <div className='flex h-full w-full flex-col bg-(--color-background-default)'>
        {/* Main components */}
        <div className='m-4 flex h-full min-h-0 flex-col rounded-2xl bg-white'>
          <div className='flex justify-center py-4'>
            <div className='flex items-center justify-center'>
              <div className='text-center font-bold text-(--color-text-primary) text-2xl'>
                {t('form.searchApiKey.manageApiKey')} {getOrganizationName()}
              </div>
            </div>
          </div>
          <div className='flex justify-between px-4 pb-4'>
            <div className='flex items-center gap-2'>
              <Switch
                checked={apiEnabled}
                onChange={(e) => handleToggleApi(e.target.checked)}
                disabled={loading || !canManageApi}
              />
              <span className='font-medium text-sm'>{t('form.searchApiKey.toggleButton')}</span>
            </div>
            <div className='flex gap-2'>
              {!hasAnyActiveApiKey && canManageApi && apiEnabled && (
                <Button
                  className='hidden! md:flex!'
                  variant='contained'
                  color='primary'
                  startIcon={<AddIcon />}
                  onClick={handleCreateApiKey}
                  disabled={loading}
                >
                  {t('form.searchApiKey.addApiKeyButton')}
                </Button>
              )}
            </div>
          </div>
          <div className='flex-1 overflow-hidden'>
            <MuiTableHOC
              columns={columns}
              rows={rows}
              rowKey={(row: OrgApiKeyItem) => row.id}
              page={page}
              rowsPerPage={rowsPerPage}
              totalRows={totalRows}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              sortState={sortState}
              onSortChange={handleSortChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
export default ApiKeyPage
