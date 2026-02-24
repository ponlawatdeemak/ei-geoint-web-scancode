import {
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { type Dayjs } from 'dayjs'

import { memo, PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SearchIcon from '@mui/icons-material/Search'
// import InfoIcon from '@mui/icons-material/Info'

import { SearchImagesDtoIn } from '@interfaces/dto/images'
import DateRangePicker from '../../datepicker/DateRangePicker'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import lookup from '@/api/lookup'
import { GetLookupDtoOut } from '@interfaces/dto/lookup'
import { ServiceConfig } from '@interfaces/config'

interface SearchPanelProps extends PropsWithChildren {
  onChange: (values: SearchImagesDtoIn) => void
  loading: boolean
}

type OptionType = {
  label: string
  value?: string
  type?: 'instruction' | 'service' | 'tag'
}

const SearchPrefix = {
  TYPE: 'type:',
  TAG: 'tag:',
  NAME: 'name:',
} as const

const SearchPanel = ({ onChange, loading = false, children }: SearchPanelProps) => {
  const { t } = useTranslation('common')
  const [searchValue, setSearchValue] = useState<{
    keyword: string
    tag: string
    startAt: Dayjs | null
    endAt: Dayjs | null
  }>({
    keyword: '',
    tag: '',
    startAt: null,
    endAt: null,
  })

  const [services, setServices] = useState<GetLookupDtoOut[]>([])
  const [options, setOptions] = useState<OptionType[]>([])
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)
  const shouldKeepOpen = useRef(false)
  const servicesFetched = useRef(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchServices = useCallback(async () => {
    if (servicesFetched.current) return
    servicesFetched.current = true
    try {
      const res = await lookup.get({ name: 'services' })
      setServices(res)
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }, [])

  // Helper to generate service options
  const getServiceOptions = useCallback(() => {
    return services
      .filter((s) => s.id !== ServiceConfig.weekly)
      .map((s) => ({ label: s.name, value: s.name, type: 'service' }) as OptionType)
  }, [services])

  // Update options when services are loaded, if we are in "type:" mode
  useEffect(() => {
    if (inputValue.toLowerCase().startsWith(SearchPrefix.TYPE) && services.length > 0) {
      setOptions(getServiceOptions())
    }
  }, [services, inputValue, getServiceOptions])

  const processSearchValues = useCallback(
    (values: typeof searchValue): SearchImagesDtoIn => {
      const rawInput = (values.keyword || '').trim()
      const startAt = values.startAt?.toDate()
      const endAt = values.endAt?.toDate()

      let keyword = ''
      let tag = (values.tag || '').trim()
      let serviceId: string | undefined

      if (!rawInput) {
        return {
          keyword: '',
          tag,
          startAt,
          endAt,
        }
      }

      if (rawInput.toLowerCase().startsWith(SearchPrefix.NAME)) {
        keyword = rawInput.substring(SearchPrefix.NAME.length).trim()
      } else if (rawInput.toLowerCase().startsWith(SearchPrefix.TAG)) {
        tag = rawInput.substring(SearchPrefix.TAG.length).trim()
      } else if (rawInput.toLowerCase().startsWith(SearchPrefix.TYPE)) {
        const typeValue = rawInput.substring(SearchPrefix.TYPE.length).trim().toLowerCase()

        // Prioritize known config types to ensure ID consistency with STAC
        if (typeValue === 'optical') {
          serviceId = String(ServiceConfig.optical)
        } else if (typeValue === 'sar') {
          serviceId = String(ServiceConfig.sar)
        } else {
          const matchedService = services.find((s) => {
            const isMatchTh = (s.name || '').toLowerCase() === typeValue
            const isMatchEn = (s.nameEn || '').toLowerCase() === typeValue
            return isMatchTh || isMatchEn
          })
          if (matchedService) {
            serviceId = String(matchedService.id)
          } else {
            keyword = rawInput.substring(SearchPrefix.TYPE.length).trim()
          }
        }
      } else {
        keyword = rawInput
      }

      return {
        keyword,
        tag,
        startAt,
        endAt,
        serviceId,
      }
    },
    [services],
  )

  const handleSearch = useCallback(() => {
    onChange(processSearchValues({ ...searchValue, keyword: inputValue }))
  }, [onChange, searchValue, processSearchValues, inputValue])

  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const openFilterDialog = useCallback(() => setFilterDialogOpen(true), [])
  const closeFilterDialog = useCallback(() => setFilterDialogOpen(false), [])
  const onFilter = useCallback(() => {
    onChange(processSearchValues({ ...searchValue, keyword: inputValue }))
    closeFilterDialog()
  }, [onChange, processSearchValues, searchValue, inputValue, closeFilterDialog])

  const onClear = useCallback(() => {
    setSearchValue({ keyword: '', tag: '', startAt: null, endAt: null })
    setInputValue('')
    onChange({ keyword: '', tag: '', startAt: undefined, endAt: undefined })
  }, [onChange])

  const defaultOption = useMemo(() => {
    return [
      { label: t('gallery.imagesSelector.search.prefixName'), value: SearchPrefix.NAME, type: 'instruction' },
      { label: t('gallery.imagesSelector.search.prefixType'), value: SearchPrefix.TYPE, type: 'instruction' },
      { label: t('gallery.imagesSelector.search.prefixTag'), value: SearchPrefix.TAG, type: 'instruction' },
    ] as OptionType[]
  }, [t])

  const handleInputChange = useCallback(
    (event: any, newInputValue: string, reason: string) => {
      if (reason === 'selectOption') {
        return
      }

      if (reason === 'reset') {
        const lowerNew = newInputValue.toLowerCase().trim()
        const hasContentAfterPrefix =
          (lowerNew.startsWith(SearchPrefix.TAG) && lowerNew.length > SearchPrefix.TAG.length) ||
          (lowerNew.startsWith(SearchPrefix.NAME) && lowerNew.length > SearchPrefix.NAME.length) ||
          (lowerNew.startsWith(SearchPrefix.TYPE) && lowerNew.length > SearchPrefix.TYPE.length)

        if (!hasContentAfterPrefix) {
          return
        }
      }

      if (reason === 'clear') {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
          debounceRef.current = null
        }
        setInputValue('')
        setSearchValue({ keyword: '', tag: '', startAt: searchValue.startAt, endAt: searchValue.endAt })
        onChange({ keyword: '', tag: '', startAt: searchValue.startAt?.toDate(), endAt: searchValue.endAt?.toDate() })
        setOptions(defaultOption)
        return
      }

      const lowerNewInput = newInputValue.toLowerCase().trim()
      const currentLower = inputValue.toLowerCase().trim()
      if (currentLower.startsWith(SearchPrefix.TYPE) && currentLower === `${SearchPrefix.TYPE}${lowerNewInput}`) {
        return
      }

      setInputValue(newInputValue)
      if (newInputValue) {
        setOpen(true)
      }
      const lowerInput = newInputValue.toLowerCase().trim()

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (!lowerInput) {
        setOptions(defaultOption)
        return
      }

      if (lowerInput.startsWith(SearchPrefix.TYPE)) {
        if (!servicesFetched.current) {
          fetchServices()
        }
        setOptions(getServiceOptions())
      } else if (lowerInput.startsWith(SearchPrefix.TAG)) {
        setOptions([])
      } else {
        setOptions([])
      }

      const hasTypeValue = lowerInput.startsWith(SearchPrefix.TYPE) && lowerInput.length > SearchPrefix.TYPE.length
      const hasTagValue = lowerInput.startsWith(SearchPrefix.TAG) && lowerInput.length > SearchPrefix.TAG.length
      const hasNameValue = lowerInput.startsWith(SearchPrefix.NAME) && lowerInput.length > SearchPrefix.NAME.length
      const isPlainSearch =
        !lowerInput.startsWith(SearchPrefix.TYPE) &&
        !lowerInput.startsWith(SearchPrefix.TAG) &&
        !lowerInput.startsWith(SearchPrefix.NAME)

      if (hasTypeValue || hasTagValue || hasNameValue || isPlainSearch) {
        debounceRef.current = setTimeout(() => {
          onChange(processSearchValues({ ...searchValue, keyword: newInputValue }))
        }, 1000)
      }
    },
    [fetchServices, getServiceOptions, onChange, processSearchValues, searchValue, defaultOption, inputValue],
  )

  const filterOptions = useCallback((options: OptionType[], params: any) => {
    const { inputValue } = params
    const lower = inputValue.toLowerCase().trim()
    if (!lower || lower === SearchPrefix.TYPE || lower === SearchPrefix.TAG) {
      return options
    }
    if (lower.startsWith(SearchPrefix.TYPE)) {
      const query = lower.replace(SearchPrefix.TYPE, '').trim()
      return options.filter((option) => option.label.toLowerCase().includes(query))
    }
    if (lower.startsWith(SearchPrefix.TAG)) {
      return options
    }
    return options.filter((option) => option.label.toLowerCase().includes(lower))
  }, [])

  const handleOpen = useCallback(() => {
    setOpen(true)
    if (!inputValue) {
      setOptions(defaultOption)
    }
    fetchServices()
  }, [inputValue, fetchServices, defaultOption])

  const handleClose = useCallback((event: any, reason: string) => {
    if (reason === 'selectOption' && shouldKeepOpen.current) {
      shouldKeepOpen.current = false
      return
    }
    setOpen(false)
  }, [])

  const getOptionLabel = useCallback((option: string | OptionType) => {
    return typeof option === 'string' ? option : option.label
  }, [])

  const handleAutocompleteChange = useCallback(
    (event: any, newValue: string | OptionType | null) => {
      if (typeof newValue === 'string') {
        // Free text entered
        setInputValue(newValue)
      } else if (newValue && typeof newValue !== 'string') {
        if (newValue.type === 'instruction') {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current)
            debounceRef.current = null
          }
          const finalVal = newValue.value || ''
          setInputValue(finalVal)

          if (finalVal === SearchPrefix.NAME) {
            setOpen(false)
            return
          } else if (finalVal === SearchPrefix.TYPE) {
            const relevantServices: OptionType[] = services
              .filter((s) => s.id !== ServiceConfig.weekly)
              .map((s) => ({ label: s.name, value: s.name, type: 'service' }) as OptionType)
            setOptions(relevantServices)
          } else if (finalVal === SearchPrefix.TAG) {
            setOptions([])
          }

          shouldKeepOpen.current = true
          setOpen(true)
        } else if (newValue.type === 'service') {
          // Clear any pending debounce to prevent old search from firing
          if (debounceRef.current) {
            clearTimeout(debounceRef.current)
            debounceRef.current = null
          }
          const finalVal = `${SearchPrefix.TYPE}${newValue.value}`
          setInputValue(finalVal)
          onChange(processSearchValues({ ...searchValue, keyword: finalVal }))
          setOpen(false)
        } else if (newValue.type === 'tag') {
          const finalVal = `${SearchPrefix.TAG}${newValue.value}`
          setInputValue(finalVal)
          onChange(processSearchValues({ ...searchValue, keyword: finalVal }))
          setOpen(false)
        }
      }
    },
    [services, onChange, processSearchValues, searchValue],
  )

  const handleStartDateChange = useCallback(
    (startAt: Dayjs | null) => {
      const newValue = { ...searchValue, startAt }
      setSearchValue(newValue)
      onChange(processSearchValues({ ...newValue, keyword: inputValue }))
    },
    [searchValue, onChange, processSearchValues, inputValue],
  )

  const handleEndDateChange = useCallback(
    (endAt: Dayjs | null) => {
      const newValue = { ...searchValue, endAt }
      setSearchValue(newValue)
      onChange(processSearchValues({ ...newValue, keyword: inputValue }))
    },
    [searchValue, onChange, processSearchValues, inputValue],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch()
        setOpen(false)
      }
    },
    [handleSearch],
  )

  return (
    <div className='flex w-full flex-col gap-4 p-4 lg:h-24 lg:flex-row lg:justify-between lg:p-0 2xl:h-10'>
      <div className='md:flex md:flex-col md:gap-4 lg:w-[80%] 2xl:flex-row'>
        <div className='flex flex-1 gap-2'>
          <Autocomplete
            freeSolo
            fullWidth
            open={open}
            filterOptions={filterOptions}
            onOpen={handleOpen}
            onClose={handleClose}
            options={options}
            getOptionLabel={getOptionLabel}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onChange={handleAutocompleteChange}
            renderInput={(params) => (
              <TextField
                {...params}
                variant='outlined'
                placeholder={t('gallery.imagesSelector.search.keyword')}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {params.InputProps.endAdornment}
                        <InputAdornment position='end'>
                          <IconButton edge='end' onClick={handleSearch}>
                            {loading ? <CircularProgress size={20} /> : <SearchIcon />}
                          </IconButton>
                        </InputAdornment>
                      </>
                    ),
                  },
                }}
                onKeyDown={handleKeyDown}
              />
            )}
          />

          <IconButton onClick={openFilterDialog} size='small' className='md:hidden!'>
            <FilterAltOutlinedIcon />
          </IconButton>
        </div>

        <div className='hidden flex-col items-center gap-2 md:flex 2xl:w-[70%]'>
          <DateRangePicker
            startDay={searchValue.startAt}
            endDay={searchValue.endAt}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            startLabel={t('gallery.imagesSelector.search.imagingDateRange')}
          />
        </div>
      </div>

      <div className='hidden lg:block lg:w-20'>{children}</div>
      <Dialog open={filterDialogOpen} onClose={closeFilterDialog} fullWidth maxWidth='sm'>
        <DialogTitle>{t('filter.dialogTitle')}</DialogTitle>
        <DialogContent>
          <div className='mt-2 grid w-full grid-cols-1 gap-4'>
            <DateRangePicker
              startDay={searchValue.startAt}
              endDay={searchValue.endAt}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              startLabel={t('gallery.imagesSelector.search.imagingDateRange')}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClear} color='inherit'>
            {t('button.clear')}
          </Button>
          <Button onClick={onFilter} color='primary'>
            {t('button.ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
export default memo(SearchPanel)
