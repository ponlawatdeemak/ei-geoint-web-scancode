'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import NavigationBar from '@/components/layout/NavigationBar'
import service from '@/api'
import { GetProjectDtoOut, ProjectMapViewPageLevel, ServiceConfig, TaskStatus } from '@interfaces/index'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import Link from 'next/link'
import EditIcon from '@mui/icons-material/Edit'
import ImageIcon from '@mui/icons-material/Image'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { weeklyIcon as WeeklyIcon } from '@/icons'
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import ProjectMapView, { ActiveView, ProjectMapViewRef } from '@/components/shared/ProjectMapView'
import { useQuery } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { formatDateTime } from '@/utils/formatDate'
import { statusColor } from '@/app/(main)/project/page'
import LoadingScreen from '@/components/common/loading/LoadingScreen'

export default function TaskMapPage() {
  const { showLoading, hideLoading, showAlert } = useGlobalUI()

  const params = useParams() as { id?: string; taskId?: string }
  const router = useRouter()
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const projectId = params?.id
  const taskId = params?.taskId || ''
  const MAP_ID = `project-${projectId}-task-${taskId}-map-view`

  const projectMapViewRef = useRef<ProjectMapViewRef>(null)

  const [project, setProject] = useState<GetProjectDtoOut | null>(null)

  const [task, setTask] = useState<any | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const [topMenuAnchorEl, setTopMenuAnchorEl] = useState<HTMLElement | null>(null)
  const isTopMenuOpen = Boolean(topMenuAnchorEl)

  const handleTopMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTopMenuAnchorEl(event.currentTarget)
  }

  const handleTopMenuClose = () => {
    setTopMenuAnchorEl(null)
  }

  // Fetch layer data for this task
  const { data: featureLayersData, isLoading: isLoadingFeatureLayers } = useQuery({
    queryKey: ['post-layer-task', taskId],
    queryFn: async () => {
      try {
        return await service.tasks.postLayers({ ids: [taskId] })
      } catch (error) {
        hideLoading() // ป้องกัน loading ค้างเมื่อ error
        throw error
      }
    },
    enabled: !!taskId,
    retry: false,
  })

  const { data: weeklySubscriptionModel, isLoading: isLoadingWeeklySubscriptionModel } = useQuery({
    queryKey: ['weekly-subscription-model'],
    queryFn: async () => {
      try {
        return await service.weekly.getSubscriptionModel()
      } catch (error) {
        hideLoading() // ป้องกัน loading ค้างเมื่อ error
        throw error
      }
    },
    retry: false,
  })

  const {
    data,
    isFetching: isFetchingTask,
    refetch,
  } = useQuery({
    queryKey: ['search-task', taskId],
    queryFn: async () => {
      try {
        return await service.tasks.get(taskId)
      } catch (error) {
        hideLoading() // ป้องกัน loading ค้างเมื่อ error
        throw error
      }
    },
    enabled: !!taskId,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  })

  useEffect(() => {
    if (!projectId) return

    let mounted = true
    const load = async () => {
      try {
        const p = await service.projects.get(projectId)

        if (mounted) setProject(p)
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [projectId, showAlert])

  useEffect(() => {
    if (data && String(data?.statusId) !== String(TaskStatus.completed) && data?.serviceId === ServiceConfig.optical) {
      showAlert({
        status: 'warning',
        content: t(
          `${String(data?.statusId) === String(TaskStatus.draft) ? 'map.noDataTask' : 'map.unavailableIncompleteTask'}`,
        ),
        onConfirm() {
          router.back()
        },
      })
    }

    if (data) {
      setTask(data)
    }
  }, [data, router, showAlert, t])

  // show global loading while fetching
  useEffect(() => {
    if (isFetchingTask) showLoading()
    else hideLoading()
  }, [isFetchingTask, showLoading, hideLoading])

  // useEffect(() => {
  //   if (!taskId) return
  //   let mounted = true
  //   const load = async () => {
  //     showLoading()
  //     try {
  //       const tsk = await service.tasks.get(taskId)

  //       const tc = await thaicom.getTaskTC(taskId)
  //       if (mounted) setTask(tsk)
  //     } catch (err: unknown) {
  //       const message = err instanceof Error ? err.message : String(err)
  //       showAlert({ status: 'error', errorCode: message })
  //     } finally {
  //       hideLoading()
  //     }
  //   }
  //   load()
  //   return () => {
  //     mounted = false
  //   }
  // }, [taskId, showLoading, hideLoading, showAlert])

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar
          items={[
            { href: `/project/${projectId}/task` },
            { label: task ? task.name : t('loading'), onClick: () => setShowDetailDialog(true) },
          ]}
          backOnly
        >
          <div className='flex flex-1 shrink-0 whitespace-nowrap'>
            <IconButton
              className='mr-4!'
              size='small'
              color='primary'
              component={Link}
              href={`/project/${projectId}/task/${taskId}`}
            >
              <EditIcon />
            </IconButton>

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
                  onClick={() => projectMapViewRef.current?.setActiveView(ActiveView.weekly)}
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
                  <MenuItem onClick={() => projectMapViewRef.current?.setActiveView(ActiveView.weekly)}>
                    <ListItemIcon>
                      <WeeklyIcon fontSize='small' />
                    </ListItemIcon>
                    <ListItemText>{t('button.weekly')}</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </div>
          </div>
        </NavigationBar>
      </div>
      <div className='flex min-h-0 flex-1 bg-(--color-background-default) pt-4'>
        <div className='min-h-0 w-full flex-1'>
          {isLoadingFeatureLayers && task && (
            <div className='flex h-full flex-col items-center justify-center'>
              <LoadingScreen />
            </div>
          )}
          {!isLoadingFeatureLayers && !isLoadingWeeklySubscriptionModel && featureLayersData && (
            <ProjectMapView
              ref={projectMapViewRef}
              weeklySubscriptionModel={weeklySubscriptionModel}
              project={project}
              task={task}
              pageLevel={ProjectMapViewPageLevel.task}
              featureLayers={featureLayersData}
              mapId={MAP_ID}
              onRefresh={() => {
                refetch()
              }}
            />
          )}
          {!isLoadingFeatureLayers && !featureLayersData && (
            <div className='flex h-full flex-col items-center justify-center text-center text-slate-400'>
              <div className='mt-6 text-lg'>{t('alert.dataNotFound')}</div>
            </div>
          )}
        </div>
      </div>
      {task && (
        <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} fullWidth maxWidth='md'>
          <DialogTitle>{t('dialog.taskDetails.title')}</DialogTitle>
          <DialogContent>
            <div className='grid w-full grid-cols-[max-content_1fr] gap-2'>
              <label className='min-w-32 shrink-0 text-(--color-text-secondary)'>{t('dialog.taskDetails.name')}:</label>
              <label className='break-all'>{task.name}</label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.taskDetails.service')}:</label>
              <label className='font-medium text-(--color-primary)'>
                {language === 'th' ? task.service.name : task.service.nameEn}
              </label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.taskDetails.rootModel')}:</label>
              <label className='font-medium text-(--color-primary)'>
                {language === 'th' ? task.rootModel.name : task.rootModel.nameEn}
              </label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.taskDetails.feature')}:</label>
              <label className='font-medium text-(--color-primary)'>
                {task.models.map((m: any) => (language === 'th' ? m.name : m.nameEn)).join(', ')}
              </label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.taskDetails.status')}:</label>
              <label>
                {task.status && (
                  <Chip
                    className='text-white!'
                    label={language === 'th' ? task.status.name : task.status.nameEn}
                    color={statusColor[Number(task.status.id)]}
                    size='small'
                  />
                )}
              </label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.taskDetails.createdBy')}:</label>
              <label>{[task.createdByUser.firstName, task.createdByUser.lastName].filter(Boolean).join(' ')}</label>
              <label className='shrink-0 text-(--color-text-secondary)'>{t('dialog.taskDetails.createdAt')}:</label>
              <label>{formatDateTime(task.createdAt, language)}</label>
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
