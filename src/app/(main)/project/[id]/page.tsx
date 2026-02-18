'use client'

import { useParams } from 'next/navigation'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useProfileStore } from '@/hook/useProfileStore'
import NavigationBar from '@/components/layout/NavigationBar'
import EditProjectForm from '@/components/form/EditProjectForm'
import { Roles } from '@interfaces/config'

export default function Page() {
  const params = useParams() as { id?: string }
  const { id } = params
  const { showAlert } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)

  if (!profile) return null

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-shrink-0'>
        <NavigationBar
          items={[
            { label: 'navigation.project', href: '/project' },
            { label: id === 'create' ? 'navigation.addProject' : 'navigation.editProject' },
          ]}
          onBeforeNavigate={
            [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user].includes(profile.roleId)
              ? () => {
                  return new Promise<boolean>((resolve) => {
                    showAlert({
                      status: 'confirm-cancel',
                      showCancel: true,
                      onConfirm: () => resolve(true),
                      onCancel: () => resolve(false),
                    })
                  })
                }
              : undefined
          }
        />
      </div>
      <div className='flex-1 overflow-hidden'>
        <EditProjectForm projectId={id === 'create' ? undefined : id} />
      </div>
    </div>
  )
}
