import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import { formatDate } from '@/utils/formatDate'
import {
  StepButton,
  StepConnector,
  stepConnectorClasses,
  styled,
  IconButton,
  useTheme,
  useMediaQuery,
  MobileStepper,
  Button,
} from '@mui/material'
import { useSettings } from '@/hook/useSettings'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import { useRef, useEffect as useReactEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWeeklyMapStore } from './store/useWeeklyMapStore'

interface DotIconProps {
  active: boolean
}
const DotIcon = ({ active }: DotIconProps) => {
  return (
    <div
      className={`h-2.75 w-2.75 rounded-full ${active ? 'bg-primary shadow-[0_0_0_6px_rgba(59,130,246,0.25)]' : 'bg-white shadow-none'}`}
    />
  )
}

const DateStepperConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 5,
    left: 'calc(-50% + 16px)',
    right: 'calc(50% + 16px)',
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: 'white',
    borderTopWidth: 2,
    borderRadius: 1,
  },
}))

const DateStepper: React.FC = () => {
  const {
    data,
    selectedData,
    setSelectedData,
    page,
    total,

    nextPage,
    prevPage,
    tokenNext,
    tokenPrevious,
    setIsOpenWeeklyGroupPanel,
  } = useWeeklyMapStore()

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { language } = useSettings()
  const { t } = useTranslation('common')

  const stepperContainerRef = useRef<HTMLDivElement | null>(null)
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Sort data by date (oldest to newest)
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date || '').getTime()
    const dateB = new Date(b.date || '').getTime()
    return dateA - dateB
  })

  const activeIndex = sortedData.findIndex((item) => item.date === selectedData?.date)

  const handleNext = () => {
    const nextIndex = activeIndex + 1
    if (nextIndex < sortedData.length) {
      setSelectedData(sortedData[nextIndex])
    } else {
      nextPage(true)
    }
  }

  const handleBack = () => {
    const prevIndex = activeIndex - 1
    if (prevIndex >= 0) {
      setSelectedData(sortedData[prevIndex])
    } else {
      prevPage(true)
    }
  }

  useReactEffect(() => {
    const activeEl = stepRefs.current[activeIndex]
    const container = stepperContainerRef.current
    if (activeEl && container) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeIndex])

  return data.length === 0 ? null : (
    <>
      {isMobile ? (
        <Box className='mb-1 flex min-w-fit transform items-center justify-center gap-2'>
          {selectedData && (
            <Box className='absolute bottom-18
             left-1/2 ml-2 -translate-x-1/2 whitespace-nowrap font-semibold text-[0.75rem] text-primary'>
              {formatDate(selectedData.date || '', language)}
            </Box>
          )}
          <MobileStepper
            variant='dots'
            steps={sortedData.length}
            position='static'
            activeStep={activeIndex}
            className='max-w-100 grow'
            sx={{
              backgroundColor: 'transparent',
            }}
            nextButton={
              <Button
                onClick={() => {
                  setIsOpenWeeklyGroupPanel(false)
                  handleNext()
                }}
                disabled={activeIndex === sortedData.length - 1}
                variant='outlined'
                size='small'
                className='weekly-compare !text-xs !py-0.5'
                endIcon={<ChevronRightIcon fontSize='small' />}
              >
                {t('button.next')}
              </Button>
            }
            backButton={
              <Button
                onClick={() => {
                  setIsOpenWeeklyGroupPanel(false)
                  handleBack()
                }}
                disabled={activeIndex === -1 || (activeIndex === 0 && page === 1)}
                variant='outlined'
                size='small'
                className='weekly-compare !text-xs !py-0.5'
                startIcon={<ChevronLeftIcon fontSize='small' />}
              >
                {t('button.previous')}
              </Button>
            }
          />
        </Box>
      ) : (
        // desktop stepper
        // - click next/back จะเป็นการเลื่อน "Page"
        <div className='flex items-center gap-2 pr-8 pl-8 pb-2'>
          <IconButton onClick={handleBack} disabled={activeIndex === 0} className='shrink-0'>
            <ChevronLeftIcon className='rounded-2xl bg-white/20 text-white hover:bg-white/50' />
          </IconButton>
          <div ref={stepperContainerRef} className='flex-1 overflow-x-auto overflow-y-hidden py-2'>
            <Stepper
              activeStep={activeIndex}
              nonLinear // Allow clicking any step
              alternativeLabel
              style={{
                minWidth: `${sortedData.length * 100}px`,
              }}
              connector={<DateStepperConnector />}
            >
              {sortedData.map((item, idx) => (
                <Step key={item.date}>
                  <StepButton
                    onClick={() => setSelectedData(item)}
                    ref={(el) => {
                      stepRefs.current[idx] = el
                    }}
                  >
                    <StepLabel
                      slots={{ stepIcon: DotIcon }}
                      slotProps={{
                        label: {
                          sx: {
                            color: item === selectedData ? 'primary.main' : 'white',
                          },
                        },
                      }}
                    >
                      {formatDate(item.date || '', language)}
                    </StepLabel>
                  </StepButton>
                </Step>
              ))}
            </Stepper>
          </div>
          <IconButton
            onClick={() => {
              setIsOpenWeeklyGroupPanel(false)
              handleNext()
            }}
            disabled={activeIndex === sortedData.length - 1}
            className='shrink-0'
          >
            <ChevronRightIcon className='rounded-2xl bg-white/20 text-white hover:bg-white/50' />
          </IconButton>
        </div>
      )}
      {/* </Box> */}
    </>
  )
}

export default DateStepper
