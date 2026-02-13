'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import Image from 'next/image'
import ProfileChip from '@/components/layout/ProfileChip'
import MenuRenderer, { menuConfig } from '@/components/layout/MenuRender'
import { useSettings } from '@/hook/useSettings'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import LogoutIcon from '@mui/icons-material/Logout'
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material'
import { useRouter } from 'next/navigation'

const Header = () => {
  const { t } = useTranslation('common')
  const { signOut } = useGlobalUI()
  const { sidebarCollapsed } = useSettings()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  return (
    <>
      <header className='flex h-16 w-full items-center justify-between bg-(--color-background-dark)'>
        <button
          type='button'
          className={`mb-2 flex h-14 w-21 cursor-pointer items-center justify-center rounded-br-3xl bg-white px-4 py-3 transition-all ${sidebarCollapsed ? '' : 'md:w-xs'}`}
          onClick={() => router.push('/project')}
        >
          <div className='relative h-full w-full'>
            <Image className='object-contain' src='/images/logo_iris.png' alt='App Logo' fill priority />
          </div>
        </button>
        <div className='pr-4'>
          <div className='hidden md:block'>
            <ProfileChip />
          </div>
          <IconButton
            className='md:hidden! text-white!'
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            size='large'
          >
            {mobileMenuOpen ? <CloseIcon fontSize='inherit' /> : <MenuIcon fontSize='inherit' />}
          </IconButton>
        </div>
      </header>
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className='fixed top-16 right-0 bottom-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#004080] to-[#0C2E50] py-6 md:hidden'>
          <div className='flex-1 overflow-y-auto px-6'>
            <MenuRenderer
              className='text-white!'
              items={[
                menuConfig.project,
                menuConfig.gallery,
                menuConfig.profile,
                {
                  ...menuConfig.management,
                  children: [
                    menuConfig.manageSubscription,
                    menuConfig.manageOrganization,
                    menuConfig.manageUser,
                    menuConfig.manageApi,
                    menuConfig.manageData,
                  ],
                },
                menuConfig.settings,
              ]}
              onClose={() => setMobileMenuOpen(false)}
              divider
            />
            <MenuItem className='text-white!' onClick={() => signOut()}>
              <ListItemIcon className='text-inherit!'>
                <LogoutIcon fontSize='small' />
              </ListItemIcon>
              <ListItemText>{t('menu.signOut')}</ListItemText>
            </MenuItem>
          </div>
          <div className='px-6'>
            <ProfileChip className='justify-start!' fullWidth disabled />
          </div>
        </div>
      )}
    </>
  )
}

export default Header
