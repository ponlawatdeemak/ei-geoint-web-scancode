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
  Menu,
  MenuItem,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { visuallyHidden } from '@mui/utils'
import { formatDate } from '@/utils/formatDate'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import BorderAllIcon from '@mui/icons-material/BorderAll'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import UpdateIcon from '@mui/icons-material/Update'
import { useSettings } from '@/hook/useSettings'
import { useTranslation } from 'react-i18next'
import { useWeeklyMapStore } from './store/useWeeklyMapStore'
import { Roles, SortType } from '@interfaces/config'
import { TaskDownloadItem, TaskFeature, TaskLayer } from '@interfaces/index'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProfileStore } from '@/hook/useProfileStore'
import SelectDownloadFileTypeDialog from '@/components/dialog/SelectDownloadFileTypeDialog'
import { useGlobalUI } from '@/providers/global-ui/GlobalUIContext'
import { downloadFileItem } from '@/utils/download'
import { txtModel } from '../utils/utils'
import ShareApiDialog from '@/components/common/dialog/ShareApiDialog'
import ShareIcon from '@mui/icons-material/Share'
import DownloadIcon from '@mui/icons-material/Download'

interface SearchResultProps {
  onSelected?: (data: TaskLayer[]) => void // โยนออกไปที่ Map
}

const SearchResult: React.FC<SearchResultProps> = ({ onSelected }) => {
  const {
    data,
    loading,
    total,
    selectedData,
    setSelectedData,
    order,
    setOrder,
    tokenNext,
    tokenPrevious,
    page,
    pageCount,
    nextPage,
    prevPage,
    setIsOpenWeeklyGroupPanel,
  } = useWeeklyMapStore()

  const { t } = useTranslation('common')

  const { language } = useSettings()
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [menuRow, setMenuRow] = useState<TaskFeature | null>(null)
  const { selectedModels } = useWeeklyMapStore()
  const [showDownloadFileTypeDialog, setShowDownloadFileTypeDialog] = useState(false)
  const { showAlert } = useGlobalUI()
  const profile = useProfileStore((state) => state.profile)
  const [showShareApiDialog, setShowShareApiDialog] = useState(false)

  const handleSortRequest = () => {
    setOrder(order === SortType.ASC ? SortType.DESC : SortType.ASC)
  }

  // Set default sort order to DESC on first mount
  useEffect(() => {
    setOrder(SortType.DESC)
  }, [setOrder])

  const download = useCallback(
    async (menuRow: TaskFeature | null, fileTypes: string[]) => {
      // const layerData = await weekly.postSearchLayers(menuRow?.layer || [])
      const keyModelSelect = selectedModels.flatMap((m) => m.keys)
      // Merge all downloads from all layers in all features
      const downloadItems = (menuRow?.layer || [])
        .flatMap((layer: TaskLayer) => layer.downloads || [])
        .filter(
          (d: TaskDownloadItem) =>
            d.model_id === 'tile' || (keyModelSelect.includes(d.model_id || '') && fileTypes.includes(d.type || '')),
        )

      if (downloadItems.length === 0) {
        showAlert({
          status: 'error',
          content: t('map.pleaseSelectDataToDownload'),
        })
        return
      }

      // Download file items
      for (const item of downloadItems) {
        await downloadFileItem(item.href)
      }
    },
    [selectedModels.flatMap, showAlert, t],
  )

  const isOrgApiSharingEnabled = useMemo(() => {
    return profile?.organization.isApiSharingEnabled
  }, [profile])

  const isViewer = useMemo(() => {
    return profile && profile.roleId === Roles.viewer
  }, [profile])

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
            {data.map((row, i) => {
              const isSelected = selectedData && selectedData.date === row.date
              const modelData = txtModel(row, selectedModels)
              return (
                <ListItem
                  key={i}
                  className={`pr-1! pl-4! ${isSelected ? 'bg-(--color-background-dark) text-white' : 'bg-(--color-background-light) text-inherit'} border-white border-b-2 last:border-b-0 hover:cursor-pointer ${!isSelected ? 'hover:bg-[#e0e0e0]' : ''}`}
                  onClick={() => {
                    setIsOpenWeeklyGroupPanel(true)
                    setSelectedData(row)
                    if (row.layer && onSelected) onSelected(row.layer)
                  }}
                >
                  <ListItemIcon sx={{ color: isSelected ? '#fff' : 'inherit', minWidth: '36px' }}>
                    <BorderAllIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <div className='flex flex-wrap items-center gap-2'>
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
                      </div>
                    }
                  />

                  {profile && ![Roles.viewer].includes(profile.roleId) && (
                    <Tooltip title={t('button.more')} arrow>
                      <IconButton
                        size='small'
                        color={'default'}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuAnchorEl(e.currentTarget as HTMLElement)
                          setMenuRow(row)
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItem>
              )
            })}
          </List>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={() => {
              setMenuAnchorEl(null)
              setMenuRow(null)
            }}
          >
            <MenuItem
              onClick={() => {
                setShowDownloadFileTypeDialog(true)
              }}
            >
              <ListItemIcon>
                <DownloadIcon fontSize='small' />
              </ListItemIcon>
              {t('button.download')}
            </MenuItem>
            {isOrgApiSharingEnabled && !isViewer && (
              <MenuItem
                onClick={() => {
                  setShowShareApiDialog(true)
                  setMenuAnchorEl(null)
                }}
              >
                <ListItemIcon>
                  <ShareIcon fontSize='small' />
                </ListItemIcon>
                {t('dialog.shareApi.title')}
              </MenuItem>
            )}
          </Menu>
          <SelectDownloadFileTypeDialog
            open={showDownloadFileTypeDialog}
            onClose={() => {
              setShowDownloadFileTypeDialog(false)
            }}
            onConfirm={(selectedFileTypes) => {
              if (menuRow) {
                download(menuRow, selectedFileTypes)
              }
              setMenuAnchorEl(null)
              setMenuRow(null)
            }}
          />
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
      {showShareApiDialog && (
        <ShareApiDialog
          open={showShareApiDialog}
          onClose={() => {
            setShowShareApiDialog(false)
            setMenuRow(null)
          }}
          data={menuRow}
          shareType='weekly'
        />
      )}
    </Paper>
  )
}

export default SearchResult
