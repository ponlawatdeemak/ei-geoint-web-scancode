'use client'

import { useMediaQuery, useTheme } from '@mui/material'

// xs: 0,
// sm: 640,
// md: 768,
// lg: 1024,
// xl: 1280,

const useResponsive = () => {
  const theme = useTheme()
  const isMd = useMediaQuery(theme.breakpoints.up(768))
  const isLg = useMediaQuery(theme.breakpoints.up(1024)) // desktop
  const is2K = useMediaQuery(theme.breakpoints.up(2560))

  return { isMd, isLg, is2K }
}

export default useResponsive
