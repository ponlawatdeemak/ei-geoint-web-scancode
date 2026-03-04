'use client'

import React, { useState } from 'react'
import { Button, Menu, MenuItem } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { TaskMode } from '@interfaces/config'
import type { FormValues } from '../hooks/types'

interface TaskFormActionsProps {
  taskStatusId: number
  activeStep: number
  viewOnly: boolean
  loading: boolean
  watchedServiceId?: number
  enableNextButton: string | number | boolean | undefined
  enableSaveDraftButton: string | number | boolean | undefined
  enableSaveAndProcessButton: boolean
  handleSubmit: (fn: (data: FormValues) => void) => () => void
  save: (mode: TaskMode) => (data: FormValues) => Promise<void>
  saveName: () => (data: FormValues) => Promise<void>
  setActiveStep: React.Dispatch<React.SetStateAction<number>>
  handleCancel: () => void
  t: (key: string) => string
}

const TaskFormActions: React.FC<TaskFormActionsProps> = ({
  taskStatusId,
  activeStep,
  viewOnly,
  loading,
  watchedServiceId,
  enableNextButton,
  enableSaveDraftButton,
  enableSaveAndProcessButton,
  handleSubmit,
  save,
  saveName,
  setActiveStep,
  handleCancel,
  t,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)

  return (
    <div className='flex justify-end gap-2'>
      {taskStatusId === 1 && (!viewOnly || activeStep > 0) && (
        <Button className='md:hidden! min-w-0! px-2!' variant='outlined' onClick={handleMenuOpen} disabled={loading}>
          <MoreVertIcon />
        </Button>
      )}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {taskStatusId === 1 && activeStep > 0 && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              setActiveStep((prev) => prev - 1)
            }}
          >
            {t('form.taskForm.button.back')}
          </MenuItem>
        )}
        {!viewOnly && taskStatusId === 1 && (
          <MenuItem
            disabled={!enableSaveDraftButton}
            onClick={() => {
              setAnchorEl(null)
              handleSubmit(save(TaskMode.save))()
            }}
          >
            {t('form.taskForm.button.saveDraft')}
          </MenuItem>
        )}
      </Menu>
      {taskStatusId === 1 && activeStep > 0 && (
        <Button
          className='hidden! md:flex!'
          variant='outlined'
          disabled={loading}
          onClick={() => setActiveStep((prev) => prev - 1)}
        >
          {t('form.taskForm.button.back')}
        </Button>
      )}
      <div className='flex-grow' />
      <Button variant='outlined' startIcon={<CloseIcon />} disabled={loading} onClick={handleCancel}>
        {t(viewOnly ? 'button.close' : 'button.cancel')}
      </Button>
      {taskStatusId === 1 ? (
        <>
          {!viewOnly && (
            <Button
              className='hidden! md:flex!'
              variant='outlined'
              startIcon={<SaveIcon />}
              disabled={!enableSaveDraftButton}
              loading={loading}
              onClick={handleSubmit(save(TaskMode.save))}
            >
              {t('form.taskForm.button.saveDraft')}
            </Button>
          )}
          {(activeStep === 0 || (watchedServiceId === 2 && activeStep === 1)) && (
            <Button
              variant='contained'
              color='primary'
              endIcon={<ChevronRightIcon />}
              disabled={!enableNextButton}
              loading={loading}
              onClick={() => setActiveStep((prev) => prev + 1)}
            >
              {t('form.taskForm.button.next')}
            </Button>
          )}
          {!viewOnly &&
            ((watchedServiceId === 1 && activeStep === 1) || (watchedServiceId === 2 && activeStep === 2)) && (
              <Button
                variant='contained'
                startIcon={<SaveIcon />}
                color='primary'
                disabled={!enableSaveAndProcessButton}
                loading={loading}
                onClick={handleSubmit(save(TaskMode.saveAndProcess))}
              >
                {t('form.taskForm.button.saveAndProcess')}
              </Button>
            )}
        </>
      ) : (
        !viewOnly && (
          <Button
            variant='contained'
            startIcon={<SaveIcon />}
            color='primary'
            loading={loading}
            onClick={handleSubmit(saveName())}
          >
            {t('button.save')}
          </Button>
        )
      )}
    </div>
  )
}

export default TaskFormActions
