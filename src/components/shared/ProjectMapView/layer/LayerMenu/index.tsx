import { Roles, ProjectMapViewPageLevel, ProjectMapViewGroup } from '@interfaces/config'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DownloadIcon from '@mui/icons-material/Download'
import PublicIcon from '@mui/icons-material/Public'
import ShareIcon from '@mui/icons-material/Share'

import { useRouter } from 'next/navigation'
import { FC, memo, useMemo, useState } from 'react'
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import { useProfileStore } from '@/hook/useProfileStore'
import { useTranslation } from 'react-i18next'
import { itvConfig, ItvMenuItem, ItvMenuType } from '../../utils/importToVisualize'
import ShareApiDialog from '@/components/common/dialog/ShareApiDialog'

interface LayerMenuProps {
  group: ProjectMapViewGroup
  selectedGroup: string | null
  pageLevel: ProjectMapViewPageLevel
  onDownloadGroup: (groupId: string) => void
  onMenuSelect: (item: ItvMenuItem, group: ProjectMapViewGroup) => void
}
const LayerMenu: FC<LayerMenuProps> = ({ group, selectedGroup, pageLevel, onDownloadGroup, onMenuSelect }) => {
  const router = useRouter()
  const profile = useProfileStore((state) => state.profile)
  const { t } = useTranslation('common')
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [menuGroup, setMenuGroup] = useState<string | null>(null)

  const [showShareApiDialog, setShowShareApiDialog] = useState(false)

  const isViewer = useMemo(() => {
    return profile && profile.roleId === Roles.viewer
  }, [profile])

  const isProject = useMemo(() => {
    return pageLevel === ProjectMapViewPageLevel.project
  }, [pageLevel])

  const showMenu = useMemo(() => {
    return !isViewer
  }, [isViewer])

  const isTaskLayer = useMemo(() => {
    return !!group.taskId
  }, [group.taskId])

  const itvMenu = useMemo(() => {
    return group.layerType && itvConfig[group.layerType] ? itvConfig[group.layerType]?.menu : []
  }, [group.layerType])

  const isOrgApiSharingEnabled = useMemo(() => {
    return profile?.organization.isApiSharingEnabled
  }, [profile])

  return (
    <div className={`ml-2`}>
      {showMenu && (
        <>
          <Tooltip title={t('button.more')} arrow>
            <IconButton
              size='small'
              className={selectedGroup === group.groupId ? 'text-white!' : ''}
              color={'default'}
              onClick={(e) => {
                e.stopPropagation()
                setMenuAnchorEl(e.currentTarget as HTMLElement)
                setMenuGroup(group.groupId)
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl && menuGroup === group.groupId)}
            onClose={() => {
              setMenuAnchorEl(null)
              setMenuGroup(null)
            }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            disableAutoFocusItem
            onClick={(e) => e.stopPropagation()}
          >
            {isTaskLayer && isProject && (
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuAnchorEl(null)
                  setMenuGroup(null)
                  router.push(`/project/${group.projectId}/task/${group.taskId}/map`)
                }}
                className='2k:gap-2'
              >
                <ListItemIcon>
                  <PublicIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText>{t('button.openMap')}</ListItemText>
              </MenuItem>
            )}
            {isTaskLayer && !isViewer && (
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuAnchorEl(null)
                  setMenuGroup(null)
                  onDownloadGroup(group.groupId)
                }}
                className='2k:gap-2'
              >
                <ListItemIcon>
                  <DownloadIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText>{t('button.download')}</ListItemText>
              </MenuItem>
            )}
            {isTaskLayer && isOrgApiSharingEnabled && !isViewer && (
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuAnchorEl(null)
                  setShowShareApiDialog(true)
                }}
                className='2k:gap-2'
              >
                <ListItemIcon>
                  <ShareIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText>{t('dialog.shareApi.title')}</ListItemText>
              </MenuItem>
            )}
            {itvMenu?.map((item) => (
              <MenuItem
                key={item.value}
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuAnchorEl(null)
                  setMenuGroup(null)
                  onMenuSelect(item, group)
                }}
                className={`2k:gap-2 ${item.value === ItvMenuType.delete ? 'text-error!' : ''}`}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText>{t(item.label)}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
      {showShareApiDialog && (
        <ShareApiDialog
          open={showShareApiDialog}
          onClose={() => {
            setShowShareApiDialog(false)
          }}
          data={group}
          shareType='optical-sar'
        />
      )}
    </div>
  )
}

export default memo(LayerMenu)
