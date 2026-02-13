'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import Image from 'next/image'
import service from '@/api'
import SearchWrapper, { DisplayMode, FilterFieldConfig, SelectOption } from '@/components/layout/SearchWrapper'
import { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import {
  ProjectMapViewPageLevel,
  Roles,
  SortType,
  TaskStatus,
  RootModelConfig,
  ServiceConfig,
  Language,
} from '@interfaces/config'
import { formatDateTime } from '@/utils/formatDate'
import {
  Button,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonBase,
  Divider,
} from '@mui/material'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'

import TableRowsIcon from '@mui/icons-material/TableRows'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import MapIcon from '@mui/icons-material/Map'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import PublicIcon from '@mui/icons-material/Public'
import DeleteIcon from '@mui/icons-material/Delete'
import ImageIcon from '@mui/icons-material/Image'
import { weeklyIcon as WeeklyIcon } from '@/icons'
import NavigationBar from '@/components/layout/NavigationBar'
import { useProfileStore } from '@/hook/useProfileStore'
import ProjectMapView, { ActiveView, ProjectMapViewRef } from '@/components/shared/ProjectMapView'
import { ItvLayer, Task } from '@interfaces/entities'
import { GetProjectDtoOut } from '@interfaces/dto/projects'
import { GetModelSubscriptionWeeklyDtoOut } from '@interfaces/dto/weekly'
import { GetTasksDtoOut, PostSearchLayersTasksDtoOut } from '@interfaces/index'

const statusColor: Record<number, 'primary' | 'warning' | 'success' | 'error'> = {
  1: 'primary',
  2: 'warning',
  3: 'success',
  4: 'error',
}

const initialFilters = {
  keyword: '',
  statusId: '',
  createdAtFrom: '',
  createdAtTo: '',
}

const fetchRootModels = async () => {
  return (await service.lookup.getModelAll()).filter((m) => !m.parentModelId && m.serviceId !== 3)
}

const getFilteredModels = (models: any[], serviceId?: number) => {
  if (!serviceId) return models
  if (serviceId === ServiceConfig.optical) {
    return models.filter((m) => [RootModelConfig.objectDetection, RootModelConfig.changeDetection].includes(m.id))
  }
  if (serviceId === ServiceConfig.sar) {
    return models.filter((m) => [RootModelConfig.sarBattleDamage, RootModelConfig.sarChangeDetection].includes(m.id))
  }
  return models
}

const parseKeywordParam = (keyword: string): Record<string, string> => {
  const result: Record<string, string> = {}
  if (!keyword) return result

  const colonIndex = keyword.indexOf(':')
  if (colonIndex > -1) {
    const prefix = keyword.slice(0, colonIndex).toLowerCase()
    const value = keyword.slice(colonIndex + 1).trim()

    if (prefix === 'name' || prefix === 'creator') {
      result[prefix] = value
    } else {
      result.name = keyword
    }
  } else {
    result.name = keyword
  }
  return result
}

const buildSearchParams = (
  projectId: string | undefined,
  filters: Record<string, string>,
  keyword: string,
  page?: number,
  rowsPerPage?: number,
  sortState?: { orderBy: string; order: SortType },
): Record<string, unknown> => {
  const params: Record<string, unknown> = {
    projectId: projectId,
    serviceId: filters.serviceId ? Number(filters.serviceId) : undefined,
    rootModelId: filters.rootModelId ? Number(filters.rootModelId) : undefined,
    statusId: filters.statusId ? Number(filters.statusId) : undefined,
  }

  Object.assign(params, parseKeywordParam(keyword))

  if (typeof page === 'number' && typeof rowsPerPage === 'number') {
    params.offset = page * rowsPerPage
    params.limit = rowsPerPage
  }

  if (sortState) {
    params.sortField = sortState.orderBy
    params.sortOrder = sortState.order
  }

  return params
}

export default function TaskSearchPage() {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showAlert, showLoading, hideLoading } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)!
  const [searchTrigger, setSearchTrigger] = useState<number>(0) // force re-search

  const params = useParams() as { id?: string }
  const projectId = params?.id

  const [project, setProject] = useState<GetProjectDtoOut | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [weeklySubscriptionModel, setWeeklySubscriptionModel] = useState<GetModelSubscriptionWeeklyDtoOut[]>([])

  const [featureLayers, setFeatureLayers] = useState<PostSearchLayersTasksDtoOut>({
    features: [],
    total: 0,
    returned: 0,
  })
  const [itvLayers, setItvLayers] = useState<ItvLayer[]>([])
  const [isLayerLoading, setIsLayerLoading] = useState(true)

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [menuRow, setMenuRow] = useState<any | null>(null)
  const MAP_ID = `project-${projectId}-map-view`
  const [loading, setLoading] = useState(false)
  const [topMenuAnchorEl, setTopMenuAnchorEl] = useState<HTMLElement | null>(null)
  const isTopMenuOpen = Boolean(topMenuAnchorEl)
  const projectMapViewRef = useRef<ProjectMapViewRef>(null)

  const handleTopMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTopMenuAnchorEl(event.currentTarget)
  }

  const handleTopMenuClose = () => {
    setTopMenuAnchorEl(null)
  }

  const [taskList, setTaskList] = useState<GetTasksDtoOut[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [isRefresh, setIsRefresh] = useState(false)
  const autoRefreshIntervalRef = useRef<number | null>(null)

  const [shouldOpenWeekly, setShouldOpenWeekly] = useState(false)

  // ensure project task status is checked once on first load before allowing searches
  const [isStatusChecked, setIsStatusChecked] = useState(false)

  const searchParams = useSearchParams()
  const pathname = usePathname()

  const canManageProject = useMemo(() => {
    if (!project) return false
    const isOwner = project.createdByUser?.id === profile.id
    return (
      [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
      (profile.roleId === Roles.user && isOwner)
    )
  }, [profile.roleId, project, profile.id])

  const canManageTask = useMemo(() => {
    if (!project) return false
    const isOwner = project.createdByUser?.id === profile.id
    return (
      [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
      (profile.roleId === Roles.user && isOwner)
    )
  }, [profile.roleId, project, profile.id])

  const canCreateTask = useMemo(() => {
    if (!project) return false
    // Roles.user can create task in any project they have access to (which is already filtered by backend/middleware)
    return [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user].includes(profile.roleId)
  }, [profile.roleId, project])

  const fetchLayer = useCallback(async () => {
    if (!projectId) return
    const taskIds = taskList.map((task) => String(task.id))
    try {
      showLoading()
      const feaLayers = await service.importToVisualize.searchLayers({ projectId, taskIdList: taskIds })
      setFeatureLayers(feaLayers.taskLayer)
      setItvLayers(feaLayers.itvLayer)
    } catch (err: any) {
      showAlert({ status: 'error', errorCode: err?.message })
    } finally {
      hideLoading()
    }
  }, [projectId, taskList, showAlert, hideLoading, showLoading])

  // fetch project details so we can show project name in breadcrumbs
  useEffect(() => {
    if (!projectId) return
    // determine current view from query param; only some blocks below should run when it's 'map'
    const viewParam = searchParams.get('view')
    let mounted = true
    const load = async () => {
      try {
        // only run the Thaicom-related fetches when we're in map view
        if (viewParam === 'map') {
          showLoading()
          setIsLayerLoading(true)

          const tasks = await service.tasks.getAll(projectId)
          setTaskList(tasks)
          const taskIds = tasks.map((task) => String(task.id))
          const feaLayers = await service.importToVisualize.searchLayers({ projectId, taskIdList: taskIds })
          setFeatureLayers(feaLayers.taskLayer)
          setItvLayers(feaLayers.itvLayer)
        }

        const p = await service.projects.get(projectId)
        const res = await service.weekly.getSubscriptionModel()

        if (viewParam !== 'map' && p.tasks.length <= 0) {
          // ให้เปิดหน้า map ถ้า project นี้ยังไม่มี task เลย
          const newSearchParams = new URLSearchParams(searchParams.toString())
          newSearchParams.set('view', 'map')
          globalThis.history.replaceState(null, '', `${pathname}?${newSearchParams.toString()}`)
        }
        setWeeklySubscriptionModel(res)
        setIsLayerLoading(false)

        if (mounted) setProject(p)
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      } finally {
        hideLoading()
        setIsLayerLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [projectId, searchParams, showAlert, showLoading, hideLoading, pathname])

  // run checkStatusProject once when entering the page; block searches until finished
  useEffect(() => {
    if (!projectId) return
    let mounted = true
    const check = async () => {
      try {
        // optional: show loading indicator while checking
        setLoading(true)
        await service.tasks.checkStatusProject(projectId)
      } catch (err: any) {
        // show non-blocking alert but still allow searches to proceed afterwards
        showAlert({ status: 'error', errorCode: err?.message })
      } finally {
        if (mounted) setIsStatusChecked(true)
        setLoading(false)
      }
    }
    check()
    return () => {
      mounted = false
    }
  }, [projectId, showAlert])

  const columns: MuiTableColumn<any>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('form.searchTask.column.name'),
        className: 'min-w-60',
        sortable: true,
        render: (row) => row.name || '-',
      },
      {
        id: 'service',
        label: t('form.searchTask.column.service'),
        className: 'min-w-60',
        render: (row) => {
          if (!row.service) return null
          return language === Language.TH ? row.service.name : row.service.nameEn
        },
      },
      {
        id: 'rootModel',
        label: t('form.searchTask.column.rootModel'),
        className: 'min-w-60',
        render: (row) => {
          if (!row.rootModel) return null
          return language === Language.TH ? row.rootModel.name : row.rootModel.nameEn
        },
      },
      {
        id: 'feature',
        label: t('form.searchTask.column.feature'),
        className: 'min-w-60',
        render: (row: any) =>
          row.taskModels.map((tm: any) => (language === Language.TH ? tm.model.name : tm.model.nameEn)).join(', '),
      },
      {
        id: 'status',
        label: t('form.searchTask.column.status'),
        className: 'min-w-40',
        render: (row: any) => {
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
        label: t('form.searchTask.column.createdAt'),
        className: 'min-w-40',
        sortable: true,
        render: (row) => (row.createdAt ? formatDateTime(row.createdAt, language) : ''),
      },
      {
        id: 'createdBy',
        label: t('form.searchTask.column.createdBy'),
        className: 'min-w-60',
        render: (row) => [row.createdByUser?.firstName, row.createdByUser?.lastName].filter(Boolean).join(' '),
      },
      {
        id: 'actions',
        label: t('table.actions'),
        className: 'min-w-40',
        align: 'center',
        render: (row, { rowKey, removeKeysFromSelection, onEdit, onDelete }) => (
          <>
            {onEdit && (canManageTask || (profile.roleId === Roles.user && row.createdByUser?.id === profile.id)) && (
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
            <Tooltip title={t('button.viewOnMap')} arrow>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/project/${projectId}/task/${row.id}/map`)
                }}
                color='primary'
                size='small'
              >
                <PublicIcon />
              </IconButton>
            </Tooltip>
            {onDelete && (canManageTask || (profile.roleId === Roles.user && row.createdByUser?.id === profile.id)) && (
              <Tooltip title={t('button.delete')} arrow>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation()
                    // provide onComplete callback so parent can notify when deletion finished
                    const keyToRemove = rowKey(row)
                    onDelete(row, () => {
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
        ),
      },
    ],
    [t, language, projectId, router, canManageTask, profile],
  )

  const filtersConfig: FilterFieldConfig[] = useMemo(
    () => [
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
      },
      {
        name: 'serviceId',
        label: 'form.searchTask.filter.service',
        type: 'select',
        minWidth: 220,
        options: async () => (await service.lookup.get({ name: 'services' })).filter((s: any) => s.id !== 3),
        onChange: async (value, filters, helpers) => {
          let newModels: SelectOption[] = []
          const allModels = await fetchRootModels()

          if (value) {
            const serviceId = Number(value)
            newModels = getFilteredModels(allModels, serviceId)
          } else {
            newModels = allModels
          }

          helpers.setSelectOptions((prev: any) => ({
            ...prev,
            rootModelId: newModels,
          }))

          setSelectedServiceId(value ? String(value) : '')
          return { ...filters, rootModelId: '' }
        },
      },
      {
        name: 'rootModelId',
        label: 'form.searchTask.filter.rootModel',
        type: 'select',
        minWidth: 220,
        options: fetchRootModels,
        disabled: !selectedServiceId,
      },
      {
        name: 'statusId',
        label: 'form.searchTask.filter.status',
        type: 'select',
        minWidth: 220,
        options: async () =>
          (await service.lookup.get({ name: 'task_status' })).filter(
            (ts: any) => ts.id !== TaskStatus.waitingForResults,
          ),
      },
    ],
    [selectedServiceId, t],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: force re-search
  const onSearch = useCallback(
    async (
      filters: Record<string, string>,
      page?: number,
      rowsPerPage?: number,
      sortState?: { orderBy: string; order: SortType },
    ): Promise<{ rows: any[]; totalRows: number }> => {
      const keyword = 'keyword'
      const kw = String(filters[keyword] || '').trim()
      setIsRefresh(false)

      const params = buildSearchParams(projectId, filters, kw, page, rowsPerPage, sortState)

      const { data, total } = await service.tasks.search(params as any)

      // Fetch thumbnails separately and merge into data
      const taskIds = data.map((row: Task) => row.id)
      const thumbnailMap = new Map<string, string | null>()
      if (taskIds.length > 0) {
        try {
          const thumbnailsRes = await service.tasks.getThumbnails(taskIds)
          for (const item of thumbnailsRes.data) {
            thumbnailMap.set(item.id, item.thumbnail)
          }
        } catch (err) {
          console.log('Failed to fetch thumbnails:', err)
        }
      }

      const dataWithThumbnails = data.map((row: Task) => ({
        ...row,
        thumbnail: thumbnailMap.get(row.id) || null,
      }))

      // Check if any task has inProgress status (TaskStatus.inProgress = 2)
      const hasInProgress = dataWithThumbnails.some((row: Task) => row.status?.id === TaskStatus.inProgress)
      console.log('hasInProgress task', hasInProgress)
      setIsRefresh(hasInProgress)

      return { rows: dataWithThumbnails, totalRows: total }
    },
    [searchTrigger, projectId],
  )

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null)
    setMenuRow(null)
  }, [])

  const handleMenuEdit = useCallback(() => {
    if (menuRow?.id) router.push(`/project/${projectId}/task/${menuRow.id}`)
    handleMenuClose()
  }, [menuRow, projectId, router, handleMenuClose])

  const handleMenuOpenMap = useCallback(() => {
    if (menuRow?.id) router.push(`/project/${projectId}/task/${menuRow.id}/map`)
    handleMenuClose()
  }, [menuRow, projectId, router, handleMenuClose])

  const deleteMany = useCallback(
    (ids: string[], onComplete?: () => void) => {
      showAlert({
        status: 'confirm-delete',
        showCancel: true,
        onConfirm: async () => {
          setLoading(true)
          try {
            setMenuAnchorEl(null)
            await service.tasks.delete(ids[0])
            onComplete?.()
            setSearchTrigger((prev) => prev + 1) // trigger re-search
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
    [showAlert],
  )

  const handleDelete = (row: any, onComplete?: () => void) => {
    deleteMany([row.id], onComplete)
  }

  const handleMenuDelete = useCallback(() => {
    if (!menuRow?.id) return handleMenuClose()
    deleteMany([menuRow.id], handleMenuClose)
  }, [menuRow, handleMenuClose, deleteMany])

  // Auto-refresh every 10 minutes if there are inProgress projects
  useEffect(() => {
    // if turning on, start interval
    if (isRefresh) {
      // avoid creating multiple intervals
      if (autoRefreshIntervalRef.current == null) {
        console.log('set interval')
        autoRefreshIntervalRef.current = window.setInterval(
          () => {
            setSearchTrigger((prev) => prev + 1)
          },
          10 * 60 * 1000,
        )
      }
      return () => {
        // cleanup when unmounting or isRefresh flips
        if (autoRefreshIntervalRef.current != null) {
          console.log('clear interval')
          clearInterval(autoRefreshIntervalRef.current)
          autoRefreshIntervalRef.current = null
        }
      }
    }

    // if turning off, clear any existing interval immediately
    if (!isRefresh && autoRefreshIntervalRef.current != null) {
      clearInterval(autoRefreshIntervalRef.current)
      autoRefreshIntervalRef.current = null
    }
    // no cleanup function needed in this branch
    return undefined
  }, [isRefresh])

  // view handling (table/card/map) - copy logic from project page

  const isValidView = useCallback((v: string | null | undefined): v is DisplayMode => {
    return v === 'table' || v === 'card' || v === 'map'
  }, [])

  const initialView = (() => {
    const v = searchParams.get('view')
    return isValidView(v) ? v : 'card'
  })()

  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialView)

  useEffect(() => {
    const v = searchParams.get('view')
    if (isValidView(v)) {
      if (v !== displayMode) setDisplayMode(v)
    } else if (displayMode !== 'card') {
      setDisplayMode('card')
    }
  }, [searchParams, displayMode, isValidView])

  const handleDisplayModeChange = useCallback(
    (mode: 'table' | 'card' | 'map') => {
      setDisplayMode(mode)
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (mode === 'card') params.delete('view')
      else params.set('view', mode)
      const qs = params.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      router.replace(url)
    },
    [router, searchParams, pathname],
  )

  // Open weekly view when requested and map is ready
  useEffect(() => {
    if (!shouldOpenWeekly) return

    // Wait for all conditions to be ready
    if (displayMode === 'map' && !isLayerLoading) {
      // Use a small delay to ensure ref is attached after render
      const timer = setTimeout(() => {
        if (projectMapViewRef.current) {
          projectMapViewRef.current.setActiveView(ActiveView.weekly)
          setShouldOpenWeekly(false)
        } else {
          console.log('Ref not ready yet, will retry on next render')
        }
      }, 50)

      return () => clearTimeout(timer)
    }
  }, [shouldOpenWeekly, displayMode, isLayerLoading])

  const renderCard = useCallback(
    (rows: any[]) => {
      return (
        <div className='flex-1 overflow-auto p-4 pt-0'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3'>
            {rows.map((row) => {
              const data = {
                image: row.thumbnail !== null ? `data:image/jpeg;base64,${row.thumbnail}` : '/images/bg_world_map.svg',
                name: row.name,
                service: (language === Language.TH ? row.service?.name : row.service?.nameEn) || '',
                rootModel: (language === Language.TH ? row.rootModel?.name : row.rootModel?.nameEn) || '',
                feature: row.taskModels
                  .map((tm: any) => (language === Language.TH ? tm.model.name : tm.model.nameEn))
                  .join(', '),
                status: row.status && (
                  <Chip
                    className='text-white!'
                    label={language === Language.TH ? row.status.name : row.status.nameEn}
                    color={statusColor[Number(row.status.id)]}
                    size='small'
                  />
                ),
                createdAt: formatDateTime(row.createdAt, language),
                createdBy: [row.createdByUser?.firstName, row.createdByUser?.lastName].filter(Boolean).join(' '),
              }
              return (
                <div
                  key={row.id}
                  className='flex flex-col overflow-hidden rounded-lg border border-(--color-divider) bg-white shadow-sm'
                >
                  <div className='relative h-56 w-full bg-(--color-divider)'>
                    {data.image && <Image className='z-0 object-cover' src={data.image} alt='Image' fill priority />}
                    <Button
                      className='absolute! top-2 right-2 min-w-0! bg-white! px-1! text-(--color-text-primary)!'
                      variant='contained'
                      size='small'
                      onClick={(e) => {
                        setMenuRow(row)
                        setMenuAnchorEl(e.currentTarget)
                      }}
                    >
                      <MoreVertIcon />
                    </Button>
                  </div>
                  <ButtonBase
                    className='items-start! flex flex-1 flex-col gap-2 p-4!'
                    onClick={() => router.push(`/project/${projectId}/task/${row.id}/map`)}
                  >
                    <Tooltip title={data.name} arrow>
                      <div className='line-clamp-2 break-all text-left font-medium'>{data.name}</div>
                    </Tooltip>
                    <div className='grid w-full grid-cols-2 items-center gap-2 text-sm md:grid-cols-3 md:pt-4'>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.service')}:
                        </label>
                        <Tooltip title={data.service} arrow>
                          <label className='truncate font-medium text-(--color-primary)'>{data.service}</label>
                        </Tooltip>
                      </div>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.rootModel')}:
                        </label>
                        <Tooltip title={data.rootModel} arrow>
                          <label className='truncate font-medium text-(--color-primary)'>{data.rootModel}</label>
                        </Tooltip>
                      </div>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.feature')}:
                        </label>
                        <Tooltip title={data.feature} arrow>
                          <label className='truncate font-medium text-(--color-primary)'>{data.feature}</label>
                        </Tooltip>
                      </div>
                      <div className='flex items-center gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.status')}:
                        </label>
                        {data.status}
                      </div>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.createdAt')}:
                        </label>
                        <Tooltip title={data.createdAt} arrow>
                          <label className='truncate'>{data.createdAt}</label>
                        </Tooltip>
                      </div>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.createdBy')}:
                        </label>
                        <Tooltip title={data.createdBy} arrow>
                          <label className='truncate'>{data.createdBy}</label>
                        </Tooltip>
                      </div>
                    </div>
                  </ButtonBase>
                </div>
              )
            })}
          </div>
        </div>
      )
    },
    [language, t, projectId, router.push],
  )

  const renderMap = useCallback(() => {
    if (!isLayerLoading) {
      return (
        <div className='flex flex-1 bg-(--color-background-default) pt-0 md:pt-4'>
          <ProjectMapView
            ref={projectMapViewRef}
            project={project}
            task={{ projectId: projectId || '' } as Task}
            pageLevel={ProjectMapViewPageLevel.project}
            featureLayers={featureLayers}
            mapId={MAP_ID}
            weeklySubscriptionModel={weeklySubscriptionModel}
            itvLayers={itvLayers}
            onRefresh={fetchLayer}
          />
        </div>
      )
    }
  }, [MAP_ID, featureLayers, weeklySubscriptionModel, projectId, itvLayers, fetchLayer, isLayerLoading, project])

  const taskCount = useMemo(() => {
    const existTask = project?.tasks.filter((task) => task.isDeleted === false)
    return existTask?.length || 0
  }, [project])

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar
          items={[
            { href: '/project' },
            { label: project ? project.name : t('loading'), onClick: () => setShowDetailDialog(true) },
          ]}
          backOnly
        >
          <div className='flex flex-1 shrink-0 whitespace-nowrap'>
            {canManageProject && (
              <IconButton
                className='mr-4!'
                size='small'
                color='primary'
                component={Link}
                href={`/project/${projectId}`}
              >
                <EditIcon />
              </IconButton>
            )}
            {canCreateTask && (
              <>
                <Button
                  className='hidden! md:flex!'
                  variant='contained'
                  color='primary'
                  startIcon={<AddIcon />}
                  onClick={() => {
                    router.push(`/project/${projectId}/task/create`)
                  }}
                >
                  {t('form.searchTask.addTaskButton')}
                </Button>
                <Button
                  className='md:hidden! min-w-0! px-2!'
                  variant='contained'
                  color='primary'
                  onClick={() => router.push(`/project/${projectId}/task/create`)}
                >
                  <AddIcon />
                </Button>
              </>
            )}
            {/* Desktop View */}
            <div className='mx-5 hidden items-center md:flex'>
              <Divider orientation='vertical' className='h-10!' />
            </div>
            <div className='hidden items-center gap-3 md:flex'>
              <Button
                className='h-10 text-(--color-text-primary)'
                sx={{ borderColor: '#D9DAD9' }}
                variant='outlined'
                size='small'
                startIcon={<ImageIcon htmlColor='#4F524F' />}
                onClick={() => router.push('/gallery')}
              >
                {t('button.gallery')}
              </Button>
              {weeklySubscriptionModel && weeklySubscriptionModel?.length > 0 && (
                <Button
                  className='h-10 text-(--color-text-primary)'
                  sx={{ borderColor: '#D9DAD9' }}
                  variant='outlined'
                  size='small'
                  startIcon={<WeeklyIcon />}
                  onClick={() => {
                    handleDisplayModeChange('map')
                    setShouldOpenWeekly(true)
                  }}
                >
                  {t('button.weekly')}
                </Button>
              )}
            </div>
            {/* Mobile View */}
            <div className='ml-2 md:hidden'>
              <Button
                className='h-10 min-w-0! px-2! text-(--color-text-primary)'
                sx={{ borderColor: '#D9DAD9' }}
                variant='outlined'
                size='small'
                onClick={handleTopMenuOpen}
              >
                <MoreVertIcon />
              </Button>
              <Menu
                anchorEl={topMenuAnchorEl}
                open={isTopMenuOpen}
                onClose={handleTopMenuClose}
                onClick={handleTopMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={() => router.push('/gallery')}>
                  <ListItemIcon>
                    <ImageIcon htmlColor='#4F524F' fontSize='small' />
                  </ListItemIcon>
                  <ListItemText>{t('button.gallery')}</ListItemText>
                </MenuItem>
                {weeklySubscriptionModel && weeklySubscriptionModel?.length > 0 && (
                  <MenuItem
                    onClick={() => {
                      handleDisplayModeChange('map')
                      setShouldOpenWeekly(true)
                    }}
                  >
                    <ListItemIcon>
                      <WeeklyIcon fontSize='small' />
                    </ListItemIcon>
                    <ListItemText>{t('button.weekly')}</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </div>
            <div className='flex-1' />
            <div className='flex items-center'>
              <div className='flex items-center gap-1'>
                <Tooltip title={t('view.card')} arrow>
                  <IconButton
                    size='small'
                    color={displayMode === 'card' ? 'primary' : 'default'}
                    onClick={() => handleDisplayModeChange('card')}
                  >
                    <ViewModuleIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('view.table')} arrow>
                  <IconButton
                    size='small'
                    color={displayMode === 'table' ? 'primary' : 'default'}
                    onClick={() => handleDisplayModeChange('table')}
                  >
                    <TableRowsIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('view.map')} arrow>
                  <IconButton
                    size='small'
                    color={displayMode === 'map' ? 'primary' : 'default'}
                    onClick={() => handleDisplayModeChange('map')}
                  >
                    <MapIcon />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          </div>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {(canManageTask ||
              (menuRow && profile.roleId === Roles.user && menuRow.createdByUser?.id === profile.id)) && (
              <MenuItem onClick={handleMenuEdit}>
                <ListItemIcon>
                  <EditIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText>{t('button.edit')}</ListItemText>
              </MenuItem>
            )}
            <MenuItem onClick={handleMenuOpenMap}>
              <ListItemIcon>
                <PublicIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText>{t('button.openMap')}</ListItemText>
            </MenuItem>
            {(canManageTask ||
              (menuRow && profile.roleId === Roles.user && menuRow.createdByUser?.id === profile.id)) && (
              <MenuItem className='text-error!' onClick={handleMenuDelete}>
                <ListItemIcon className='text-inherit!'>
                  <DeleteIcon fontSize='small' color='error' />
                </ListItemIcon>
                <ListItemText>{t('button.delete')}</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </NavigationBar>
      </div>
      <div className='min-h-0 flex-1'>
        {displayMode === 'map' ? (
          <div className='flex h-full w-full bg-(--color-background-default) pt-4'>{renderMap()}</div>
        ) : (
          <SearchWrapper
            columns={columns}
            filtersConfig={filtersConfig}
            onSearch={onSearch}
            onEdit={(row) => router.push(`/project/${projectId}/task/${row.id}`)}
            onRowClick={(row) => router.push(`/project/${projectId}/task/${row.id}`)}
            onDelete={canManageTask ? handleDelete : undefined}
            renderCard={renderCard}
            initialFilters={initialFilters}
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
            hideModeToggles={true}
            initialSort={{ orderBy: 'createdAt', order: SortType.DESC }}
            hideButtons
            autoSearchOnChange
            exLoading={loading}
            onClear={(helpers) => {
              setSelectedServiceId('')
              fetchRootModels().then((models) => {
                helpers.setSelectOptions((prev: any) => ({
                  ...prev,
                  rootModelId: models,
                }))
              })
            }}
          />
        )}
      </div>
      {project && (
        <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} fullWidth maxWidth='md'>
          <DialogTitle>{t('dialog.projectDetails.title')}</DialogTitle>
          <DialogContent>
            <div className='grid w-full grid-cols-[max-content_1fr] gap-2'>
              <label className='min-w-32 shrink-0 text-(--color-text-secondary)'>
                {t('dialog.projectDetails.name')}:
              </label>
              <label className='whitespace-pre-wrapbreak-all'>{project.name}</label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.detail')}:</label>
              <label className='whitespace-pre-wrap break-all'>{project.detail}</label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.tasksCount')}:</label>
              <label className='font-medium text-(--color-primary)'>
                {t('form.searchProject.card.taskItem', { count: taskCount })}
              </label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.createdBy')}:</label>
              <label>
                {[project.createdByUser.firstName, project.createdByUser.lastName].filter(Boolean).join(' ')}
              </label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.createdAt')}:</label>
              <label>{formatDateTime(project.createdAt!, language)}</label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.updatedAt')}:</label>
              <label>{formatDateTime(project.updatedAt!, language)}</label>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDetailDialog(false)}>{t('button.close')}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  )
}
