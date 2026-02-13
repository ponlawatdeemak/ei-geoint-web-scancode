'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControlLabel, Checkbox } from '@mui/material'
import { useTranslation } from 'react-i18next'

type FileTypeOption = {
  value: string
  label: string
}

const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  { value: 'application/zip', label: 'zip' },
  { value: 'application/geo+json', label: 'geojson' },
]

type SelectDownloadFileTypeDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: (selectedFileTypes: string[]) => void
}

const SelectDownloadFileTypeDialog = ({ open, onClose, onConfirm }: SelectDownloadFileTypeDialogProps) => {
  const { t } = useTranslation('common')
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([])

  // Default to 'application/zip' whenever the dialog is opened
  useEffect(() => {
    if (open) setSelectedFileTypes(['application/zip'])
  }, [open])

  const handleToggle = (value: string) => {
    setSelectedFileTypes((prev) => (prev.includes(value) ? prev.filter((type) => type !== value) : [...prev, value]))
  }

  const handleConfirm = () => {
    if (selectedFileTypes.length > 0) {
      onConfirm(selectedFileTypes)
      setSelectedFileTypes([])
      onClose()
    }
  }

  const handleCancel = () => {
    setSelectedFileTypes([])
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='sm' fullWidth>
      <DialogTitle>{t('map.selectFileTypeToDownload')}</DialogTitle>
      <DialogContent>
        <div className='pb-1'>{t('map.selectFileTypeDescription')}</div>
        <div className='flex flex-col gap-0'>
          {FILE_TYPE_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              control={
                <Checkbox
                  checked={selectedFileTypes.includes(option.value)}
                  onChange={() => handleToggle(option.value)}
                />
              }
              label={option.label}
            />
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color='inherit'>
          {t('button.cancel')}
        </Button>
        <Button onClick={handleConfirm} color='primary' disabled={selectedFileTypes.length === 0}>
          {t('button.ok')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SelectDownloadFileTypeDialog
