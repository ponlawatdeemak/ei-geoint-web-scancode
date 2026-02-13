import { SearchImagesDtoOut } from '@interfaces/dto/images'
import { FC, useCallback, useMemo, useState } from 'react'
import CardItem from './CardItem'
import { ImageSortBy } from '../../images'
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TablePagination,
  Tooltip,
  Typography,
  Divider,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useImages } from '../../use-images'
import { SortType } from '@interfaces/config'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'

type Props = {
  data: SearchImagesDtoOut
  currentPage?: number
  onPageChange?: (page: number) => void
  pageUse: 'gallery' | 'task' | 'itv'
}

const ResultCard: FC<Props> = ({ data, currentPage = 1, onPageChange, pageUse }: Props) => {
  const { t } = useTranslation('common')
  const { imageSort, setImageSort, pageSize, setPageSize } = useImages()

  const handleSortChange = useCallback(
    (orderBy: ImageSortBy, order: SortType) => {
      setImageSort({ orderBy, order })
    },
    [setImageSort],
  )

  const totalCount = useMemo(() => {
    return data.total ?? 0
  }, [data.total])

  const handlePageChange = useCallback(
    (page: number) => {
      onPageChange?.(page)
    },
    [onPageChange],
  )

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between px-4 pt-4 lg:h-[70px] lg:px-0'>
        <div>
          <Typography className='py-4' variant='subtitle2'>
            {t('table.totalSearchResult', { count: totalCount })}
          </Typography>
        </div>
        <div className='flex items-center gap-1'>
          <FormControl size='small' sx={{ minWidth: 160 }}>
            <InputLabel>{t('table.sortBy') || 'Sort by'}</InputLabel>
            <Select
              labelId='sort-field-label'
              value={imageSort.orderBy}
              label={t('table.sortBy') || 'Sort by'}
              onChange={(e) => handleSortChange(e.target.value as ImageSortBy, imageSort.order)}
            >
              <MenuItem value={ImageSortBy.Name}>{t('gallery.imagesSelector.sortBy.name')}</MenuItem>
              <MenuItem value={ImageSortBy.ImagingDate}>{t('gallery.imagesSelector.sortBy.imagingDate')}</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title={imageSort.order === SortType.ASC ? t('table.asc') || 'Asc' : t('table.desc') || 'Desc'} arrow>
            <IconButton
              size='small'
              color='primary'
              onClick={() =>
                handleSortChange(imageSort.orderBy, imageSort.order === SortType.ASC ? SortType.DESC : SortType.ASC)
              }
            >
              {imageSort.order === SortType.DESC ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <div className='grid flex-1 grid-cols-3 content-start gap-2 overflow-auto p-2'>
        {data?.data.map((item) => (
          <div key={item.id}>
            <CardItem item={item} />
          </div>
        ))}
      </div>

      {pageUse !== 'task' && (
        <div className='w-full'>
          <Divider />
          <TablePagination
            component='div'
            slotProps={{ select: { fullWidth: false } }}
            labelRowsPerPage={t('table.labelRowsPerPage')}
            labelDisplayedRows={({ from, to, count }) => t('table.labelDisplayedRows', { from, to, count })}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => setPageSize(Number.parseInt(e.target.value, 10))}
            count={data.total}
            page={currentPage - 1}
            onPageChange={(_, newPage) => handlePageChange(newPage + 1)}
          />
        </div>
      )}
    </div>
  )
}
export default ResultCard
