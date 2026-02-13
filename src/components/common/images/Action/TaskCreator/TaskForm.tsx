import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { ListProjectDtoOut } from '@interfaces/index'
import projects from '@/api/projects'
import { Controller, useForm, UseFormGetValues, UseFormTrigger } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { Autocomplete, Button, DialogActions, DialogContent, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'
import EditTaskForm from '@/components/form/EditTaskForm'
import InputLabel from '@/components/common/input/InputLabel'
import AddIcon from '@mui/icons-material/Add'
import { ImageActionData } from '../../use-images'
import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type FormValues = {
  projectId: string
  name: string
  serviceId: number
  rootModelId: number
  modelIds: number[]
}

interface Props {
  onCancel: () => void
  imageData: ImageActionData | null
  currentProjectId: string | null
  setShowProjectForm: (showProjectForm: boolean) => void
  orgId: string
}

const TaskForm = ({ onCancel, imageData, currentProjectId, setShowProjectForm, orgId }: Props) => {
  const router = useRouter()
  const { t } = useTranslation('common')
  const [form, setForm] = useState<{ trigger: UseFormTrigger<any>; getValues: UseFormGetValues<any> } | null>(null)
  const [isValid, setIsValid] = useState(false)

  const { data: projectList }: UseQueryResult<ListProjectDtoOut | undefined, Error> = useQuery({
    queryKey: ['list-project', currentProjectId, orgId],
    queryFn: () => projects.list({ organizationId: orgId }),
  })

  const schema = Yup.object().shape({
    projectId: Yup.string().uuid().required(),
  })

  const { control, getValues, trigger, watch } = useForm({
    resolver: yupResolver(schema),
    defaultValues: currentProjectId ? { projectId: currentProjectId } : undefined,
  })

  const watchedProjectId = watch('projectId')

  const onSave = useCallback(
    (values: FormValues) => {
      const params = new URLSearchParams()
      params.append('name', values.name)
      params.append('serviceId', values.serviceId.toString())
      params.append('rootModelId', values.rootModelId.toString())
      params.append('modelIds', values.modelIds.join(','))
      params.append('openFrom', 'gallery')
      if (imageData?.imageId) {
        params.append('imageId', imageData.imageId)
      }
      router.push(`/project/${values.projectId}/task/create?${params.toString()}`)
    },
    [router, imageData],
  )

  const onSubmit = useCallback(async () => {
    const [isValid, isTaskValid] = await Promise.all([trigger(), form?.trigger()])
    if (!isValid || !isTaskValid) return
    const values = getValues()
    const taskValues = form?.getValues()
    onSave({ ...values, ...taskValues })
  }, [trigger, form, getValues, onSave])

  const isDisabled = useMemo(() => {
    return !isValid || !watchedProjectId
  }, [isValid, watchedProjectId])

  return (
    <>
      <DialogContent>
        <div className='mb-4 flex justify-end'>
          <Button startIcon={<AddIcon />} variant='contained' onClick={() => setShowProjectForm(true)}>
            {t('gallery.action.task.titleProject')}
          </Button>
        </div>
        <div>
          <form className='grid grid-cols-1 gap-2'>
            <div className='mb-2 flex flex-col'>
              <InputLabel required>{t('gallery.action.task.taskForm.project')}</InputLabel>
              <Controller
                control={control}
                name='projectId'
                render={({ field, fieldState }) => (
                  <Autocomplete
                    options={projectList?.data || []}
                    getOptionLabel={(opt) => opt.name}
                    value={projectList?.data?.find((s) => String(s.id) === String(field.value)) ?? null}
                    onChange={(_, v) => {
                      const id = v ? v.id : undefined
                      field.onChange(id)
                      //   handleChangeService(id)
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={t('gallery.action.task.taskForm.project')}
                        fullWidth
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message ?? ''}
                      />
                    )}
                    disabled={!projectList || projectList?.data?.length <= 0}
                  />
                )}
              />
            </div>
          </form>
          <EditTaskForm
            isOpenFromGallery
            isProcessed={imageData?.isProcessed}
            defaultServiceId={imageData?.serviceId}
            setForm={setForm}
            setIsValid={setIsValid}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color='inherit'>
          {t('button.cancel')}
        </Button>
        <Button disabled={isDisabled} onClick={onSubmit}>
          {t('button.ok')}
        </Button>
      </DialogActions>
    </>
  )
}

export default TaskForm
