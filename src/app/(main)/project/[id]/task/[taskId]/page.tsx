'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import NavigationBar from '@/components/layout/NavigationBar'
import EditTaskForm from '@/components/form/EditTaskForm'
import service from '@/api'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { useProfileStore } from '@/hook/useProfileStore'
import { Roles } from '@interfaces/config'
import { GetProjectDtoOut } from '@interfaces/index'

export default function Page() {
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)!

  const params = useParams() as { id?: string; taskId?: string }
  const projectId = params?.id || ''
  const taskId = params?.taskId || ''

  const [project, setProject] = useState<GetProjectDtoOut | null>(null)

  useEffect(() => {
    if (!projectId) return
    let mounted = true
    const load = async () => {
      try {
        const p = await service.projects.get(projectId)
        if (mounted) setProject(p)
      } catch (err: any) {
        showAlert({
          status: 'error',
          errorCode: err?.message,
        })
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [projectId, showAlert])

  let projectLabel = t('loading')
  if (project) {
    projectLabel = project.name
  }

  const canManageProject = useMemo(() => {
    if (!project) return false
    // Allow all roles (that can reach this page) to try accessing the form.
    // Specific task ownership logic is handled in EditTaskForm.
    return [Roles.superAdmin, Roles.admin, Roles.customerAdmin, Roles.user].includes(profile.roleId)
  }, [profile.roleId, project])

  return (
    <div className='flex h-full flex-col'>
      <div className='flex shrink-0'>
        <NavigationBar
          items={[
            { label: 'navigation.project', href: '/project' },
            { label: projectLabel, href: `/project/${projectId}/task` },
            { label: taskId === 'create' ? 'navigation.addTask' : 'navigation.editTask' },
          ]}
          onBeforeNavigate={
            canManageProject
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
        <EditTaskForm
          projectId={projectId}
          taskId={taskId === 'create' ? undefined : taskId}
          orgId={project?.organizationId}
          // viewOnly prop removed to let EditTaskForm handle internal logic based on task ownership
        />
      </div>
    </div>
  )
}
