'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProfileStore } from '@/hook/useProfileStore'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { Button, Menu, MenuItem, Divider, ListItemIcon, ListItemText, ButtonProps } from '@mui/material'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuRenderer, { menuConfig } from '@/components/layout/MenuRender'

const ProfileChip = ({ className, disabled, ...props }: ButtonProps) => {
  const { t } = useTranslation('common')
  const profile = useProfileStore((state) => state.profile)!
  const { signOut } = useGlobalUI()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      {profile && (
        <Button
          className={`rounded-full! bg-white! px-2! ${className || ''}`}
          disabled={disabled}
          onClick={handleClick}
          {...props}
        >
          <AccountCircleIcon color='primary' fontSize='large' />
          <span className='mx-4 text-(--color-text-primary)'>{profile.name}</span>
          {!disabled && <ArrowDropDownIcon className='text-(--color-text-primary)' fontSize='small' />}
        </Button>
      )}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            className: 'mt-2 min-w-2xs! px-2',
          },
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuRenderer
          items={[
            menuConfig.project,
            menuConfig.gallery,
            menuConfig.profile,
            menuConfig.management,
            menuConfig.settings,
          ]}
          onClose={handleClose}
        />
        <Divider className='my-1' />
        <MenuItem className='rounded-sm! text-error!' onClick={() => signOut()}>
          <ListItemIcon className='text-inherit!'>
            <LogoutIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>{t('menu.signOut')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

export default ProfileChip
