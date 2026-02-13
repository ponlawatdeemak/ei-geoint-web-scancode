import React, { useMemo, useState } from 'react'
import { InputAdornment, TextField, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import Image from 'next/image'
import { app6eData } from '../data/app6e'
import { App6eMainIcon, App6eSymbolSet } from '@interfaces/entities'
import ms from 'milsymbol'
import { useTranslation } from 'react-i18next'
import InputLabel from '@/components/common/input/InputLabel'

interface SearchOption {
  sidc: string
  icon: App6eMainIcon
  symbolSet: App6eSymbolSet
}

type Props = {
  onSelect?: (data: { sidc: string; icon: App6eMainIcon; symbolSet: App6eSymbolSet }) => void
}

const getSIDC = (symbolset: string, code: string) => {
  return `1403${symbolset.padStart(2, '0')}0000${code.padStart(6, '0')}0000`
}

const Search: React.FC<Props> = ({ onSelect }) => {
  const [results, setResults] = useState<SearchOption[]>([])
  const [searchTokens, setSearchTokens] = useState<string[]>([])
  const { t } = useTranslation('common')

  const allIcons = useMemo(() => {
    const icons: SearchOption[] = []
    for (const symbolSet of Object.values(app6eData)) {
      for (const icon of symbolSet.mainIcon) {
        icons.push({
          sidc: getSIDC(symbolSet.symbolset, icon.code),
          icon,
          symbolSet,
        })
      }
    }
    return icons
  }, [])

  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      setResults([])
      setSearchTokens([])
      return
    }

    const tokens = trimmed.toLowerCase().split(/\s+/)
    setSearchTokens(tokens)

    const filtered = allIcons
      .filter((opt) => {
        const name = opt.icon.name.toLowerCase()
        return tokens.every((token) => name.includes(token))
      })
      .slice(0, 10)
    setResults(filtered)
  }

  const HighlightedText = ({ text, tokens }: { text: string; tokens: string[] }) => {
    if (tokens.length === 0) return <>{text}</>

    const pattern = tokens
      .filter((t) => t.length > 0)
      .map((t) => t.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')) // escape regex chars
      .join('|')

    if (!pattern) return <>{text}</>

    const regex = new RegExp(`(${pattern})`, 'gi')
    const parts = text.split(regex)

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className='bg-blue-100 font-medium text-blue-700'>
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    )
  }

  return (
    <div className='flex h-full flex-col p-4 pt-0'>
      <InputLabel> {t('annotation.symbolSearch')}</InputLabel>
      <TextField
        fullWidth
        placeholder={t('annotation.symbolSearch')}
        size='small'
        onChange={(e) => handleSearch(e.target.value)}
        InputProps={{
          className: 'rounded-lg bg-white',
          endAdornment: (
            <InputAdornment position='end'>
              <SearchIcon color='action' fontSize='small' />
            </InputAdornment>
          ),
        }}
        className='mb-4'
      />

      <div className='flex-1 overflow-y-auto'>
        <div className='flex flex-col gap-1'>
          {results.map((item) => {
            const symbol = new ms.Symbol(item.sidc, { size: 40 })
            const url = symbol.toDataURL()
            return (
              <button
                key={`${item.symbolSet.symbolset}-${item.icon.code}`}
                type='button'
                onClick={() => onSelect?.(item)}
                className='flex w-full items-start gap-4 rounded p-3 text-left transition-colors hover:bg-[#E0E9FF]'
              >
                <div className='flex h-10 min-h-10 w-15 min-w-15 items-start justify-center'>
                  <Image
                    src={url}
                    alt={item.icon.name}
                    width={40}
                    height={40}
                    style={{ width: 'auto', height: 'auto' }}
                  />
                </div>
                <Typography variant='body2'>
                  <HighlightedText text={item.icon.name} tokens={searchTokens} />
                </Typography>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Search
