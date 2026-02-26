'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hook/useSettings'
import MuiTableHOC, { MuiTableColumn } from '@/components/common/display/MuiTableHOC'
import { SortType } from '@interfaces/config'
import {
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Typography,
} from '@mui/material'
import Autocomplete, { type AutocompleteRenderInputParams } from '@mui/material/Autocomplete'
import SearchIcon from '@mui/icons-material/Search'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import dayjs, { type Dayjs } from 'dayjs'
import TableRowsIcon from '@mui/icons-material/TableRows'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import MapIcon from '@mui/icons-material/Map'
import Tooltip from '@mui/material/Tooltip'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DateRangePicker from '../common/datepicker/DateRangePicker'

export type DisplayMode = 'table' | 'card' | 'map'
export type SelectOption = {
  id: string | number
  name?: string
  nameEn?: string
}

export interface FilterFieldConfig {
  name: string
  label: string
  type: 'text' | 'select' | 'dateRange'
  options?: SelectOption[] | (() => Promise<SelectOption[]>)
  placeholder?: string
  minWidth?: number
  isPrimary?: boolean
  slotProps?: Record<string, unknown>
  disabled?: boolean
  /** Autocomplete suggestions for text fields - shown as dropdown options */
  autocompleteOptions?: Array<{ label: string; value: string }>
  /** Sub-options for cascading autocomplete - keyed by prefix (e.g., 'status:' => status options) */
  autocompleteSubOptions?: Record<string, Array<{ label: string; value: string }>>
  onChange?: (
    value: unknown,
    filters: Record<string, string>,
    helpers: {
      setSelectOptions: (value: unknown) => void
      setSelectLoading: (value: unknown) => void
    },
  ) => Promise<Record<string, string>>
  className?: string
}

interface SearchWrapperProps<T extends { id: string | number }> {
  columns: MuiTableColumn<T>[]
  filtersConfig: FilterFieldConfig[]
  onSearch: (
    filters: Record<string, string>,
    page?: number,
    rowsPerPage?: number,
    sortState?: { orderBy: string; order: SortType },
  ) => Promise<{ rows: T[]; totalRows: number }>
  onClear?: (helpers: {
    setSelectOptions: (value: unknown) => void
    setSelectLoading: (value: unknown) => void
  }) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T, onComplete?: () => void) => void
  onMultiDelete?: (selectedRowKeys: (string | number)[], onComplete?: () => void) => void
  onRowClick?: (row: T) => void
  initialFilters?: Record<string, string>
  initialRowsPerPage?: number
  initialSort?: { orderBy: string; order: SortType }
  /** Optional controlled selection keys forwarded to the table */
  selectedRowKeys?: (string | number)[]
  /** Callback when selection changes in the table */
  onSelectionChange?: (selected: (string | number)[]) => void
  /** Optional callback to mark rows unselectable. Return false to disable selection for a row */
  isRowSelectable?: (row: T) => boolean
  /** Optional render function for card mode - when provided, SearchWrapper will call it with all rows */
  renderCard?: (rows: T[]) => React.ReactNode
  /** Optional render function for map mode - when provided, SearchWrapper will call it with all rows */
  renderMap?: (rows: T[]) => React.ReactNode
  /** Optional initial display mode: 'table' | 'card' | 'map' (default 'table') */
  initialDisplayMode?: DisplayMode
  /** Controlled display mode - when provided SearchWrapper becomes controlled and will use this mode */
  displayMode?: DisplayMode
  /** Callback when parent wants to change display mode (used in controlled mode) */
  onDisplayModeChange?: (mode: DisplayMode) => void
  /** Hide internal display-mode toggles (useful when toggles are rendered externally) */
  hideModeToggles?: boolean
  /** Hide the inline Clear and Search header buttons and per-field search adornments */
  hideButtons?: boolean
  /** When true, changes to non-primary filter fields auto-apply the search (primary fields still require Enter) */
  autoSearchOnChange?: boolean
  exLoading?: boolean
}

interface SearchAutocompleteProps {
  field: FilterFieldConfig
  value: string
  onUpdate: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  searchButton?: React.ReactNode
  t: (key: string) => string
}

