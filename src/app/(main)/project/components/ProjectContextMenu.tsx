import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PublicIcon from '@mui/icons-material/Public'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { SearchProjectResultItem } from '@interfaces/index'

interface ProjectContextMenuProps {
  open: boolean
  onClose: () => void
  anchorEl?: HTMLElement | null
  anchorPosition?: { top: number; left: number } | null
  project: SearchProjectResultItem | null
  onEdit: (project: SearchProjectResultItem) => void
  onView?: (project: SearchProjectResultItem) => void
  onOpenMap: (project: SearchProjectResultItem) => void
  onDelete?: (project: SearchProjectResultItem) => void
  showEdit?: boolean
  showView?: boolean
  showDelete?: boolean
}

export const ProjectContextMenu = ({
  open,
  onClose,
  anchorEl,
  anchorPosition,
  project,
  onEdit,
  onView,
  onOpenMap,
  onDelete,
  showEdit = true,
  showView = false,
  showDelete = false,
}: ProjectContextMenuProps) => {
  const { t } = useTranslation('common')

  if (!project) return null

  const menuProps = anchorPosition
    ? {
        anchorReference: 'anchorPosition' as const,
        anchorPosition: anchorPosition,
      }
    : {
        anchorEl: anchorEl,
        anchorOrigin: { vertical: 'bottom' as const, horizontal: 'right' as const },
        transformOrigin: { vertical: 'top' as const, horizontal: 'right' as const },
      }

  return (
    <Menu open={open} onClose={onClose} {...menuProps}>
      {showView && onView && (
        <MenuItem
          onClick={() => {
            onView(project)
            onClose()
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>{t('button.viewDetails')}</ListItemText>
        </MenuItem>
      )}
      {showEdit && (
        <MenuItem
          onClick={() => {
            onEdit(project)
            onClose()
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>{t('button.edit')}</ListItemText>
        </MenuItem>
      )}
      <MenuItem
        onClick={() => {
          onOpenMap(project)
          onClose()
        }}
      >
        <ListItemIcon>
          <PublicIcon fontSize='small' />
        </ListItemIcon>
        <ListItemText>{t('button.viewOnMap')}</ListItemText>
      </MenuItem>
      {showDelete && onDelete && (
        <MenuItem
          className='text-error!'
          onClick={() => {
            onDelete(project)
            onClose()
          }}
        >
          <ListItemIcon className='text-inherit!'>
            <DeleteIcon fontSize='small' color='error' />
          </ListItemIcon>
          <ListItemText>{t('button.delete')}</ListItemText>
        </MenuItem>
      )}
    </Menu>
  )
}
