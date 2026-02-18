import { IconButton, Tooltip } from '@mui/material'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import EditIcon from '@mui/icons-material/Edit'
import PublicIcon from '@mui/icons-material/Public'
import DeleteIcon from '@mui/icons-material/Delete'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Roles } from '@interfaces/config'
import type { MouseEvent } from 'react'
import type { SearchProjectResultItem } from '@interfaces/index'
import type { UserProfile } from '@/hook/useProfileStore'

interface ProjectActionButtonsProps {
  row: SearchProjectResultItem
  profile: UserProfile | null
  onEdit?: (row: SearchProjectResultItem) => void
  onDelete?: (row: SearchProjectResultItem, callback: () => void) => void
  removeKeysFromSelection: (keys: (string | number)[]) => void
  rowKey: (row: SearchProjectResultItem) => string | number
}

export const ProjectActionButtons = ({
  row,
  profile,
  onEdit,
  onDelete,
  removeKeysFromSelection,
  rowKey,
}: ProjectActionButtonsProps) => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const isOwner = row.createdByUser?.id === profile?.id
  const canEditProject =
    [Roles.superAdmin, Roles.admin, Roles.customerAdmin].includes(profile?.roleId ?? -1) ||
    (profile?.roleId === Roles.user && isOwner)
  const canDelete = [Roles.superAdmin, Roles.admin].includes(profile?.roleId ?? -1)

  const handleEdit = (e: MouseEvent) => {
    e.stopPropagation()
    onEdit?.(row)
  }

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation()
    const keyToRemove = rowKey(row)
    onDelete?.(row, () => {
      removeKeysFromSelection([keyToRemove])
    })
  }

  const handleViewDetails = (e: MouseEvent) => {
    e.stopPropagation()
    router.push(`/project/${row.id}/task?view=table`)
  }

  const handleViewMap = (e: MouseEvent) => {
    e.stopPropagation()
    router.push(`/project/${row.id}/task?view=map`)
  }

  return (
    <>
      <Tooltip title={t('button.viewDetails')} arrow>
        <IconButton onClick={handleViewDetails} color='primary' size='small'>
          <FormatListBulletedIcon />
        </IconButton>
      </Tooltip>
      {onEdit && canEditProject && (
        <Tooltip title={t('button.edit')} arrow>
          <IconButton onClick={handleEdit} color='primary' size='small'>
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={t('button.viewOnMap')} arrow>
        <IconButton onClick={handleViewMap} color='primary' size='small'>
          <PublicIcon />
        </IconButton>
      </Tooltip>
      {canDelete && onDelete && (
        <Tooltip title={t('button.delete')} arrow>
          <IconButton onClick={handleDelete} color='error' size='small'>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  )
}
