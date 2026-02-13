import React, { useId, useMemo, useRef, useState } from 'react'
import { Box, Button, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import { useTranslation } from 'react-i18next'
import { ItvLayerType, ProjectMapViewPageLevel, Roles } from '@interfaces/index'
import { itvConfig } from './utils/importToVisualize'
import { useProfileStore } from '@/hook/useProfileStore'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import SwapVertIcon from '@mui/icons-material/SwapVert'

export enum ActiveViewLocal {
  layer = 0,
  weekly = 1,
}

type Props = {
  activeView: number
  pageLevel: ProjectMapViewPageLevel
  isMobile: boolean
  onClosePanel: () => void
  onSelectItv: (value: ItvLayerType) => void
  showAddButton: boolean
  isReordering: boolean
  hasOrderChanged: boolean
  onToggleReorder: (v: boolean) => void
  onSaveReorder: () => void
  onCancelReorder: () => void
}

const LayerPanelHeader: React.FC<Props> = ({
  activeView,
  pageLevel,
  isMobile,
  onClosePanel,
  onSelectItv,
  showAddButton,
  isReordering,
  hasOrderChanged,
  onToggleReorder,
  onSaveReorder,
  onCancelReorder,
}) => {
  const profile = useProfileStore((state) => state.profile)
  const { t } = useTranslation('common')
  const addMenuBtnId = useId()
  const menuId = useId()
  const title =
    activeView === ActiveViewLocal.weekly && pageLevel === ProjectMapViewPageLevel.project
      ? t('map.weekly')
      : t('map.layer')
  const anchorRef = useRef<HTMLButtonElement>(null)

  const [openItvMenu, setOpenItvMenu] = useState(false)

  const handleClose = () => {
    setOpenItvMenu(false)
  }

  const onMenuItemClick = (value: ItvLayerType) => {
    onSelectItv(value)
    setOpenItvMenu(false)
  }

  return (
    <div className={`flex w-full flex-col ${pageLevel === ProjectMapViewPageLevel.task ? 'pb-2' : ''}`}>
      <div className='flex w-full items-center justify-between'>
        <span className='font-bold text-(--color-text-primary)'>{title}</span>
        {!isMobile && (
          <Box className='!rounded-[8px] !bg-(--color-background-light) flex h-10 w-10 items-center justify-center'>
            <Tooltip title={t('button.closePanel')} placement='left' arrow>
              <IconButton onClick={onClosePanel} className='!h-8 !w-8 !p-0'>
                <KeyboardArrowLeftIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </div>
      {showAddButton && (
        <div className='flex items-center justify-between'>
          {profile?.roleId !== Roles.viewer &&
            activeView !== ActiveViewLocal.weekly &&
            pageLevel === ProjectMapViewPageLevel.project &&
            !isReordering && (
              <Button
                startIcon={<AddCircleIcon />}
                className='border-transparent! px-1! pb-1 text-[#0B76C8]!'
                ref={anchorRef}
                id={addMenuBtnId}
                onClick={() => setOpenItvMenu(true)}
              >
                {t('itv.button.addLayer')}
              </Button>
            )}
          <Menu id={menuId} open={openItvMenu} onClose={handleClose} anchorEl={anchorRef.current}>
            {Object.values(itvConfig).map((item) => (
              <MenuItem key={item.value} className='h-[40px] min-w-[270px]' onClick={() => onMenuItemClick(item.value)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText>{t(item.label)}</ListItemText>
              </MenuItem>
            ))}
          </Menu>

          {isReordering ? (
            <div className='my-2 ml-auto flex items-center gap-2'>
              <Button variant='text' onClick={onCancelReorder} className='min-w-[60px] text-(--color-text-secondary)!'>
                {t('button.cancel')}
              </Button>
              <Button
                variant='text'
                color='primary'
                onClick={onSaveReorder}
                disabled={!hasOrderChanged}
                className='min-w-[60px]'
              >
                {t('button.ok')}
              </Button>
            </div>
          ) : (
            profile?.roleId !== Roles.viewer &&
            activeView !== ActiveViewLocal.weekly &&
            pageLevel === ProjectMapViewPageLevel.project && (
              <Button
                onClick={() => onToggleReorder(true)}
                className='my-2! text-(--color-text-primary)!'
                startIcon={<SwapVertIcon />}
              >
                {t('itv.button.sort')}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default LayerPanelHeader
