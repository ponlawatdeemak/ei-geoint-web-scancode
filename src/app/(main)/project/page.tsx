'use client'

import { useState, useMemo, useCallback, useEffect, type MouseEvent, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import Image from 'next/image'
import service from '@/api'
import SearchWrapper, { DisplayMode, FilterFieldConfig } from '@/components/layout/SearchWrapper'
import { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { Language, Roles, SortType, TaskStatus } from '@interfaces/config'
import { formatDateTime } from '@/utils/formatDate'
import {
  Button,
  Chip,
  IconButton,
  Tooltip,
  ButtonBase,
  Dialog,
  DialogContent,
  useMediaQuery,
  useTheme,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import Link from 'next/link'
import AddIcon from '@mui/icons-material/Add'
import TableRowsIcon from '@mui/icons-material/TableRows'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import MapIcon from '@mui/icons-material/Map'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PublicIcon from '@mui/icons-material/Public'
import DeleteIcon from '@mui/icons-material/Delete'
import ImageIcon from '@mui/icons-material/Image'
import { weeklyIcon as WeeklyIcon } from '@/icons'
import NavigationBar from '@/components/layout/NavigationBar'
import { useProfileStore } from '@/hook/useProfileStore'
import { MapView } from '@/components/common/map/MapView'
import { useMapStore } from '@/components/common/map/store/map'
import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import centroid from '@turf/centroid'
import { SearchProjectResultItem } from '@interfaces/index'
import { ProjectInfoWindow } from './components/ProjectInfoWindow'
import { ProjectContextMenu } from './components/ProjectContextMenu'
import { layerIdConfig } from '@/components/common/map/config/map'
import { useQuery } from '@tanstack/react-query'

const initialFilters = {
  keyword: '',
  organizationId: '',
  createdAtFrom: '',
  createdAtTo: '',
}

export const statusColor: Record<number, 'primary' | 'warning' | 'success' | 'error'> = {
  1: 'primary',
  2: 'warning',
  3: 'success',
  4: 'error',
}

export const MAP_ID = 'landing-map-view'

const ProjectPage = () => {
  const PROJECT_SOURCE_ID = `${MAP_ID}-projects-source`
  const PROJECT_LAYER_ID = `${MAP_ID}-projects-layer`
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const { showLoading, hideLoading, showAlert } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)!
  const [searchTrigger, setSearchTrigger] = useState<number>(0) // force re-search
  const { mapLibre } = useMapStore()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [isRefresh, setIsRefresh] = useState(false)
  const autoRefreshIntervalRef = useRef<number | null>(null)

  const { data: cacheTaskStatuses = [] } = useQuery({
    queryKey: ['task-status'],
    queryFn: async () => {
      const res = await service.lookup.get({ name: 'task_status' })
      if (Array.isArray(res)) {
        return res
      }
      return []
    },
  })

  // Queries
  const { data: weeklySubscriptionModel } = useQuery({
    queryKey: ['weekly-subscription-model'],
    queryFn: async () => {
      try {
        // showLoading()
        return await service.weekly.getSubscriptionModel()
      } catch (error) {
        hideLoading()
        throw error
      }
    },
    retry: false,
  })

  const canManage = useMemo(
    () => [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user].includes(profile.roleId),
    [profile.roleId],
  )
  const canDelete = useMemo(() => [Roles.superAdmin, Roles.admin].includes(profile.roleId), [profile.roleId])

  const columns: MuiTableColumn<any>[] = useMemo(
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
        render: (row, { rowKey, removeKeysFromSelection, onEdit, onDelete }) => {
          const isOwner = row.createdByUser?.id === profile.id
          const canEditProject =
            [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
            (profile.roleId === Roles.user && isOwner)

          return (
            <>
              <Tooltip title={t('button.viewDetails')} arrow>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/project/${row.id}/task?view=table`)
                  }}
                  color='primary'
                  size='small'
                >
                  <FormatListBulletedIcon />
                </IconButton>
              </Tooltip>
              {onEdit && canEditProject && (
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
                    router.push(`/project/${row.id}/task?view=map`)
                  }}
                  color='primary'
                  size='small'
                >
                  <PublicIcon />
                </IconButton>
              </Tooltip>
              {canDelete && onDelete && (
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
          )
        },
      },
    ],
    [t, language, router, canDelete, profile.id, profile.roleId], // Updated dependency array
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
          'status:': cacheTaskStatuses.map((s: any) => ({
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
        disabled: profile.roleId > 2,
      },
      {
        name: 'subscriptionId',
        label: 'form.searchProject.filter.subscription',
        type: 'select',
        minWidth: 120,
        options: async () => await service.subscriptions.getItemByOrg(profile.organizationId),
      },
      {
        name: 'createdAt',
        label: 'form.searchProject.filter.createdAtRange',
        type: 'dateRange',
        minWidth: 220,
      },
    ],
    [profile.organizationId, profile.roleId, t, cacheTaskStatuses, language],
  )

  const parseDateToISO = (dateStr: string | undefined, isEndOfDay: boolean): string | undefined => {
    if (!dateStr) return undefined
    const parts = String(dateStr)
      .split('-')
      .map((v) => Number(v))
    if (parts.length !== 3) return undefined
    const [y, m, d] = parts
    const date = new Date(
      y,
      m - 1,
      d,
      isEndOfDay ? 23 : 0,
      isEndOfDay ? 59 : 0,
      isEndOfDay ? 59 : 0,
      isEndOfDay ? 999 : 0,
    )
    return date.toISOString()
  }

  const handlePrefixQuery = (prefix: string, value: string, params: Record<string, unknown>) => {
    switch (prefix) {
      case 'name':
        params.name = value
        break
      case 'desc':
        params.desc = value
        break
      case 'creator':
        params.creator = value
        break
      case 'status': {
        const statuses: any[] = cacheTaskStatuses ?? []
        const normalized = value.toLowerCase()
        const found = statuses.find((s: any) => {
          const n = String(s?.name || '').toLowerCase()
          const ne = String(s?.nameEn || '').toLowerCase()
          return n === normalized || ne === normalized
        })
        params.statusId = found ? Number(found.id) : 0
        break
      }
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: force re-search
  const onSearch = useCallback(
    async (
      filters: Record<string, string>,
      page?: number,
      rowsPerPage?: number,
      sortState?: { orderBy: string; order: SortType },
    ): Promise<{ rows: any[]; totalRows: number }> => {
      // Close popup when searching
      setSelectedProject(null)
      setPopupCoordinates(null)
      setIsRefresh(false)

      const fromISO = parseDateToISO(filters.createdAtFrom, false)
      const toISO = parseDateToISO(filters.createdAtTo, true)
      const kw = String(filters.keyword || '').trim()

      const params: Record<string, unknown> = {
        organizationId: filters.organizationId,
        subscriptionId: filters.subscriptionId,
        from: fromISO,
        to: toISO,
      }

      // support prefix queries: name:, desc:, creator:, status:
      // if no prefix present, fall back to keyword search
      if (kw) {
        const colonIndex = kw.indexOf(':')
        if (colonIndex > -1) {
          const prefix = kw.slice(0, colonIndex).toLowerCase()
          const value = kw.slice(colonIndex + 1).trim()

          if (['name', 'desc', 'creator', 'status'].includes(prefix)) {
            handlePrefixQuery(prefix, value, params)
          } else {
            params.name = kw
          }
        }
      }

      if (typeof page === 'number' && typeof rowsPerPage === 'number') {
        params.offset = page * rowsPerPage
        params.limit = rowsPerPage
      }
      if (sortState) {
        params.sortField = sortState.orderBy
        params.sortOrder = sortState.order
      }

      const { data, total } = await service.projects.search(params)

      // Fetch thumbnails separately and merge into data
      const projectIds = data.map((row: SearchProjectResultItem) => row.id)
      const thumbnailMap = new Map<string, string | null>()
      if (projectIds.length > 0) {
        try {
          const thumbnailsRes = await service.projects.getThumbnails(projectIds)
          for (const item of thumbnailsRes.data) {
            thumbnailMap.set(item.id, item.thumbnail)
          }
        } catch (err) {
          console.log('Failed to fetch thumbnails:', err)
        }
      }

      const dataWithThumbnails = data.map((row: SearchProjectResultItem) => ({
        ...row,
        thumbnail: thumbnailMap.get(row.id) || null,
      }))

      // Check if any project has inProgress status (TaskStatus.inProgress = 2)
      const hasInProgress = dataWithThumbnails.some(
        (row: SearchProjectResultItem) => row.status?.id === TaskStatus.inProgress,
      )
      console.log('hasInProgress project', hasInProgress)
      setIsRefresh(hasInProgress)

      return {
        rows: dataWithThumbnails,
        totalRows: total,
      }
    },
    [searchTrigger, cacheTaskStatuses],
  )

  const deleteMany = useCallback(
    (ids: string[], onComplete?: () => void) => {
      showAlert({
        status: 'confirm-delete',
        showCancel: true,
        onConfirm: async () => {
          showLoading()
          try {
            await service.projects.delete({ ids })
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

  const handleEdit = useCallback(
    (row: any | null) => {
      const id = row?.id
      if (id) router.push(`/project/${id}`)
    },
    [router],
  )
  const handleDelete = useCallback(
    (row: any | null, onComplete?: () => void) => {
      const id = row?.id
      if (id) deleteMany([String(id)], onComplete)
    },
    [deleteMany],
  )
  const handleMultiDelete = useCallback(
    (selectedRowKeys: (string | number)[], onComplete?: () => void) => {
      deleteMany(selectedRowKeys as string[], onComplete)
    },
    [deleteMany],
  )

  const searchParams = useSearchParams()
  const pathname = usePathname()

  const isValidView = useCallback((v: string | null | undefined): v is DisplayMode => {
    return v === 'table' || v === 'card' || v === 'map'
  }, [])

  const initialView = (() => {
    const v = searchParams.get('view')
    return isValidView(v) ? v : 'card'
  })()

  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialView)
  const [selectedProject, setSelectedProject] = useState<SearchProjectResultItem | null>(null)
  const [popupCoordinates, setPopupCoordinates] = useState<[number, number] | null>(null)

  // Keep state in sync with URL (handles back/forward or external changes)
  useEffect(() => {
    const v = searchParams.get('view')
    if (isValidView(v)) {
      if (v !== displayMode) setDisplayMode(v)
    } else if (displayMode !== 'card') {
      // if no param, ensure default is 'card'
      setDisplayMode('card')
    }
    // intentionally depend on searchParams (it changes when URL changes)
  }, [searchParams, displayMode, isValidView])

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

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)

  const [menuRow, setMenuRow] = useState<any | null>(null)
  const [mapRows, setMapRows] = useState<SearchProjectResultItem[]>([])
  const [homeExtent, setHomeExtent] = useState<[number, number, number, number] | null>(null)
  const mapRowsRef = useRef<SearchProjectResultItem[]>(mapRows)
  const pinImageRef = useRef<HTMLImageElement | null>(null)
  const pinImageLoadedRef = useRef(false)
  const currentFeaturesRef = useRef<GeoJSON.FeatureCollection<GeoJSON.Point> | null>(null)
  const [pinMenuAnchorPosition, setPinMenuAnchorPosition] = useState<{ top: number; left: number } | null>(null)
  const [pinMenuProject, setPinMenuProject] = useState<SearchProjectResultItem | null>(null)

  const [topMenuAnchorEl, setTopMenuAnchorEl] = useState<HTMLElement | null>(null)
  const isTopMenuOpen = Boolean(topMenuAnchorEl)

  const handleTopMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTopMenuAnchorEl(event.currentTarget)
  }

  const handleTopMenuClose = () => {
    setTopMenuAnchorEl(null)
  }

  const handleMenuOpen = useCallback((e: MouseEvent<HTMLElement>, row: any) => {
    setMenuAnchorEl(e.currentTarget)
    setMenuRow(row)
  }, [])
  const closeMenu = useCallback(() => {
    setMenuAnchorEl(null)
    setMenuRow(null)
  }, [])

  const closePinMenu = useCallback(() => {
    setPinMenuAnchorPosition(null)
    setPinMenuProject(null)
  }, [])

  const handleMenuEdit = useCallback(
    (row: SearchProjectResultItem | null) => {
      if (row) handleEdit(row)
      closeMenu()
    },
    [handleEdit, closeMenu],
  )
  const handleMenuOpenMap = useCallback(
    (row: SearchProjectResultItem | null) => {
      const id = row?.id
      if (id) {
        router.push(`/project/${id}/task?view=map`)
      }
      closeMenu()
    },
    [router, closeMenu],
  )
  const handleMenuDelete = useCallback(
    (row: SearchProjectResultItem | null) => {
      if (row) handleDelete(row, closeMenu)
      else closeMenu()
    },
    [handleDelete, closeMenu],
  )

  const renderCard = useCallback(
    (rows: any[]) => {
      return (
        <div className='flex-1 overflow-auto p-4 pt-0'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3'>
            {rows.map((row) => {
              const data = {
                image: row.thumbnail !== null ? `data:image/jpeg;base64,${row.thumbnail}` : '/images/bg_world_map.svg',
                name: row.name,
                detail: row.detail,
                taskItem: row.tasks.length,
                status: row.status && (
                  <Chip
                    className='text-white!'
                    label={language === Language.TH ? row.status.name : row.status.nameEn}
                    color={statusColor[Number(row.status.id)]}
                    size='small'
                  />
                ),
                createdAt: formatDateTime(row.createdAt, language),
                updatedAt: formatDateTime(row.updatedAt, language),
                createdBy: [row.createdByUser?.firstName, row.createdByUser?.lastName].filter(Boolean).join(' '),
              }
              return (
                <div
                  key={row.id}
                  className='flex flex-col overflow-hidden rounded-lg border border-(--color-divider) bg-white shadow-sm'
                >
                  <div className='relative h-56 w-full bg-(--color-divider)'>
                    {data.image && <Image className='z-0 object-cover' src={data.image} alt='Image' fill priority />}
                    <Tooltip title={t('button.options')} arrow>
                      <Button
                        className='absolute! top-2 right-2 min-w-0! bg-white! px-1! text-(--color-text-primary)!'
                        variant='contained'
                        size='small'
                        onClick={(e) => handleMenuOpen(e, row)}
                      >
                        <MoreVertIcon />
                      </Button>
                    </Tooltip>
                  </div>
                  <ButtonBase
                    className='items-start! flex flex-1 flex-col gap-2 p-4!'
                    onClick={() => router.push(`/project/${row.id}/task?view=card`)}
                  >
                    <Tooltip title={data.name} arrow>
                      <div className='line-clamp-2 break-all text-left font-medium'>{data.name}</div>
                    </Tooltip>
                    <Tooltip title={data.detail} arrow>
                      <div className='line-clamp-1 break-all text-left text-(--color-text-secondary) text-sm'>
                        {data.detail}
                      </div>
                    </Tooltip>
                    <div className='grid w-full grid-cols-2 items-center gap-2 text-sm md:grid-cols-3 md:pt-4'>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchProject.card.task')}:
                        </label>
                        <label className='font-medium text-(--color-primary)'>
                          {t('form.searchProject.card.taskItem', { count: data.taskItem })}
                        </label>
                      </div>
                      <div className='flex items-center gap-1 md:col-span-2'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchProject.card.status')}:
                        </label>
                        {data.status}
                      </div>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchProject.card.createdAt')}:
                        </label>
                        <Tooltip title={data.createdAt} arrow>
                          <label className='truncate'>{data.createdAt}</label>
                        </Tooltip>
                      </div>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchProject.card.updatedAt')}:
                        </label>
                        <Tooltip title={data.updatedAt} arrow>
                          <label className='truncate'>{data.updatedAt}</label>
                        </Tooltip>
                      </div>
                      <div className='flex gap-1'>
                        <label className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchProject.card.createdBy')}:
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
    [language, t, handleMenuOpen, router],
  )

  // Render pins as MapLibre symbol layer
  useEffect(() => {
    const map = mapLibre[MAP_ID]
    if (!map) return

    const features = mapRows.map((project) => {
      if (!project.geometry) {
        return null
      }
      const geom = typeof project.geometry === 'string' ? JSON.parse(project.geometry) : project.geometry
      const center = centroid(geom)
      const coords = center?.geometry?.coordinates
      if (!coords || !Array.isArray(coords) || coords.length < 2) return null

      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [coords[0], coords[1]] },
        properties: { id: project.id },
      }
    })
    const validFeatures = features.filter(Boolean) as GeoJSON.Feature<GeoJSON.Point>[]
    const collection: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: validFeatures,
    }
    currentFeaturesRef.current = collection

    const existingSource = map.getSource(PROJECT_SOURCE_ID) as GeoJSONSource | undefined
    if (existingSource) {
      existingSource.setData(collection as unknown as GeoJSON.FeatureCollection)
    } else {
      map.addSource(PROJECT_SOURCE_ID, {
        type: 'geojson',
        data: collection,
      })
    }

    const ensurePinImage = () => {
      if (map.hasImage('project-pin')) return Promise.resolve()
      if (pinImageRef.current && pinImageLoadedRef.current) {
        try {
          map.addImage('project-pin', pinImageRef.current)
          return Promise.resolve()
        } catch {
          // fall through to load new image
        }
      }
      return new Promise<void>((resolve, reject) => {
        const img = document.createElement('img') as HTMLImageElement
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            if (!map.hasImage('project-pin')) {
              map.addImage('project-pin', img)
            }
            pinImageRef.current = img
            pinImageLoadedRef.current = true
            resolve()
          } catch (e) {
            reject(e as Error)
          }
        }
        img.onerror = () => {
          console.warn('Failed to load pin icon')
          reject(new Error('Failed to load pin icon'))
        }
        img.src = '/map/pin.svg'
      })
    }

    ensurePinImage()
      .then(() => {
        if (!map.getLayer(PROJECT_LAYER_ID)) {
          map.addLayer(
            {
              id: PROJECT_LAYER_ID,
              type: 'symbol',
              source: PROJECT_SOURCE_ID,
              layout: {
                'icon-image': 'project-pin',
                'icon-size': 1,
                'icon-allow-overlap': true,
                'icon-anchor': 'bottom',
              },
            },
            layerIdConfig.customReferer,
          )
        }
      })
      .catch(() => null)

    // Register style-data handler to restore pins after basemap change
    const register = useMapStore.getState().registerStyleDataHandler
    const unregister = useMapStore.getState().unregisterStyleDataHandler
    const handlerId = 'project-pins-handler'
    const handler = (m: maplibregl.Map) => {
      try {
        if (!m.hasImage('project-pin') && pinImageRef.current && pinImageLoadedRef.current) {
          try {
            m.addImage('project-pin', pinImageRef.current)
          } catch {}
        }
        if (!m.getSource(PROJECT_SOURCE_ID)) {
          const data = currentFeaturesRef.current ?? {
            type: 'FeatureCollection' as const,
            features: [],
          }
          m.addSource(PROJECT_SOURCE_ID, {
            type: 'geojson',
            data: data,
          })
        }
        if (!m.getLayer(PROJECT_LAYER_ID)) {
          m.addLayer(
            {
              id: PROJECT_LAYER_ID,
              type: 'symbol',
              source: PROJECT_SOURCE_ID,
              layout: {
                'icon-image': 'project-pin',
                'icon-size': 1,
                'icon-allow-overlap': true,
                'icon-anchor': 'bottom',
              },
            },
            layerIdConfig.customReferer,
          )
        }
      } catch (e) {
        console.error('project pins style-data handler error', e)
      }
    }
    register(map, handlerId, handler)

    return () => {
      unregister(map, handlerId)
      try {
        const currentMap = mapLibre[MAP_ID]
        if (!currentMap) return
        if (currentMap?.getLayer(PROJECT_LAYER_ID)) currentMap.removeLayer(PROJECT_LAYER_ID)
        if (currentMap?.getSource(PROJECT_SOURCE_ID)) currentMap.removeSource(PROJECT_SOURCE_ID)
      } catch (error) {
        console.warn('Error during cleanup of project map layers', error)
      }
    }
  }, [mapLibre, mapRows, PROJECT_LAYER_ID, PROJECT_SOURCE_ID])

  // Click / context menu handlers for pins
  useEffect(() => {
    const map = mapLibre[MAP_ID]
    if (!map) return

    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      const projId = feature?.properties?.id
      if (!projId) return

      const project = mapRowsRef.current.find((p) => String(p.id) === String(projId))
      if (!project) return

      const coords = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : e.lngLat?.toArray()
      if (!coords || coords.length < 2) return

      setSelectedProject(project)
      setPopupCoordinates([coords[0], coords[1]])

      map.flyTo({ center: [coords[0], coords[1]], zoom: 13, duration: 1000 })
    }

    const handleContextMenu = (e: maplibregl.MapLayerMouseEvent) => {
      e.preventDefault()
      const feature = e.features?.[0]
      const projId = feature?.properties?.id
      if (!projId) return
      const project = mapRowsRef.current.find((p) => String(p.id) === String(projId))
      if (!project) return

      const evt = e.originalEvent
      setPinMenuAnchorPosition({ top: evt.clientY, left: evt.clientX })
      setPinMenuProject(project)
    }

    map.on('click', PROJECT_LAYER_ID, handleClick)
    map.on('contextmenu', PROJECT_LAYER_ID, handleContextMenu)

    return () => {
      map.off('click', PROJECT_LAYER_ID, handleClick)
      map.off('contextmenu', PROJECT_LAYER_ID, handleContextMenu)
    }
  }, [mapLibre, PROJECT_LAYER_ID])

  // Fit map bounds when data changes
  useEffect(() => {
    const map = mapLibre[MAP_ID]
    if (!map || mapRows.length === 0) return

    const isValidCoord = (coord: number[]) => {
      return (
        Array.isArray(coord) &&
        coord.length >= 2 &&
        Number.isFinite(coord[0]) &&
        Number.isFinite(coord[1]) &&
        coord[0] >= -180 &&
        coord[0] <= 180 &&
        coord[1] >= -90 &&
        coord[1] <= 90
      )
    }

    const allCoordinates: number[][] = []
    mapRows.forEach((project) => {
      if (!project.geometry) return

      try {
        const geom = typeof project.geometry === 'string' ? JSON.parse(project.geometry) : project.geometry
        const coords = geom.type === 'Polygon' ? geom.coordinates.flat() : geom.coordinates.flat(2)
        coords.forEach((coord: number[]) => {
          if (isValidCoord(coord)) {
            allCoordinates.push([coord[0], coord[1]])
          }
        })
      } catch (err) {
        // skip invalid geometry to avoid breaking the map
        console.warn('skip invalid project geometry', err)
      }
    })

    if (allCoordinates.length > 0) {
      const lons = allCoordinates.map((c) => c[0])
      const lats = allCoordinates.map((c) => c[1])
      const minLon = Math.min(...lons)
      const maxLon = Math.max(...lons)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)

      // Store extent for homeExtent prop
      setHomeExtent([minLon, minLat, maxLon, maxLat])

      // Check if bounds are valid (not a single point or too small)
      const lonDiff = maxLon - minLon
      const latDiff = maxLat - minLat

      if (lonDiff === 0 && latDiff === 0) {
        // Single point - just center on it
        map.flyTo({ center: [minLon, minLat], zoom: 12, duration: 1000 })
      } else {
        // Valid bounds
        const bounds: [[number, number], [number, number]] = [
          [minLon, minLat],
          [maxLon, maxLat],
        ]
        try {
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 15,
            duration: 1000,
          })
        } catch (error) {
          // Fallback to center on first point if fitBounds fails
          console.warn('fitBounds failed, using flyTo instead', error)
          map.flyTo({ center: [minLon, minLat], zoom: 10, duration: 1000 })
        }
      }
    }
  }, [mapLibre, mapRows])

  // Create MapLibre popup with React component (desktop) or use state for Dialog (mobile)
  useEffect(() => {
    const map = mapLibre[MAP_ID]
    if (!map || !selectedProject || !popupCoordinates) return

    // On mobile, don't create popup - will use Dialog instead
    if (isMobile) return

    let cleanup: (() => void) | null = null

    import('maplibre-gl').then((maplibregl) => {
      const popupContent = document.createElement('div')

      Promise.all([
        import('react-dom/client'),
        import('@mui/material/styles'),
        import('@/styles/theme'),
        import('react-i18next'),
        import('@/i18n/i18next'),
      ]).then(([{ createRoot }, { ThemeProvider }, themeModule, { I18nextProvider }, i18nextModule]) => {
        const root = createRoot(popupContent)
        const theme = themeModule.default
        const i18n = i18nextModule.default

        root.render(
          <ThemeProvider theme={theme}>
            <I18nextProvider i18n={i18n}>
              <ProjectInfoWindow
                project={selectedProject}
                onClose={() => {
                  setSelectedProject(null)
                  setPopupCoordinates(null)
                }}
                onEdit={(() => {
                  const isOwner = selectedProject.createdByUser?.id === profile.id
                  const canEdit =
                    [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
                    (profile.roleId === Roles.user && isOwner)

                  return canEdit
                    ? () => {
                        router.push(`/project/${selectedProject.id}`)
                      }
                    : undefined
                })()}
                onView={() => {
                  router.push(`/project/${selectedProject.id}`)
                }}
                onDelete={
                  canDelete
                    ? () => {
                        handleDelete(selectedProject, () => {
                          setSelectedProject(null)
                          setPopupCoordinates(null)
                        })
                      }
                    : undefined
                }
                onOpenMap={() => {
                  router.push(`/project/${selectedProject.id}/task?view=map`)
                }}
              />
            </I18nextProvider>
          </ThemeProvider>,
        )

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 32,
          maxWidth: '600px',
        })
          .setLngLat(popupCoordinates)
          .setDOMContent(popupContent)
          .addTo(map)

        cleanup = () => {
          popup.remove()
          if (root) root.unmount()
        }
      })
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [mapLibre, selectedProject, popupCoordinates, router, handleDelete, isMobile, canManage, canDelete])

  useEffect(() => {
    mapRowsRef.current = mapRows
  }, [mapRows])

  const renderMap = useCallback(
    (rows: SearchProjectResultItem[]) => {
      // Update mapRows via ref and requestAnimationFrame to avoid setState during render
      requestAnimationFrame(() => {
        if (JSON.stringify(rows) !== JSON.stringify(mapRowsRef.current)) {
          setMapRows(rows)
        }
      })

      return (
        <div className='h-full min-h-0 w-full flex-1'>
          <MapView
            mapId={MAP_ID}
            homeExtent={
              homeExtent
                ? [
                    [homeExtent[0], homeExtent[1]],
                    [homeExtent[2], homeExtent[3]],
                  ]
                : null
            }
          />
        </div>
      )
    },
    [homeExtent],
  )

  // update displayMode and keep the `view` query param in sync.
  const handleDisplayModeChange = useCallback(
    (mode: 'table' | 'card' | 'map') => {
      setDisplayMode(mode)

      // sync URL: remove `view` when mode is default 'card', otherwise set it
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (mode === 'card') {
        params.delete('view')
      } else {
        params.set('view', mode)
      }
      const qs = params.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      // use replace to avoid polluting history with each toggle
      router.replace(url)
    },
    [router, searchParams, pathname],
  )

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar items={[{ label: 'navigation.project' }]}>
          <div className='ml-4 flex flex-1 shrink-0 whitespace-nowrap'>
            {canManage && (
              <>
                <Button
                  className='hidden! md:flex!'
                  variant='contained'
                  color='primary'
                  startIcon={<AddIcon />}
                  component={Link}
                  href='/project/create'
                >
                  {t('form.searchProject.addProjectButton')}
                </Button>
                <Button
                  className='md:hidden! min-w-0! px-2!'
                  variant='contained'
                  color='primary'
                  component={Link}
                  href='/project/create'
                >
                  <AddIcon />
                </Button>
                {/* Desktop View */}
                <div className='mx-5 hidden items-center md:flex'>
                  <Divider orientation='vertical' className='h-10!' />
                </div>
              </>
            )}
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
                  onClick={() => router.push('/project/weekly')}
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
                  <MenuItem onClick={() => router.push('/project/weekly')}>
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
        </NavigationBar>
      </div>

      {/* Card context menu */}
      <ProjectContextMenu
        open={Boolean(menuAnchorEl)}
        onClose={closeMenu}
        anchorEl={menuAnchorEl}
        project={menuRow}
        onEdit={handleMenuEdit}
        onView={handleMenuEdit}
        onOpenMap={handleMenuOpenMap}
        onDelete={handleMenuDelete}
        showEdit={
          menuRow
            ? [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
              (profile.roleId === Roles.user && menuRow.createdByUser?.id === profile.id)
            : false
        }
        showDelete={canDelete}
      />

      {/* Pin context menu */}
      <ProjectContextMenu
        open={Boolean(pinMenuAnchorPosition)}
        onClose={closePinMenu}
        anchorPosition={pinMenuAnchorPosition}
        project={pinMenuProject}
        onEdit={(project) => {
          router.push(`/project/${project.id}`)
          closePinMenu()
        }}
        onView={(project) => {
          router.push(`/project/${project.id}`)
          closePinMenu()
        }}
        onOpenMap={(project) => {
          router.push(`/project/${project.id}/task?view=map`)
          closePinMenu()
        }}
        onDelete={(project) => {
          handleDelete(project, closePinMenu)
        }}
        showEdit={
          pinMenuProject
            ? [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
              (profile.roleId === Roles.user && pinMenuProject.createdByUser?.id === profile.id)
            : false
        }
        showDelete={canDelete}
      />

      <div className='min-h-0 flex-1'>
        <SearchWrapper
          columns={columns}
          filtersConfig={filtersConfig}
          onSearch={onSearch}
          onEdit={handleEdit}
          onDelete={canDelete ? handleDelete : undefined}
          onMultiDelete={canDelete ? handleMultiDelete : undefined}
          renderCard={renderCard}
          renderMap={renderMap}
          initialFilters={{ ...initialFilters, organizationId: profile.roleId > 2 ? profile.organizationId : '' }}
          displayMode={displayMode}
          onDisplayModeChange={handleDisplayModeChange}
          hideModeToggles={true}
          initialSort={{ orderBy: 'updatedAt', order: SortType.DESC }}
          hideButtons
          autoSearchOnChange
        />
      </div>

      {/* Mobile Dialog for project info */}
      {isMobile && (
        <Dialog
          open={Boolean(selectedProject)}
          onClose={() => {
            setSelectedProject(null)
            setPopupCoordinates(null)
          }}
          maxWidth='sm'
          fullWidth
        >
          <DialogContent sx={{ p: 2 }}>
            {selectedProject && (
              <ProjectInfoWindow
                project={selectedProject}
                onClose={() => {
                  setSelectedProject(null)
                  setPopupCoordinates(null)
                }}
                onEdit={(() => {
                  const isOwner = selectedProject.createdByUser?.id === profile.id
                  const canEdit =
                    [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
                    (profile.roleId === Roles.user && isOwner)

                  return canEdit
                    ? () => {
                        router.push(`/project/${selectedProject.id}`)
                      }
                    : undefined
                })()}
                onView={() => {
                  router.push(`/project/${selectedProject.id}`)
                }}
                onDelete={
                  canDelete
                    ? () => {
                        handleDelete(selectedProject, () => {
                          setSelectedProject(null)
                          setPopupCoordinates(null)
                        })
                      }
                    : undefined
                }
                onOpenMap={() => {
                  router.push(`/project/${selectedProject.id}/task?view=map`)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default ProjectPage