const SearchAutocomplete = ({ field, value, onUpdate, onKeyDown, searchButton, t }: SearchAutocompleteProps) => {
  const [showSubOptions, setShowSubOptions] = useState<string | null>(null)
  const currentValue = value || ''

  let activeOptions = field.autocompleteOptions || []
  let activePrefix = ''
  let isShowingSubOptions = false

  if (showSubOptions && field.autocompleteSubOptions && field.autocompleteSubOptions[showSubOptions]) {
    if (currentValue.toLowerCase().startsWith(showSubOptions.toLowerCase())) {
      activePrefix = showSubOptions
      activeOptions = field.autocompleteSubOptions[showSubOptions]
      isShowingSubOptions = true
    } else {
      if (showSubOptions !== null) setShowSubOptions(null)
    }
  }

  const shouldForceOpen = isShowingSubOptions && currentValue === activePrefix

  return (
    <Autocomplete<{ label: string; value: string }, false, false, true>
      key={field.name + (isShowingSubOptions ? '-sub' : '')}
      freeSolo
      open={shouldForceOpen ? true : undefined}
      options={activeOptions}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option
        return option.label
      }}
      inputValue={currentValue}
      onInputChange={(_, newValue, reason) => {
        if (reason === 'reset') return
        onUpdate(newValue)
      }}
      onChange={(_, newValue) => {
        if (newValue && typeof newValue === 'object' && 'value' in newValue) {
          const selectedValue = newValue.value
          if (!isShowingSubOptions && field.autocompleteSubOptions && field.autocompleteSubOptions[selectedValue]) {
            setShowSubOptions(selectedValue)
            onUpdate(selectedValue)
          } else if (isShowingSubOptions) {
            const finalValue = activePrefix + selectedValue
            onUpdate(finalValue)
            setShowSubOptions(null)
          } else {
            onUpdate(selectedValue)
          }
        }
      }}
      filterOptions={(options, state) => {
        const inputLower = state.inputValue.toLowerCase()

        if (isShowingSubOptions && activePrefix) {
          const afterPrefix = state.inputValue.slice(activePrefix.length).toLowerCase()
          if (!afterPrefix) return options
          return options.filter(
            (opt) => opt.label.toLowerCase().includes(afterPrefix) || opt.value.toLowerCase().includes(afterPrefix),
          )
        }
        if (!state.inputValue) return options

        if (field.autocompleteOptions) {
          for (const opt of field.autocompleteOptions) {
            if (inputLower.startsWith(opt.value.toLowerCase())) {
              return []
            }
          }
        }

        return options.filter(
          (opt) => opt.label.toLowerCase().includes(inputLower) || opt.value.toLowerCase().includes(inputLower),
        )
      }}
      renderInput={(params: AutocompleteRenderInputParams) => (
        <TextField
          {...params}
          name={field.name}
          size='small'
          variant='outlined'
          label={t(field.label)}
          placeholder={field.placeholder ? t(field.placeholder) : ''}
          disabled={field.disabled}
          onKeyDown={onKeyDown}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {params.InputProps.endAdornment}
                  {searchButton}
                </>
              ),
            },
          }}
          className={field.className}
        />
      )}
    />
  )
}

