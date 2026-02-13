import { Box, Dialog, DialogContent, DialogTitle, useMediaQuery } from '@mui/material'
import { FC, memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ImageIcon from '@mui/icons-material/Image'
import theme from '@/styles/theme'
import LinearProgressWithLabel from '@/components/common/display/UploadProgress/LinearProgressWithLabel'
import { ImageUploadStep } from '@/components/common/images/images'

interface PhotoLoadingProps {
  currentFile: { file: File; current: number; total: number }
}

const PhotoLoading: FC<PhotoLoadingProps> = ({ currentFile }) => {
  const { t } = useTranslation('common')
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'))
  const fileExt = useMemo(() => currentFile.file.name.split('.').pop()?.toUpperCase(), [currentFile.file])
  return (
    <Dialog
      open={true}
      maxWidth='md'
      fullWidth
      fullScreen={isSmallScreen}
      sx={{ '& .MuiDialog-paper': { maxHeight: { xs: '100vh', md: '90vh' }, m: { xs: 0, md: 2 } } }}
    >
      <DialogTitle>{t('itv.upload.loading.title')}</DialogTitle>
      <DialogContent>
        <Box className='relative mb-6 rounded-lg bg-(--color-background-light) p-3 pr-2 shadow-sm sm:p-4'>
          <div className='flex flex-col items-center gap-3 pr-8 md:flex-row md:items-start md:gap-4'>
            <div className='flex-shrink-0'>
              <div className='flex flex-col items-center gap-1'>
                <ImageIcon className='text-[#0E94FA]' sx={{ fontSize: { xs: 56, sm: 72 } }} aria-hidden='true' />
                <div className='text-center font-normal text-xs sm:text-sm'>{fileExt}</div>
              </div>
            </div>

            <div className='flex w-full grow flex-col gap-2'>
              <div className='rounded-md p-2 sm:p-4'>
                <span className='mr-2 text-(--color-text-secondary) text-xs sm:text-sm'>
                  {t('itv.upload.loading.fileName')}:
                </span>
                <span className='font-semibold text-sm sm:text-base'>{currentFile.file.name}</span>
              </div>
            </div>
          </div>
        </Box>
        <LinearProgressWithLabel
          uploadStep={ImageUploadStep.Upload}
          value={(currentFile.current / currentFile.total) * 100}
        />
      </DialogContent>
    </Dialog>
  )
}

export default memo(PhotoLoading)
