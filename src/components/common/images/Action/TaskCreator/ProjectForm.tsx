import EditProjectForm from '@/components/form/EditProjectForm'
import { Button, CircularProgress, DialogActions, DialogContent } from '@mui/material'
import { useCallback, useState } from 'react'
import { UseFormGetValues, UseFormTrigger } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { ListProjectDtoOut, PostProjectDtoIn } from '@interfaces/index'
import projects from '@/api/projects'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'

type FormValues = {
  name: string
  detail?: string
  organizationId: string
}

interface Props {
  onCancel: () => void
  onSaveComplete: (projectId: string) => void
  setCurrentProjectId: (projectId: string) => void
  orgId: string
}
const ProjectForm = ({ onCancel, onSaveComplete, setCurrentProjectId, orgId }: Props) => {
  const { t } = useTranslation('common')
  const { showAlert, showLoading, hideLoading } = useGlobalUI()
  const [form, setForm] = useState<{ trigger: UseFormTrigger<any>; getValues: UseFormGetValues<any> } | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)

  const onSave = useCallback(
    async (values: FormValues) => {
      showLoading()
      try {
        const payload: Partial<PostProjectDtoIn> = {
          name: values.name,
          detail: values.detail,
          organizationId: values.organizationId,
          userIds: selectedUserIds,
        }
        const res = await projects.create(payload as PostProjectDtoIn)
        showAlert({ status: 'success', title: t('alert.saveSuccess') })
        setCurrentProjectId(res.id)
        onSaveComplete(res.id)
      } catch (err: any) {
        showAlert({ status: 'error', errorCode: err?.message })
      } finally {
        hideLoading()
      }
    },
    [onSaveComplete, setCurrentProjectId, showAlert, hideLoading, showLoading, selectedUserIds, t],
  )

  const onSubmit = useCallback(async () => {
    const isValid = await form?.trigger()
    if (!isValid) return
    const values = form?.getValues()
    showAlert({
      status: 'confirm-save',
      content: t('form.projectForm.confirmContent'),
      showCancel: true,
      onConfirm: () => {
        void onSave(values)
      },
    })
  }, [form, onSave, showAlert, t])

  return (
    <>
      <DialogContent>
        <EditProjectForm
          isOpenFromGallery
          projectId={undefined}
          setForm={setForm}
          externalOrgId={orgId}
          setExternalUserIds={setSelectedUserIds}
          setIsValid={setIsValid}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color='inherit'>
          {t('button.cancel')}
        </Button>
        <Button disabled={!isValid} onClick={onSubmit}>
          {t('button.save')}
        </Button>
      </DialogActions>
    </>
  )
}

export default ProjectForm
