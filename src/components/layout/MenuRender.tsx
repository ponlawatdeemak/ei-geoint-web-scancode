'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useProfileStore } from '@/hook/useProfileStore'
import { Roles } from '@interfaces/index'
import { MenuItem, ListItemIcon, ListItemText, MenuItemProps, Divider } from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import ImageIcon from '@mui/icons-material/Image'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import BallotIcon from '@mui/icons-material/Ballot'
import GroupIcon from '@mui/icons-material/Group'
import ApiIcon from '@mui/icons-material/Api'
import SettingsIcon from '@mui/icons-material/Settings'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { DataIcon, OrganizationIcon, SubscriptionIcon } from '@/icons'

export interface MenuItemConfig {
  allowedRoles: Roles[]
  id: string
  path?: string
  icon: React.ReactElement
  children?: MenuItemConfig[]
  onClick?: () => void
}

export const menuConfig: Record<string, MenuItemConfig> = {
  project: {
    allowedRoles: [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user, Roles.viewer],
    id: 'menu.project',
    path: '/project',
    icon: <FolderIcon fontSize='small' />,
  },
  gallery: {
    allowedRoles: [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user, Roles.viewer],
    id: 'menu.gallery',
    path: '/gallery',
    icon: <ImageIcon fontSize='small' />,
  },
  profile: {
    allowedRoles: [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user, Roles.viewer],
    id: 'menu.profile',
    path: '/profile',
    icon: <AccountCircleIcon fontSize='small' />,
  },
  management: {
    allowedRoles: [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user, Roles.viewer],
    id: 'menu.management',
    icon: <BallotIcon fontSize='small' />,
  },
  manageSubscription: {
    allowedRoles: [Roles.superAdmin],
    id: 'menu.manageSubscription',
    path: '/subscription',
    icon: <SubscriptionIcon fontSize='small' />,
  },
  manageOrganization: {
    allowedRoles: [Roles.superAdmin],
    id: 'menu.manageOrganization',
    path: '/organization',
    icon: <OrganizationIcon fontSize='small' />,
  },
  manageUser: {
    allowedRoles: [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user, Roles.viewer],
    id: 'menu.manageUser',
    path: '/user',
    icon: <GroupIcon fontSize='small' />,
  },
  manageApi: {
    allowedRoles: [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user],
    id: 'menu.manageApi',
    path: '/api',
    icon: <ApiIcon fontSize='small' />,
  },
  manageData: {
    allowedRoles: [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user, Roles.viewer],
    id: 'menu.manageData',
    path: '/data-management',
    icon: <DataIcon fontSize='small' />,
  },
  settings: {
    allowedRoles: [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user, Roles.viewer],
    id: 'menu.settings',
    icon: <SettingsIcon fontSize='small' />,
  },
}

export function filterMenuByRole(menuItems: MenuItemConfig[], userRole: number): MenuItemConfig[] {
  return menuItems
    .filter((item) => item.allowedRoles?.includes(userRole))
    .map((item) => {
      let filteredChildren: MenuItemConfig[] | undefined
      if (item.children) {
        if (Array.isArray(item.children)) {
          filteredChildren = filterMenuByRole(item.children, userRole)
        } else {
          filteredChildren = filterMenuByRole(Object.values(item.children), userRole)
        }
      }
      return {
        ...item,
        children: filteredChildren,
      }
    })
    .filter((item) => !item.children || item.children.length > 0)
}

function normalizePath(path: string) {
  const parts = path.split(/[?#]/)[0]
  return parts.length > 1 && parts.endsWith('/') ? parts.slice(0, -1) : parts || '/'
}

interface MenuRendererProps extends Omit<MenuItemProps, 'children' | 'onClick'> {
  items: MenuItemConfig[]
  divider?: boolean
  lastDivider?: boolean
  onClose?: () => void
}

const MenuRenderer: React.FC<MenuRendererProps> = ({
  items,
  divider,
  lastDivider = true,
  onClose,
  className,
  ...menuItemProps
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation('common')
  const profile = useProfileStore((state) => state.profile)!
  const { showSettings } = useGlobalUI()
  const handleClick = (item: MenuItemConfig) => {
    switch (item.id) {
      case 'menu.management':
        if ([Roles.superAdmin, Roles.admin].includes(profile.roleId)) {
          menuConfig.manageSubscription.path && router.push(menuConfig.manageSubscription.path)
        } else {
          menuConfig.manageUser.path && router.push(menuConfig.manageUser.path)
        }
        break
      case 'menu.settings':
        showSettings()
        break
      default:
        if (item.path) {
          router.push(item.path)
        }
        break
    }
    onClose?.()
  }
  const filteredItems = filterMenuByRole(items, profile.roleId)
  return (
    <>
      {filteredItems.map((item, idx) => {
        const isParent = item.children && item.children.length > 0
        return (
          <React.Fragment key={item.id}>
            <MenuItem
              className={`rounded-sm! ${className || ''} ${isParent ? 'cursor-default!' : ''}`}
              onClick={isParent ? undefined : () => handleClick(item)}
              selected={
                !!item.path &&
                (() => {
                  const normalizedPathname = normalizePath(pathname)
                  const normalizedItemPath = normalizePath(item.path)
                  return (
                    normalizedPathname === normalizedItemPath || normalizedPathname.startsWith(`${normalizedItemPath}/`)
                  )
                })()
              }
              disableRipple={isParent}
              disableTouchRipple={isParent}
              {...menuItemProps}
            >
              <ListItemIcon className='text-inherit!'>{item.icon}</ListItemIcon>
              <ListItemText>{t(item.id)}</ListItemText>
            </MenuItem>
            {isParent && (
              <div className={`pl-12 ${divider ? 'pt-3' : ''}`}>
                <MenuRenderer
                  className={`${className} ${divider ? '-mb-3' : ''}`}
                  divider={divider}
                  items={item.children!}
                  onClose={onClose}
                  {...menuItemProps}
                  lastDivider={false}
                />
              </div>
            )}
            {divider && (lastDivider || idx < filteredItems.length - 1) && (
              <Divider className='my-3! border-(--color-primary-light)/10!' />
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

export default MenuRenderer
