'use client'

import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import AddIcon from '@mui/icons-material/Add'
import ImageIcon from '@mui/icons-material/Image'
import MapIcon from '@mui/icons-material/Map'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import TableRowsIcon from '@mui/icons-material/TableRows'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import {
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import centroid from '@turf/centroid'
import type maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

import service from '@/api'
import { layerIdConfig } from '@/components/common/map/config/map'
import { MapView } from '@/components/common/map/MapView'
import { useMapStore } from '@/components/common/map/store/map'
import NavigationBar from '@/components/layout/NavigationBar'
import SearchWrapper, { type DisplayMode } from '@/components/layout/SearchWrapper'
import { useProfileStore } from '@/hook/useProfileStore'
import { useSettings } from '@/hook/useSettings'
import { weeklyIcon as WeeklyIcon } from '@/icons'
import { type Language, Roles, SortType } from '@interfaces/config'
import type { SearchProjectResultItem, GetLookupDtoOut } from '@interfaces/index'

import { ProjectCardItem } from './components/ProjectCardItem'
import { ProjectContextMenu } from './components/ProjectContextMenu'
import { ProjectInfoWindow } from './components/ProjectInfoWindow'
import { useProjectActions } from './hooks/useProjectActions'
import { useProjectMapPopup } from './hooks/useProjectMapPopup'
import { useProjectSearch } from './hooks/useProjectSearch'
import { useProjectTableConfig } from './hooks/useProjectTableConfig'

export const MAP_ID = 'landing-map-view'

export const statusColor: Record<number, 'primary' | 'warning' | 'success' | 'error'> = {
  1: 'primary',
  2: 'warning',
  3: 'success',
  4: 'error',
}

const initialFilters = {
  keyword: '',
  organizationId: '',
  createdAtFrom: '',
  createdAtTo: '',
}

const ensurePinImage = (
  map: maplibregl.Map,
  imageRef: React.MutableRefObject<HTMLImageElement | null>,
  loadedRef: React.MutableRefObject<boolean>,
): Promise<void> => {
  if (map.hasImage('project-pin')) return Promise.resolve()
  if (imageRef.current && loadedRef.current) {
    try {
      map.addImage('project-pin', imageRef.current)
      return Promise.resolve()
    } catch {
      // fall through to load new image
    }
  }
  return new Promise<void>((resolve, reject) => {
    const img = document.createElement('img')
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        if (!map.hasImage('project-pin')) {
          map.addImage('project-pin', img)
        }
        imageRef.current = img
        loadedRef.current = true
        resolve()
      } catch (e) {
        reject(e as Error)
      }
    }
    img.onerror = () => {
      console.warn('Failed to load pin icon')
      // reject(new Error('Failed to load pin icon'))
      resolve() // Don't crash map if icon fails
    }
    img.src = '/map/pin.svg'
  })
}

export const isValidCoord = (coord: number[]) => {
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

export const parseDateToISO = (dateStr: string | undefined, isEndOfDay: boolean): string | undefined => {
  if (!dateStr) return undefined
  const parts = String(dateStr).split('-').map(Number)
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

export const handlePrefixQuery = (
  prefix: string,
  value: string,
  params: Record<string, unknown>,
  cacheTaskStatuses: GetLookupDtoOut[],
) => {
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
      const statuses: GetLookupDtoOut[] = cacheTaskStatuses ?? []
      const normalized = value.toLowerCase()
      const found = statuses.find((s: GetLookupDtoOut) => {
        const n = String(s?.name || '').toLowerCase()
        const ne = String(s?.nameEn || '').toLowerCase()
        return n === normalized || ne === normalized
      })
      params.statusId = found ? Number(found.id) : 0
      break
    }
  }
}

