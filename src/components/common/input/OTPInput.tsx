'use client'

import React, { useRef } from 'react'

interface OTPInputProps {
  className?: string
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const OTPInput: React.FC<OTPInputProps> = ({ className, length = 6, value, onChange, disabled = false }) => {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replaceAll(/\D/g, '')
    if (!val) return
    const chars = val.split('')
    let newValue = value.split('')
    for (let i = 0; i < chars.length && idx + i < length; i++) {
      newValue[idx + i] = chars[i]
    }
    newValue = newValue.slice(0, length)
    onChange(newValue.join(''))
    // Move focus
    const nextIdx = Math.min(newValue.join('').length, idx + chars.length, length - 1)
    if (inputs.current[nextIdx]) inputs.current[nextIdx]?.focus()
  }

  // Handle paste event to support pasting the entire OTP
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replaceAll(/\D/g, '')
    if (paste.length !== length) return
    onChange(paste)
    // Move focus to last digit
    setTimeout(() => {
      inputs.current[length - 1]?.focus()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      if (value[idx]) {
        // Clear current
        const newValue = value.split('')
        newValue[idx] = ''
        onChange(newValue.join(''))
      } else if (idx > 0) {
        // Move to previous
        inputs.current[idx - 1]?.focus()
        const newValue = value.split('')
        newValue[idx - 1] = ''
        onChange(newValue.join(''))
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      inputs.current[idx + 1]?.focus()
    }
  }

  return (
    <div className={`flex flex-col items-center ${className || ''}`}>
      <div className='mb-2 flex gap-2'>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el
            }}
            type='text'
            inputMode='numeric'
            maxLength={1}
            className='h-12 w-12 rounded-md border bg-white text-center text-2xl focus:outline-none'
            value={value[i] || ''}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={(e) => handlePaste(e)}
            disabled={disabled}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default OTPInput
