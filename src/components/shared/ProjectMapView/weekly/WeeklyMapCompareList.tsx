import { useEffect, useState, useRef } from 'react'
import {
  Box,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  ListItemIcon,
  Tooltip,
} from '@mui/material'

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { visuallyHidden } from '@mui/utils'
import { formatDate } from '@/utils/formatDate'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import BorderAllIcon from '@mui/icons-material/BorderAll'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import UpdateIcon from '@mui/icons-material/Update'
import { useSettings } from '@/hook/useSettings'
import { useTranslation } from 'react-i18next'
import PushPinIcon from '@mui/icons-material/PushPin'
import { useWeeklyMapCompareStore } from './store/useWeeklyMapCompareStore'
import { useWeeklyMapStore } from './store/useWeeklyMapStore'
import { useShallow } from 'zustand/shallow'
import { PostSearchFeaturesWeeklyDtoIn, SortType } from '@interfaces/index'
import { TaskFeature } from '@interfaces/index'
import { getGroupedKeys, txtModel } from '../utils/utils'

interface WeeklyMapCompareListProps {
  onDateSelect: (data: TaskFeature) => void
  selectedDate1: TaskFeature | null
  selectedDate2: TaskFeature | null
}

const WeeklyMapCompareList: React.FC<WeeklyMapCompareListProps> = ({ onDateSelect, selectedDate1, selectedDate2 }) => {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const [isMounted, setIsMounted] = useState(false)
  const isFirstLoadRef = useRef(true)
  const { selectedModels, order: weeklyOrder } = useWeeklyMapStore()

  const {
    data,
    loading,
    page,
    pageCount,
    order,
    search,
    nextPage,
    prevPage,
    setOrder,
    total,
    tokenPrevious,
    tokenNext,
  } = useWeeklyMapCompareStore()

  const latestParams = useWeeklyMapStore(
    useShallow((state) => ({
      startDate: state.startDate,
      endDate: state.endDate,
      selectedAreas: state.selectedAreas,
      selectedModels: state.selectedModels,
      rowsPerPage: state.rowsPerPage,
    })),
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      const { startDate, endDate, selectedAreas, selectedModels, rowsPerPage } = latestParams
      const { areaKeys, collectionKeys, modelKeys } = getGroupedKeys(selectedAreas, selectedModels)

      // Use weeklyOrder for first load, then use order
      const sortOrderToUse = isFirstLoadRef.current ? weeklyOrder : order
      isFirstLoadRef.current = false

      const params: PostSearchFeaturesWeeklyDtoIn = {
        collectionKeys,
        modelKeys,
        areaKeys,
        startDate: startDate?.toISOString() || '',
        endDate: endDate?.toISOString() || '',
        limit: rowsPerPage,
        sortField: 'imaging_date',
        sortOrder: sortOrderToUse,
      }

      search(params)
    }
  }, [isMounted, latestParams, search, order, weeklyOrder])

  const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
    if (value > page) {
      nextPage()
    } else {
      prevPage()
    }
  }

  const handleSortRequest = () => {
    setOrder(order === SortType.ASC ? SortType.DESC : SortType.ASC)
  }

  const handleSelectData = (item: TaskFeature) => {
    onDateSelect(item)
  }

  if (!isMounted) {
    return null
  }

  return (
    <Paper sx={{ width: '100%', boxShadow: 'none' }}>
      {loading ? (
        <Box className='flex items-center justify-center p-4'>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 0,
            }}
          >
            <Typography className='text-left' variant='subtitle2' component='label'>
              {t('table.totalResult', { count: total })}
            </Typography>
            <IconButton onClick={handleSortRequest}>
              {/* {order === 'desc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />} */}

              {order === 'desc' ? (
                <Tooltip title={t('table.desc')} arrow>
                  <ArrowDownwardIcon />
                </Tooltip>
              ) : (
                <Tooltip title={t('table.asc')} arrow>
                  <ArrowUpwardIcon />
                </Tooltip>
              )}
              <Box component='span' sx={visuallyHidden}>
                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
              </Box>
            </IconButton>
          </Box>
          <List sx={{ p: 0 }}>
            {data.map((row) => {
              const isSelected1 = selectedDate1 && selectedDate1.date === row.date
              const isSelected2 = selectedDate2 && selectedDate2.date === row.date
              const isSelected = isSelected1 || isSelected2
              const modelData = txtModel(row, selectedModels)

              return (
                <ListItem
                  key={row.date}
                  className={`${isSelected ? 'bg-(--color-background-dark) text-white' : 'bg-(--color-background-light) text-inherit'} border-white border-b-2 last:border-b-0 hover:cursor-pointer ${!isSelected ? 'hover:bg-[#e0e0e0]' : ''}`}
                  onClick={() => handleSelectData(row)}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
                    <BorderAllIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <div>
                          <span className='!text-sm'>{formatDate(row.date || '', language, true)}</span>
                        </div>
                        <div className='ml-auto flex items-center gap-1'>
                          {modelData.changeDetection && (
                            <Tooltip title={t('map.weeklyChangeDetection')} arrow>
                              <div className='inline-flex items-center gap-1'>
                                <UpdateIcon fontSize='small' />
                                <span className='!text-sm'>{modelData.changeDetection}</span>
                              </div>
                            </Tooltip>
                          )}
                          {modelData.changeDetection && modelData.objectDetection && (
                            <span className='!text-sm'> </span>
                          )}
                          {modelData.objectDetection && (
                            <Tooltip title={t('map.weeklyObjectDetection')} arrow>
                              <div className='inline-flex items-center gap-1'>
                                <ViewInArIcon fontSize='small' />
                                <span className='!text-sm'>{modelData.objectDetection}</span>
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      </Box>
                    }
                  />
                  {isSelected && <PushPinIcon sx={{ color: 'white' }} />}
                </ListItem>
              )
            })}
          </List>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <IconButton
              onClick={() => prevPage()}
              disabled={!tokenPrevious}
              className='bg-black/30 text-white hover:bg-black/50'
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant='subtitle2' className='pt-1.5'>
              {t('table.page')} {page} {t('table.from')} {pageCount}
            </Typography>
            <IconButton
              onClick={() => nextPage()}
              disabled={!tokenNext}
              className='bg-[rgba(129,50,50,0.3)] text-white hover:bg-[rgba(0,0,0,0.5)]'
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </>
      )}
    </Paper>
  )
}

export default WeeklyMapCompareList