const ProjectPage = () => {
  const PROJECT_SOURCE_ID = `${MAP_ID}-projects-source`
  const PROJECT_LAYER_ID = `${MAP_ID}-projects-layer`
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  /* 
  const { showLoading, hideLoading, showAlert } = useGlobalUI() 
  */
  const profile = useProfileStore((state) => state.profile)

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

  const {
    setSearchTrigger,
    isRefresh,
    selectedProject,
    setSelectedProject,
    popupCoordinates,
    setPopupCoordinates,
    onSearch,
  } = useProjectSearch({ cacheTaskStatuses })

  const { handleEdit, handleDelete, handleMultiDelete } = useProjectActions({ setSearchTrigger })

  const { columns, filtersConfig } = useProjectTableConfig({
    language: language as Language,
    profile,
    cacheTaskStatuses,
    onEdit: handleEdit,
    onDelete: handleDelete,
  })
  const { mapLibre } = useMapStore()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  /* isRefresh state is now managed by useProjectSearch */
  const autoRefreshIntervalRef = useRef<number | null>(null)

  // Queries
  const { data: weeklySubscriptionModel } = useQuery({
    queryKey: ['weekly-subscription-model'],
    queryFn: async () => {
      try {
        return await service.weekly.getSubscriptionModel()
      } catch (error) {
        console.error(error)
        throw error
      }
    },
    retry: false,
  })

  /*
   */
  const canManage = useMemo(
    () => [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user].includes(profile?.roleId ?? -1),
    [profile?.roleId],
  )
  const canDelete = useMemo(() => [Roles.superAdmin, Roles.admin].includes(profile?.roleId ?? -1), [profile?.roleId])

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
        autoRefreshIntervalRef.current = globalThis.setInterval(
          () => {
            setSearchTrigger((prev) => prev + 1)
          },
          10 * 60 * 1000,
        ) as unknown as number
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
  }, [isRefresh, setSearchTrigger])

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)

  const [menuRow, setMenuRow] = useState<SearchProjectResultItem | null>(null)
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

  const handleMenuOpen = useCallback((e: MouseEvent<HTMLElement>, row: SearchProjectResultItem) => {
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
    (rows: (SearchProjectResultItem & { thumbnail?: string | null })[]) => {
      return (
        <div className='flex-1 overflow-auto p-4 pt-0'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3'>
            {rows.map((row) => (
              <ProjectCardItem key={row.id} row={row} language={language as Language} handleMenuOpen={handleMenuOpen} />
            ))}
          </div>
        </div>
      )
    },
    [language, handleMenuOpen],
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

    ensurePinImage(map, pinImageRef, pinImageLoadedRef)
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
  }, [mapLibre, PROJECT_LAYER_ID, setSelectedProject, setPopupCoordinates])

  // Fit map bounds when data changes
  useEffect(() => {
    const map = mapLibre[MAP_ID]
    if (!map || mapRows.length === 0) return

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

  // Create MapLibre popup with React component (desktop)
  useProjectMapPopup({
    isMobile,
    selectedProject,
    popupCoordinates,
    setSelectedProject,
    setPopupCoordinates,
    profile,
    handleDelete,
    canDelete,
  })

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
            ? [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile?.roleId ?? -1) ||
              (profile?.roleId === Roles.user && menuRow.createdByUser?.id === profile?.id)
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
        onEdit={(project: SearchProjectResultItem) => {
          router.push(`/project/${project.id}`)
          closePinMenu()
        }}
        onView={(project: SearchProjectResultItem) => {
          router.push(`/project/${project.id}`)
          closePinMenu()
        }}
        onOpenMap={(project: SearchProjectResultItem) => {
          router.push(`/project/${project.id}/task?view=map`)
          closePinMenu()
        }}
        onDelete={(project: SearchProjectResultItem) => {
          handleDelete(project, closePinMenu)
        }}
        showEdit={
          pinMenuProject
            ? [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile?.roleId ?? -1) ||
              (profile?.roleId === Roles.user && pinMenuProject.createdByUser?.id === profile?.id)
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
          initialFilters={{
            ...initialFilters,
            organizationId: (profile?.roleId ?? 99) > 2 ? profile?.organizationId || '' : '',
          }}
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
                  const isOwner = selectedProject.createdByUser?.id === profile?.id
                  const canEdit =
                    [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile?.roleId ?? -1) ||
                    (profile?.roleId === Roles.user && isOwner)

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
