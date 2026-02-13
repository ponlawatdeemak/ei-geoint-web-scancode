import React, { useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import xmlFormatter from 'xml-formatter'
import { Button } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  onChange?: (v: string) => void
  maxSize?: number
  disabled?: boolean
  className?: string
}

const DEFAULT_MAX = 1024 * 1024 // 1MB

const detectFormat = (v: string) => {
  const t = v.trim()
  if (!t) return 'json'
  if (t.startsWith('{') || t.startsWith('[')) return 'json'
  if (t.startsWith('<')) return 'xml'
  return 'json'
}

const MetadataEditor: React.FC<Props> = ({
  value,
  onChange,
  maxSize = DEFAULT_MAX,
  disabled = false,
  className = '',
}) => {
  const { t } = useTranslation('common')
  const [format, setFormat] = useState<'json' | 'xml'>(() => detectFormat(value))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFormat(detectFormat(value))
  }, [value])

  const extensions = useMemo(() => {
    return format === 'json' ? [json()] : [xml()]
  }, [format])

  const handleFormat = () => {
    if (!value || !onChange) return
    try {
      if (format === 'json') {
        const parsed = JSON.parse(value)
        const pretty = JSON.stringify(parsed, null, 2)
        onChange(pretty)
        setError(null)
      } else {
        const pretty = xmlFormatter(value, { indentation: '  ' })
        onChange(pretty)
        setError(null)
      }
    } catch (err) {
      const e = err as Error | undefined
      setError(e?.message || 'Invalid content')
    }
  }

  const handleValidate = (): boolean => {
    if (!value) {
      setError(null)
      return false
    }
    try {
      if (format === 'json') {
        JSON.parse(value)
      } else {
        const parser = new DOMParser()
        const doc = parser.parseFromString(value, 'application/xml')
        const errs = doc.getElementsByTagName('parsererror')
        if (errs && errs.length > 0) throw new Error('XML parse error')
      }
      setError(null)
      return true
    } catch (err) {
      const e = err as Error | undefined
      setError(e?.message || 'Invalid content')
      return false
    }
  }

  const handleValidateAndFormat = () => {
    if (!value) return
    const ok = handleValidate()
    if (ok) {
      handleFormat()
    }
  }

  const sizeOk = value ? new Blob([value]).size <= maxSize : true

  return (
    <div className={`flex min-h-[240px] w-full flex-col pt-2 ${className}`}>
      <div className='overflow-hidden rounded-md border border-(--color-gray-border)'>
        <CodeMirror
          editable={!disabled}
          value={value}
          height='220px'
          extensions={extensions}
          onChange={(v) => onChange?.(v)}
        />
      </div>
      {!disabled && (
        <>
          {error && <p className='mt-2 block text-red-600 text-xs sm:text-sm'>{error}</p>}
          <div className='my-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center'>
            <Button size='small' onClick={handleValidateAndFormat} disabled={!value || !sizeOk}>
              {t('metadata.validateAndFormat')}
            </Button>
            {!sizeOk && (
              <p className='text-red-600 text-xs sm:text-sm'>
                {t('metadata.exceedsSize', { size: Math.round(maxSize / 1024) })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default MetadataEditor
