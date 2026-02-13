'use client'

import React from 'react'

interface InputLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const InputLabel: React.FC<InputLabelProps> = ({ className, children, required, ...props }) => {
  return (
    <label className={`block text-sm ${className || ''}`} {...props}>
      {children} {required && <span className='text-error'>*</span>}
    </label>
  )
}

export default InputLabel
