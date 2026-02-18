'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import Image from 'next/image'
import SearchWrapper, { type SelectOption } from '@/components/layout/SearchWrapper'
import { ProjectMapViewPageLevel, Roles, SortType, Language } from '@interfaces/config'
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
import { useProfileStore, type UserProfile } from '@/hook/useProfileStore'
import ProjectMapView, { type ProjectMapViewRef } from '@/components/shared/ProjectMapView'
import type { Task, TaskModel } from '@interfaces/entities'

import { useTaskTableConfig } from './hooks/useTaskTableConfig'
import { useTaskSearch } from './hooks/useTaskSearch'
import { useTaskActions } from './hooks/useTaskActions'
import { useTaskDisplayMode } from './hooks/useTaskDisplayMode'

const statusColor: Record<number, 'primary' | 'warning' | 'success' | 'error'> = {
  1: 'primary',
  2: 'warning',
  3: 'success',
  4: 'error',
}

const fetchRootModels = async () => {
  const service = (await import('@/api')).default
  return (await service.lookup.getModelAll()).filter((m) => !m.parentModelId && m.serviceId !== 3)
}

export default function TaskSearchPage() {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const profile = useProfileStore((state) => state.profile)

  const params = useParams() as { id?: string }
  const projectId = params?.id

  const projectMapViewRef = useRef<ProjectMapViewRef>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')

  // --- Custom hooks ---
  const {
    project,
    weeklySubscriptionModel,
    featureLayers,
    itvLayers,
    isLayerLoading,
    loading,
    setLoading,
    setSearchTrigger,
    onSearch,
    fetchLayer,
  } = useTaskSearch({ projectId })

  const {
    menuAnchorEl,
    menuRow,
    topMenuAnchorEl,
    isTopMenuOpen,
    setMenuRow,
    setMenuAnchorEl,
    handleTopMenuOpen,
    handleTopMenuClose,
    handleMenuClose,
    handleMenuEdit,
    handleMenuOpenMap,
    handleMenuDelete,
    handleDelete,
  } = useTaskActions({ projectId, setSearchTrigger, setLoading })

  const { displayMode, handleDisplayModeChange, setShouldOpenWeekly } = useTaskDisplayMode({
    projectMapViewRef,
    isLayerLoading,
  })

  // --- Permission memos ---
  const canManageProject = useMemo(() => {
    if (!project || !profile) return false
    const isOwner = project.createdByUser?.id === profile.id
    return (
      [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
      (profile.roleId === Roles.user && isOwner)
    )
  }, [profile, project])

  const canManageTask = useMemo(() => {
    if (!project || !profile) return false
    const isOwner = project.createdByUser?.id === profile.id
    return (
      [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile.roleId) ||
      (profile.roleId === Roles.user && isOwner)
    )
  }, [profile, project])

  const canCreateTask = useMemo(() => {
    if (!project || !profile) return false
    return [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user].includes(profile.roleId)
  }, [profile, project])

  const { columns: taskColumns, filtersConfig: taskFiltersConfig } = useTaskTableConfig({
    language: language as Language,
    profile: profile ?? ({} as UserProfile),
    projectId,
    router,
    canManageTask,
    selectedServiceId,
    setSelectedServiceId,
  })

  const MAP_ID = `project-${projectId}-map-view`

  const taskCount = useMemo(() => {
    const existTask = project?.tasks.filter((task) => task.isDeleted === false)
    return existTask?.length || 0
  }, [project])

  // --- Render helpers ---
  const renderCard = useCallback(
    (rows: Task[]) => {
      return (
        <div className='flex-1 overflow-auto p-4 pt-0'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3'>
            {rows.map((row) => {
              const data = {
                image: row.thumbnail ? `data:image/jpeg;base64,${row.thumbnail}` : '/images/bg_world_map.svg',
                name: row.name,
                service: (language === Language.TH ? row.service?.name : row.service?.nameEn) || '',
                rootModel: (language === Language.TH ? row.rootModel?.name : row.rootModel?.nameEn) || '',
                feature:
                  row.taskModels
                    ?.map((tm: TaskModel) => (language === Language.TH ? tm.model.name : tm.model.nameEn))
                    .join(', ') ?? '',
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
                        <span className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.service')}:
                        </span>
                        <Tooltip title={data.service} arrow>
                          <span className='truncate font-medium text-(--color-primary)'>{data.service}</span>
                        </Tooltip>
                      </div>
                      <div className='flex gap-1'>
                        <span className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.rootModel')}:
                        </span>
                        <Tooltip title={data.rootModel} arrow>
                          <span className='truncate font-medium text-(--color-primary)'>{data.rootModel}</span>
                        </Tooltip>
                      </div>
                      <div className='flex gap-1'>
                        <span className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.feature')}:
                        </span>
                        <Tooltip title={data.feature} arrow>
                          <span className='truncate font-medium text-(--color-primary)'>{data.feature}</span>
                        </Tooltip>
                      </div>
                      <div className='flex items-center gap-1'>
                        <span className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.status')}:
                        </span>
                        {data.status}
                      </div>
                      <div className='flex gap-1'>
                        <span className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.createdAt')}:
                        </span>
                        <Tooltip title={data.createdAt} arrow>
                          <span className='truncate'>{data.createdAt}</span>
                        </Tooltip>
                      </div>
                      <div className='flex gap-1'>
                        <span className='shrink-0 text-(--color-text-secondary)'>
                          {t('form.searchTask.card.createdBy')}:
                        </span>
                        <Tooltip title={data.createdBy} arrow>
                          <span className='truncate'>{data.createdBy}</span>
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
    [language, t, projectId, router, setMenuRow, setMenuAnchorEl],
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

  if (!profile) return null

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
            columns={taskColumns}
            filtersConfig={taskFiltersConfig}
            onSearch={onSearch}
            onEdit={(row) => router.push(`/project/${projectId}/task/${row.id}`)}
            onRowClick={(row) => router.push(`/project/${projectId}/task/${row.id}`)}
            onDelete={canManageTask ? handleDelete : undefined}
            renderCard={renderCard}
            initialFilters={{
              keyword: '',
              statusId: '',
              createdAtFrom: '',
              createdAtTo: '',
            }}
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
                helpers.setSelectOptions((prev: Record<string, SelectOption[]>) => ({
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
              <span className='min-w-32 shrink-0 text-(--color-text-secondary)'>
                {t('dialog.projectDetails.name')}:
              </span>
              <span className='whitespace-pre-wrapbreak-all'>{project.name}</span>
              <span className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.detail')}:</span>
              <span className='whitespace-pre-wrap break-all'>{project.detail}</span>
              <span className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.tasksCount')}:</span>
              <span className='font-medium text-(--color-primary)'>
                {t('form.searchProject.card.taskItem', { count: taskCount })}
              </span>
              <span className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.createdBy')}:</span>
              <span>{[project.createdByUser.firstName, project.createdByUser.lastName].filter(Boolean).join(' ')}</span>
              <span className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.createdAt')}:</span>
              <span>{formatDateTime(project.createdAt ?? '', language)}</span>
              <span className='shrink-0 text-(--color-text-secondary)'>{t('dialog.projectDetails.updatedAt')}:</span>
              <span>{formatDateTime(project.updatedAt ?? '', language)}</span>
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
