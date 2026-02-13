import React from 'react'
import { Button } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import { useTranslation } from 'react-i18next'

type Props = {
  statusId: number
  onDownloadAnalysisData: () => void
  onOpenSaveDialog: () => void
}

const SarTaskActions: React.FC<Props> = ({ statusId, onDownloadAnalysisData, onOpenSaveDialog }) => {
  const { t } = useTranslation('common')

  return (
    <div className='p-2' data-status={statusId}>
      <div className='mb-4 flex w-full flex-row gap-2 border-(--color-gray-border) border-b pb-6'>
        <Button
          startIcon={<DownloadIcon />}
          color='inherit'
          fullWidth
          variant='outlined'
          className='border-(--color-gray-border)!'
          sx={{ px: 1.2 }}
          onClick={onDownloadAnalysisData}
        >
          {t('map.downloadAnalysisData')}
        </Button>
        <Button
          startIcon={<UploadIcon />}
          color='inherit'
          fullWidth
          variant='outlined'
          className='border-(--color-gray-border)!'
          onClick={onOpenSaveDialog}
          sx={{ px: 1.2 }}
        >
          {t('map.saveAnalysisResult')}
        </Button>
      </div>
    </div>
  )
}

export default SarTaskActions
