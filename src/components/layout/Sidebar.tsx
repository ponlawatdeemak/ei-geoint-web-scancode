'use client'

import MenuRenderer, { menuConfig } from '@/components/layout/MenuRender'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { useSettings } from '@/hook/useSettings'

import { useProfileStore } from '@/hook/useProfileStore'
import { Roles } from '@interfaces/index'

const Sidebar = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useSettings()
  const profile = useProfileStore((state) => state.profile)

  return (
    <aside
      className={`relative p-6 transition-all ${profile?.roleId === Roles.superAdmin ? 'mobile-landscape-scroll' : ''} ${sidebarCollapsed ? 'w-21 px-4' : 'w-xs'}`}
    >
      <MenuRenderer
        className='overflow-hidden text-white!'
        items={[
          menuConfig.project,
          menuConfig.manageSubscription,
          menuConfig.manageOrganization,
          menuConfig.manageUser,
          menuConfig.manageApi,
          menuConfig.manageData,
        ]}
        divider
      />
      <button
        className='-translate-y-1/2 absolute top-1/2 right-0 z-10 cursor-pointer rounded-l-lg bg-(--color-primary) py-2 text-white'
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        type='button'
      >
        {sidebarCollapsed ? <ChevronRightIcon fontSize='large' /> : <ChevronLeftIcon fontSize='large' />}
      </button>
    </aside>
  )
}

export default Sidebar
