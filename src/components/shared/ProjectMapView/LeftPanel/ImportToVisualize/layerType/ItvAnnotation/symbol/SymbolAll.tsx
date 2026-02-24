import React, { useState } from 'react'
import Accordion from '@mui/material/Accordion'
import Image from 'next/image'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { app6eData } from '../data/app6e'
import { App6eMainIcon, App6eSymbolSet } from '@interfaces/entities'
import { ArrowForwardIosSharp } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import ms from 'milsymbol'

type Props = {
  onSelect?: (data: { sidc: string; icon: App6eMainIcon; symbolSet: App6eSymbolSet }) => void
}

const SymbolAll: React.FC<Props> = ({ onSelect }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const { t, i18n } = useTranslation('common')

  const getSIDC = (symbolset: string, code: string) => {
    return `1403${symbolset.padStart(2, '0')}0000${code.padStart(6, '0')}0000`
  }

  return (
    <div>
      {Object.values(app6eData)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item, index) => {
          const isOpen = !!open[item.symbolset]

          return (
            <Accordion
              key={item.symbolset}
              expanded={isOpen}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedGroup(item.symbolset)
                // onOpenGroup(group)
              }}
              disableGutters
              elevation={0}
              className='mb-1 rounded border border-(--color-gray-border)'
              sx={{ '&:before': { display: 'none' } }}
              slotProps={{ transition: { timeout: 300 } }}
            >
              <AccordionSummary
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen((prev) => ({ ...prev, [item.symbolset]: !prev[item.symbolset] }))
                }}
                component='div'
                className={`h-12 min-h-6 px-2 pr-1!`}
              >
                <div className={`ml-1 flex w-full items-center justify-between`}>
                  <div className='grid w-full grid-cols-[1rem_1fr] gap-1'>
                    <div className='flex items-center'>
                      <button
                        type='button'
                        aria-expanded={isOpen}
                        className={`inline-flex h-4 w-4 shrink-0 transform cursor-pointer items-center justify-center p-1 text-(--color-text-icon) transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'}`}
                      >
                        <ArrowForwardIosSharp fontSize='small' className='h-2 w-2' />
                      </button>
                    </div>
                    <Typography noWrap>{item.name}</Typography>
                  </div>
                </div>
              </AccordionSummary>

              <AccordionDetails className='pt-2 pb-2'>
                <div className='flex flex-wrap gap-1'>
                  {item.mainIcon.map((icon) => {
                    const sidc = getSIDC(item.symbolset, icon.code)
                    const symbol = new ms.Symbol(sidc, { size: 40 })
                    const url = symbol.toDataURL()

                    return (
                      <Tooltip
                        key={icon.code}
                        title={
                          <div className='p-1'>
                            <Typography variant='subtitle2' className='font-bold'>
                              {icon.name}
                            </Typography>
                            <div className='mt-1 text-xs'>
                              <div>
                                <span className=''>Entity: </span>
                                {icon.entity}
                              </div>
                              <div>
                                <span className=''>Entity Type: </span>
                                {icon.entityType || '-'}
                              </div>
                              <div>
                                <span className=''>Entity Subtype: </span>
                                {icon.entitySubtype || '-'}
                              </div>
                              <div>
                                <span className=''>Code: </span>
                                {icon.code}
                              </div>
                            </div>
                          </div>
                        }
                        arrow
                        placement='top'
                      >
                        <button
                          type='button'
                          onClick={() => onSelect?.({ sidc, icon, symbolSet: item })}
                          className='flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-2 hover:bg-[#E0E9FF]'
                        >
                          <Image
                            src={url}
                            alt={icon.name}
                            width={40}
                            height={40}
                            style={{ width: '2.5rem', height: '2.5rem' }}
                          />
                        </button>
                      </Tooltip>
                    )
                  })}
                </div>
              </AccordionDetails>
            </Accordion>
          )
        })}
    </div>
  )
}

export default SymbolAll
