'use client'

import React, { useState } from 'react'
import TextField, { TextFieldProps } from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

const PasswordInput: React.FC<TextFieldProps> = (props) => {
  const [show, setShow] = useState(false)
  return (
    <TextField
      {...props}
      type={show ? 'text' : 'password'}
      slotProps={{
        ...(props.slotProps || {}),
        input: {
          ...(props.slotProps?.input || {}),
          endAdornment: (
            <InputAdornment position='end'>
              <IconButton onClick={() => setShow((s) => !s)} edge='end'>
                {show ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}

export default PasswordInput
