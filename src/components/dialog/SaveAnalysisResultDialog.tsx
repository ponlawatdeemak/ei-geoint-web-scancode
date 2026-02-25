'use client'

import React, { useRef, useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import InputLabel from '@/components/common/input/InputLabel'
import { useTranslation } from 'react-i18next'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import service from '@/api'
import { TaskStatus } from '@interfaces/config'
import useResponsive from '@/hook/responsive'

interface SaveAnalysisResultDialogProps {
  taskId: string
  taskStatusId: TaskStatus
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const MAX_BYTES = 500 * 1024 * 1024 // 500 MB

export default function SaveAnalysisResultDialog({
  taskId,
  open,
  onClose,
  onSaved,
  taskStatusId,
}: SaveAnalysisResultDialogProps) {
  const { t } = useTranslation('common')
  const { showAlert } = useGlobalUI()
  // default to 'success'
  const [status, setStatus] = useState<'success' | 'failed'>('success')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [saving, setSaving] = useState(false)
  const { is2K } = useResponsive()

  useEffect(() => {
    if (open) {
      setStatus('success')
      setSelectedFile(null)
      setSelectedFileName(null)
    }
  }, [open])

  const handleStatusChange = (_: React.ChangeEvent<HTMLInputElement>, value: string) => {
    const next = value === 'success' ? 'success' : 'failed'
    setStatus(next)
    // When switching to failed, clear file selection and hide upload
    if (next === 'failed') {
      setSelectedFile(null)
      setSelectedFileName(null)
    }
  }

  const handleChooseFile = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    // validate .zip extension
    const name = f.name || ''
    if (!name.toLowerCase().endsWith('.zip')) {
      setSelectedFile(null)
      setSelectedFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showAlert({
        status: 'error',
        content: t('dialog.saveAnalysisResult.invalidFileFormat'),
      })
      return
    }

    // validate size
    if (f.size > MAX_BYTES) {
      setSelectedFile(null)
      setSelectedFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showAlert({
        status: 'error',
        content: t('dialog.saveAnalysisResult.invalidFileFormat'),
      })
      return
    }

    // valid
    setSelectedFile(f)
    setSelectedFileName(f.name)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setSelectedFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = () => {
    if (taskStatusId === TaskStatus.waitingForResults) {
      save()
    } else {
      showAlert({
        status: 'confirm-save',
        title: t('dialog.saveAnalysisResult.confirmSaveTitle'),
        content: t('dialog.saveAnalysisResult.confirmSaveContent'),
        showCancel: true,
        onConfirm: () => save(),
      })
    }
  }

  const save = async () => {
    try {
      setSaving(true)
      if (status === 'success' && selectedFile) {
        const fd = new FormData()
        fd.append('file', selectedFile)
        fd.append('id', taskId)
        await service.tasks.saveAnalysisResultSuccess(fd)
      } else {
        await service.tasks.saveAnalysisResultFailed(taskId)
      }
      showAlert({ status: 'success', title: t('alert.saveSuccess') })
      onSaved()
    } catch (err: any) {
      showAlert({
        status: 'error',
        errorCode: err?.message,
        title: t('alert.errorTitle'),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} fullWidth disableEscapeKeyDown maxWidth={is2K ? 'lg' : 'sm'}>
      <DialogTitle>{t('dialog.saveAnalysisResult.title')}</DialogTitle>
      <DialogContent>
        <InputLabel>{t('dialog.saveAnalysisResult.analysisResult')}</InputLabel>
        <RadioGroup className='flex' row value={status} onChange={handleStatusChange}>
          <FormControlLabel
            className='flex-1'
            value='success'
            control={<Radio />}
            label={t('dialog.saveAnalysisResult.success')}
            disabled={saving}
          />
          <FormControlLabel
            className='flex-1'
            value='failed'
            control={<Radio />}
            label={t('dialog.saveAnalysisResult.failed')}
            disabled={saving}
          />
        </RadioGroup>

        {/* Upload area only when status is success */}
        {status === 'success' && (
          <div className='mt-4'>
            <input ref={fileInputRef} className='hidden' type='file' accept='.zip' onChange={onFileChange} />
            <InputLabel>{t('dialog.saveAnalysisResult.uploadAnalysisFile')}</InputLabel>

            <div className='rounded-lg border border-primary border-dashed p-6 text-center'>
              <Button
                variant='contained'
                startIcon={<CloudUploadIcon />}
                onClick={handleChooseFile}
                disabled={!!selectedFileName || saving}
              >
                {t('dialog.saveAnalysisResult.chooseFile')}
              </Button>
              <div className='mt-2 text-(--color-text-secondary) text-sm'>
                {t('dialog.saveAnalysisResult.supportedFileTypes')}
              </div>
            </div>

            {/* If selected file exists, show a list-like item with delete */}
            {selectedFileName && (
              <div className='mt-4 flex items-center rounded-xs bg-(--color-background-default) px-2 py-0.5'>
                <div className='flex items-center'>
                  <InsertDriveFileIcon />
                </div>
                <div className='mx-2 flex-1 truncate text-left text-sm'>{selectedFileName}</div>
                <IconButton size='small' color='error' onClick={handleRemoveFile} disabled={saving}>
                  <DeleteIcon fontSize='small' />
                </IconButton>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='inherit' disabled={saving}>
          {t('button.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          color='primary'
          variant='contained'
          loading={saving}
          disabled={saving || (status === 'success' && !selectedFile)}
        >
          {t('button.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