function SearchWrapper<T extends { id: string | number }>({
  columns,
  filtersConfig,
  onSearch,
  onClear,
  onEdit,
  onDelete,
  onMultiDelete,
  onRowClick,
  initialFilters = {},
  initialRowsPerPage = 10,
  initialSort = { orderBy: '', order: SortType.ASC },
  selectedRowKeys,
  onSelectionChange,
  isRowSelectable,
  renderCard,
  renderMap,
  initialDisplayMode = 'table',
  displayMode: propDisplayMode,
  onDisplayModeChange,
  hideModeToggles = false,
  hideButtons = false,
  autoSearchOnChange = false,
  exLoading = false,
}: Readonly<SearchWrapperProps<T>>) {
  const { t } = useTranslation('common')
  const { language } = useSettings()
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>(initialFilters)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)
  const [rows, setRows] = useState<T[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sortState, setSortState] = useState<{
    orderBy: string
    order: SortType
  }>(initialSort)
  const [displayModeState, setDisplayModeState] = useState<DisplayMode>(initialDisplayMode ?? 'table')
  const currentDisplayMode = useMemo(() => propDisplayMode ?? displayModeState, [propDisplayMode, displayModeState])
  const setCurrentDisplayMode = React.useCallback(
    (m: DisplayMode) => {
      if (propDisplayMode === undefined) {
        setDisplayModeState(m)
      } else {
        onDisplayModeChange?.(m)
      }
    },
    [propDisplayMode, onDisplayModeChange],
  )
  // For async select options
  const [selectOptions, setSelectOptions] = useState<Record<string, SelectOption[]>>({})
  const [selectLoading, setSelectLoading] = useState<Record<string, boolean>>({})

  // Helper to update a single filter value and optionally auto-apply the search
  const updateFilter = async (config: FilterFieldConfig, name: string, value: string, isPrimary = false) => {
    let newFilters = { ...filters, [name]: value }
    if (config.onChange) {
      newFilters = await config.onChange(value, newFilters, {
        setSelectOptions: setSelectOptions as any,
        setSelectLoading: setSelectLoading as any,
      })
    }
    setFilters(newFilters)
    if (autoSearchOnChange && !isPrimary) {
      // apply immediately and reset to first page
      setAppliedFilters(newFilters)
      setPage(0)
    }
  }

  useEffect(() => {
    setLoading(exLoading)
  }, [exLoading])

  // ensure we don't stay in an unsupported display mode when renderers are absent
  useEffect(() => {
    // when current mode becomes unsupported, fallback to table
    if (currentDisplayMode === 'card' && !renderCard) {
      setCurrentDisplayMode('table')
    }
    if (currentDisplayMode === 'map' && !renderMap) {
      setCurrentDisplayMode('table')
    }
  }, [currentDisplayMode, renderCard, renderMap, setCurrentDisplayMode])

  // compute how many display modes are available (table is always available)
  const availableModesCount = 1 + (renderCard ? 1 : 0) + (renderMap ? 1 : 0)

  // debounce/dedupe helpers for onSearch to avoid multiple calls when switching display modes
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchCounterRef = useRef(0)

  useEffect(() => {
    // Debounce and dedupe calls to onSearch to avoid multiple rapid invocations
    // (for example when toggling display modes or during React Strict Mode double-mounts).
    setLoading(true)

    // increment counter to mark a new fetch session; previous responses will be ignored
    fetchCounterRef.current += 1
    const sessionId = fetchCounterRef.current

    // clear any pending timer and start a short debounce window
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current)
    }

    // small debounce (100ms) to batch rapid changes into a single request
    fetchTimerRef.current = globalThis.setTimeout(() => {
      const doSearch = async () => {
        let result: { rows: T[]; totalRows: number } | undefined
        try {
          // call onSearch once with appropriate pagination args
          if (currentDisplayMode === 'table') {
            result = await onSearch(appliedFilters, page, rowsPerPage, sortState)
          } else {
            result = await onSearch(appliedFilters, undefined, undefined, sortState)
          }
        } finally {
          // always clear loading for the active session; actual state updates guarded below
          if (sessionId === fetchCounterRef.current) setLoading(false)
        }

        if (sessionId !== fetchCounterRef.current) return

        // if we have a result, apply it depending on mode
        if (!result) return
        const { rows: newRows, totalRows: newTotal } = result
        if (currentDisplayMode === 'table') {
          if (page === 0 || newRows.length > 0) {
            setRows(newRows)
            setTotalRows(newTotal)
          } else {
            const lastPage = Math.max(0, Math.ceil(newTotal / rowsPerPage) - 1)
            setPage(lastPage)
          }
        } else {
          setRows(newRows)
          setTotalRows(newTotal)
        }
      }

      void doSearch()
    }, 200)

    return () => {
      // cancel pending timer and mark session as stale so any inflight promise results are ignored
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current)
        fetchTimerRef.current = null
      }
      fetchCounterRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page, rowsPerPage, sortState, onSearch, currentDisplayMode])

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: FilterFieldConfig,
  ) => {
    // backward-compatible: if field provided, prefer its isPrimary flag
    const name = e.target.name
    const isPrimary = field ? Boolean(field.isPrimary) : false
    updateFilter(field, name, e.target.value, isPrimary)
  }
  const handleSearch = () => {
    setAppliedFilters(filters)
    setPage(0)
  }
  const handleClear = () => {
    setFilters(initialFilters)
    if (onClear) {
      onClear({
        setSelectOptions: setSelectOptions as any,
        setSelectLoading: setSelectLoading as any,
      })
    }
  }
  const handleSortChange = useCallback((orderBy: string, order: SortType) => {
    setSortState({ orderBy, order })
  }, [])

  // Fetch async options for select fields
  useEffect(() => {
    for (const field of filtersConfig) {
      if (field.type === 'select' && typeof field.options === 'function') {
        const name = field.name
        if (!selectOptions[name] && !selectLoading[name]) {
          setSelectLoading((prev) => ({ ...prev, [name]: true }))
          field.options().then((opts) => {
            setSelectOptions((prev) => ({ ...prev, [name]: opts }))
            setSelectLoading((prev) => ({ ...prev, [name]: false }))
          })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersConfig, selectLoading, selectOptions])

  const handlePrimaryTextFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // prevent form submits or other handlers
      e.preventDefault()
      handleSearch()
    }
  }

  const renderTextField = (field: FilterFieldConfig) => {
    const searchButton = field.isPrimary ? (
      <InputAdornment position='end'>
        <IconButton onClick={handleSearch} edge='end'>
          <SearchIcon />
        </IconButton>
      </InputAdornment>
    ) : undefined

    // If autocompleteOptions provided, use the internal SearchAutocomplete component
    if (field.autocompleteOptions && field.autocompleteOptions.length > 0) {
      return (
        <SearchAutocomplete
          key={field.name}
          field={field}
          value={filters[field.name] || ''}
          onUpdate={(val) => updateFilter(field, field.name, val, Boolean(field.isPrimary))}
          onKeyDown={field.isPrimary ? handlePrimaryTextFieldKeyDown : undefined}
          searchButton={searchButton}
          t={t}
        />
      )
    }

    return (
      <TextField
        key={field.name}
        name={field.name}
        value={filters[field.name] || ''}
        onChange={(e) => handleFilterChange(e, field)}
        onKeyDown={field.isPrimary ? handlePrimaryTextFieldKeyDown : undefined}
        size='small'
        variant='outlined'
        label={t(field.label)}
        placeholder={field.placeholder ? t(field.placeholder) : ''}
        sx={field.minWidth ? { minWidth: field.minWidth } : {}}
        disabled={field.disabled}
        slotProps={
          field.slotProps && searchButton
            ? {
                ...field.slotProps,
                input: {
                  endAdornment: searchButton,
                  ...(field.slotProps.input as Record<string, unknown> | undefined),
                },
              }
            : {
                input: {
                  endAdornment: searchButton,
                },
              }
        }
      />
    )
  }

  const renderSelectField = (field: FilterFieldConfig) => {
    let options: SelectOption[] = []
    let loadingOpt = false
    if (typeof field.options === 'function') {
      options = selectOptions[field.name] || []
      loadingOpt = selectLoading[field.name]
    } else if (Array.isArray(field.options)) {
      options = field.options
    }
    return (
      <Autocomplete<SelectOption, false, false, false>
        key={field.name}
        sx={field.minWidth ? { minWidth: field.minWidth } : {}}
        options={options}
        noOptionsText={t('filter.noOptions')}
        getOptionKey={(opt: SelectOption) => String(opt.id)}
        getOptionLabel={(opt: SelectOption) => (language === 'th' ? opt.name || '' : opt.nameEn || opt.name || '')}
        value={
          options.find((o) => String(o.id) === String(filters[field.name])) || (null as unknown as SelectOption | null)
        }
        onChange={(_: React.SyntheticEvent, v: SelectOption | null) => {
          updateFilter(field, field.name, v ? String(v.id) : '', Boolean(field.isPrimary))
        }}
        disabled={field.disabled || loadingOpt}
        renderInput={(params: AutocompleteRenderInputParams) => (
          <TextField
            {...params}
            size='small'
            label={t(field.label)}
            placeholder={field.placeholder ? t(field.placeholder) : ''}
            variant='outlined'
            slotProps={
              field.slotProps
                ? {
                    ...field.slotProps,
                    select: {
                      native: false,
                      ...(field.slotProps.select as Record<string, unknown> | undefined),
                    },
                  }
                : { select: { native: false } }
            }
            disabled={field.disabled || loadingOpt}
            className={field.className}
          />
        )}
      />
    )
  }

  const renderDateRangeField = (field: FilterFieldConfig) => {
    const name = field.name
    const fromKey = `${name}From`
    const toKey = `${name}To`
    const startVal = filters[fromKey] || ''
    const endVal = filters[toKey] || ''

    const startDay = startVal ? dayjs(startVal) : null
    const endDay = endVal ? dayjs(endVal) : null

    return (
      <div
        key={name}
        className='flex items-center gap-2 lg:col-span-2'
        style={field.minWidth ? { minWidth: field.minWidth } : {}}
      >
        <DateRangePicker
          startDay={startDay}
          endDay={endDay}
          disabled={field.disabled}
          onStartDateChange={(v: Dayjs | null) =>
            updateFilter(field, fromKey, v ? v.format('YYYY-MM-DD') : '', Boolean(field.isPrimary))
          }
          onEndDateChange={(v: Dayjs | null) =>
            updateFilter(field, toKey, v ? v.format('YYYY-MM-DD') : '', Boolean(field.isPrimary))
          }
          startLabel={t(field.label)}
          className={field.className}
        />
        {field.isPrimary && !hideButtons && (
          <IconButton onClick={handleSearch} size='small' aria-label='search'>
            <SearchIcon />
          </IconButton>
        )}
      </div>
    )
  }

  const renderFilterField = (field: FilterFieldConfig) => {
    if (field.type === 'text') return renderTextField(field)
    if (field.type === 'select') return renderSelectField(field)
    if (field.type === 'dateRange') return renderDateRangeField(field)
    return null
  }

  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const openFilterDialog = () => setFilterDialogOpen(true)
  const closeFilterDialog = () => setFilterDialogOpen(false)
  const handleDialogApply = () => {
    closeFilterDialog()
  }
  const handleDialogClear = () => {
    handleClear()
  }

  const filterGridCount = filtersConfig.length + filtersConfig.filter((f) => f.type === 'dateRange').length
  const gridCols: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  }

  return (
    <div className='flex h-full w-full flex-col gap-4 bg-(--color-background-default)'>
      <div className='md:px-4 md:pt-4'>
        <div className='w-full bg-white px-4 pb-2 md:rounded-2xl md:py-4'>
          <div className='flex flex-col items-center gap-2 md:gap-4'>
            <div
              className={`hidden w-full gap-2 md:grid md:grid-cols-2 lg:w-auto ${gridCols[filterGridCount] || 'lg:grid-cols-5'}`}
            >
              {/* lg:min-w-245 */}
              {filtersConfig.map(renderFilterField)}
            </div>
            <div className='flex w-full items-start gap-2 md:hidden'>
              <div className='flex flex-1 flex-col gap-2'>
                {filtersConfig.filter((f) => f.isPrimary).map(renderFilterField)}
              </div>
              <IconButton onClick={openFilterDialog} size='small'>
                <FilterAltOutlinedIcon />
              </IconButton>
            </div>
            <Dialog open={filterDialogOpen} onClose={closeFilterDialog} fullWidth maxWidth='sm'>
              <DialogTitle>{t('filter.dialogTitle')}</DialogTitle>
              <DialogContent>
                <div className='mt-2 grid w-full grid-cols-1 gap-4'>
                  {filtersConfig.filter((f) => !f.isPrimary).map(renderFilterField)}
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDialogClear} color='inherit'>
                  {t('button.clear')}
                </Button>
                <Button onClick={handleDialogApply} color='primary'>
                  {t('button.ok')}
                </Button>
              </DialogActions>
            </Dialog>
            {!hideButtons && (
              <div className='hidden items-center gap-2 md:flex'>
                <Button onClick={handleClear} variant='outlined' sx={{ minWidth: 80 }} disabled={loading}>
                  {t('button.clear')}
                </Button>
                <Button
                  onClick={handleSearch}
                  variant='contained'
                  color='primary'
                  sx={{ minWidth: 80 }}
                  disabled={loading}
                >
                  {t('button.search')}
                </Button>
                {availableModesCount > 1 && !hideModeToggles && (
                  <div className='ml-2 flex items-center gap-1'>
                    {renderCard && (
                      <Tooltip title={t('view.card')} arrow>
                        <IconButton
                          size='small'
                          color={currentDisplayMode === 'card' ? 'primary' : 'default'}
                          onClick={() => setCurrentDisplayMode('card')}
                        >
                          <ViewModuleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={t('view.table')} arrow>
                      <IconButton
                        size='small'
                        color={currentDisplayMode === 'table' ? 'primary' : 'default'}
                        onClick={() => setCurrentDisplayMode('table')}
                      >
                        <TableRowsIcon />
                      </IconButton>
                    </Tooltip>
                    {renderMap && (
                      <Tooltip title={t('view.map')} arrow>
                        <IconButton
                          size='small'
                          color={currentDisplayMode === 'map' ? 'primary' : 'default'}
                          onClick={() => setCurrentDisplayMode('map')}
                        >
                          <MapIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {useMemo(
        () => (
          <div className={`flex flex-1 overflow-hidden ${currentDisplayMode === 'table' ? 'md:px-4 md:pb-4' : ''}`}>
            <div
              className={`relative flex min-h-0 w-full flex-1 flex-col overflow-hidden ${currentDisplayMode === 'table' ? 'bg-white md:rounded-2xl' : ''}`}
            >
              {currentDisplayMode === 'table' && (
                <MuiTableHOC
                  columns={columns}
                  rows={rows}
                  rowKey={(row: T) => row.id}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  totalRows={totalRows}
                  onPageChange={setPage}
                  onRowsPerPageChange={setRowsPerPage}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMultiDelete={onMultiDelete}
                  onRowClick={onRowClick}
                  isRowSelectable={isRowSelectable}
                  selectedRowKeys={selectedRowKeys}
                  onSelectionChange={onSelectionChange}
                  sortState={sortState}
                  onSortChange={handleSortChange}
                />
              )}
              {currentDisplayMode === 'card' && renderCard && (
                <div className='flex flex-col overflow-hidden'>
                  <div className='flex items-center justify-between px-4'>
                    <Typography className='py-4' variant='subtitle2'>
                      {t('table.totalSearchResult', { count: totalRows })}
                    </Typography>
                    <div className='flex items-center gap-2'>
                      {columns.some((c) => c.sortable) && (
                        <FormControl size='small' sx={{ minWidth: 160 }}>
                          <InputLabel>{t('table.sortBy') || 'Sort by'}</InputLabel>
                          <Select
                            labelId='sort-field-label'
                            value={sortState.orderBy}
                            label={t('table.sortBy') || 'Sort by'}
                            onChange={(e) => handleSortChange(String(e.target.value), sortState.order)}
                          >
                            {columns
                              .filter((c) => c.sortable)
                              .map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                  {typeof c.label === 'string' ? c.label : String(c.id)}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      )}
                      <Tooltip
                        title={sortState.order === SortType.ASC ? t('table.asc') || 'Asc' : t('table.desc') || 'Desc'}
                      >
                        <IconButton
                          size='small'
                          color='primary'
                          onClick={() =>
                            handleSortChange(
                              sortState.orderBy,
                              sortState.order === SortType.ASC ? SortType.DESC : SortType.ASC,
                            )
                          }
                        >
                          {sortState.order === SortType.DESC ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                  {renderCard(rows)}
                </div>
              )}
              {currentDisplayMode === 'map' && renderMap?.(rows)}
              {loading && (
                <div className='absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center backdrop-blur-sm'>
                  <CircularProgress size={80} color='primary' />
                </div>
              )}
            </div>
          </div>
        ),
        [
          currentDisplayMode,
          rows,
          page,
          rowsPerPage,
          totalRows,
          sortState,
          loading,
          columns,
          onEdit,
          onDelete,
          onMultiDelete,
          onRowClick,
          isRowSelectable,
          selectedRowKeys,
          onSelectionChange,
          renderCard,
          renderMap,
          t,
          handleSortChange,
        ],
      )}
    </div>
  )
}

export default SearchWrapper
