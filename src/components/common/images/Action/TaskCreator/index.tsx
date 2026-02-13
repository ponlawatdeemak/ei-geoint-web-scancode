import { FC, useCallback, useMemo, useState } from 'react'
import { Dialog, DialogTitle } from '@mui/material'
import TaskForm from './TaskForm'
import { useTranslation } from 'react-i18next'
import ProjectForm from './ProjectForm'
import { ImageActionData } from '../../use-images'

interface Props {
  onClose: () => void
  imageData: ImageActionData | null
}

const TaskCreator: FC<Props> = ({ onClose, imageData }) => {
  const { t } = useTranslation('common')

  const [showProjectForm, setShowProjectForm] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

  const orgId = useMemo(() => {
    // ใช้ organizationId จาก image ที่เลือกในการแสดงรายการ project และตอนสร้าง project
    return imageData?.organizationId
  }, [imageData])

  const onCancel = () => {
    if (showProjectForm) {
      setShowProjectForm(false)
    } else {
      onClose()
    }
  }

  const onSaveProjectComplete = useCallback(() => {
    setShowProjectForm(false)
  }, [])

  return (
    <Dialog open fullWidth maxWidth='sm'>
      <DialogTitle>
        {showProjectForm ? t('gallery.action.task.titleProject') : t('gallery.action.task.titleTask')}
      </DialogTitle>
      {showProjectForm && (
        <ProjectForm
          setCurrentProjectId={setCurrentProjectId}
          onCancel={onCancel}
          onSaveComplete={onSaveProjectComplete}
          orgId={orgId as string}
        />
      )}
      {!showProjectForm && (
        <TaskForm
          setShowProjectForm={setShowProjectForm}
          currentProjectId={currentProjectId}
          onCancel={onCancel}
          imageData={imageData}
          orgId={orgId as string}
        />
      )}
    </Dialog>
  )
}

export default TaskCreator
