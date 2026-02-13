'use client'

import { SearchProjectResultItem } from '@interfaces/index'
import { Button, Chip, IconButton, Tooltip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PublicIcon from '@mui/icons-material/Public'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import { formatDateTime } from '@/utils/formatDate'
import { statusColor } from '../page'
import { Roles } from '@interfaces/config'
import { useProfileStore } from '@/hook/useProfileStore'

interface ProjectInfoWindowProps {
  project: SearchProjectResultItem
  onClose: () => void
  onEdit?: () => void
  onView?: () => void
  onDelete?: () => void
  onOpenMap?: () => void
}

export const ProjectInfoWindow = ({
  project,
  onClose,
  onEdit,
  onView,
  onDelete,
  onOpenMap,
}: ProjectInfoWindowProps) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const profile = useProfileStore((state) => state.profile)!

  const handleClose = () => {
    // Blur any focused element before closing to prevent aria-hidden focus issue
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    onClose()
  }

  const handleView = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    onView?.()
  }

  const handleEdit = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    onEdit?.()
  }

  const handleDelete = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    onDelete?.()
  }

  const handleOpenMap = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    onOpenMap?.()
  }

  return (
    <div className='w-full min-w-xs md:min-w-lg' style={{ fontFamily: 'var(--font)' }}>
      <div className='mb-3 flex w-full items-start justify-between'>
        <h3 className='flex-1 font-semibold text-(--color-text-secondary) text-lg'>{project.name}</h3>
        <IconButton size='small' onClick={handleClose} className='ml-2'>
          <CloseIcon fontSize='small' />
        </IconButton>
      </div>

      <div className='items-start! flex flex-1 flex-col gap-2 p-2!'>
        <Tooltip title={project.detail} arrow>
          <div className='truncate text-(--color-text-secondary) text-sm'>{project.detail}</div>
        </Tooltip>
        <div className='grid w-full grid-cols-2 items-center gap-2 text-sm md:grid-cols-3 md:pt-2'>
          <div className='flex gap-1'>
            <label className='shrink-0 text-(--color-text-secondary)'>{t('form.searchProject.card.task')}:</label>
            <label className='font-medium text-(--color-primary)'>
              {t('form.searchProject.card.taskItem', { count: project.tasks.length })}
            </label>
          </div>
          <div className='flex items-center gap-1 md:col-span-2'>
            <label className='shrink-0 text-(--color-text-secondary)'>{t('form.searchProject.card.status')}:</label>
            {project.status && (
              <Chip
                className='text-white!'
                label={language === 'th' ? project.status.name : project.status.nameEn}
                color={statusColor[Number(project.status.id)]}
                size='small'
              />
            )}
          </div>
          <div className='flex gap-1'>
            <label className='shrink-0 text-(--color-text-secondary)'>{t('form.searchProject.card.createdAt')}:</label>
            <Tooltip title={formatDateTime(project.createdAt || '', language)} arrow>
              <label className='truncate'>{formatDateTime(project.createdAt || '', language)}</label>
            </Tooltip>
          </div>
          <div className='flex gap-1'>
            <label className='shrink-0 text-(--color-text-secondary)'>{t('form.searchProject.card.updatedAt')}:</label>
            <Tooltip title={formatDateTime(project.updatedAt || '', language)} arrow>
              <label className='truncate'>{formatDateTime(project.updatedAt || '', language)}</label>
            </Tooltip>
          </div>
          <div className='flex gap-1'>
            <label className='shrink-0 text-(--color-text-secondary)'>{t('form.searchProject.card.createdBy')}:</label>
            <Tooltip
              title={[project.createdByUser?.firstName, project.createdByUser?.lastName].filter(Boolean).join(' ')}
              arrow
            >
              <label className='truncate'>
                {[project.createdByUser?.firstName, project.createdByUser?.lastName].filter(Boolean).join(' ')}
              </label>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className='mt-2 border-(--color-gray-border) border-t pt-2'>
        <div className='flex justify-center'>
          {onView && (
            <div className='flex items-center'>
              <Button
                variant='text'
                color='primary'
                startIcon={<VisibilityIcon />}
                onClick={handleView}
                sx={{ textTransform: 'none' }}
              >
                {t('button.viewDetails')}
              </Button>
            </div>
          )}
          {onEdit && (
            <div className='flex items-center'>
              <Button
                variant='text'
                color='primary'
                startIcon={<EditIcon />}
                onClick={handleEdit}
                sx={{ textTransform: 'none' }}
              >
                {t('button.edit')}
              </Button>
            </div>
          )}
          {onOpenMap && (
            <>
              {onEdit && <div className='h-8 w-px bg-gray-200' />}
              <div className='flex items-center'>
                <Button
                  variant='text'
                  color='primary'
                  startIcon={<PublicIcon />}
                  onClick={handleOpenMap}
                  sx={{ textTransform: 'none' }}
                >
                  {t('button.viewOnMap')}
                </Button>
              </div>
            </>
          )}
          {onDelete && (
            <>
              {(onEdit || onOpenMap) && <div className='h-8 w-px bg-gray-200' />}
              {[Roles.superAdmin, Roles.admin].includes(profile.roleId) && (
                <div className='flex items-center'>
                  <Button
                    variant='text'
                    color='error'
                    startIcon={<DeleteIcon />}
                    onClick={handleDelete}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('button.delete')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
