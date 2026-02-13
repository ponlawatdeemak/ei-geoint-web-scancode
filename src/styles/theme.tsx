'use client'
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  cssVariables: true,
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  typography: {
    fontFamily: 'var(--font)',
  },
  palette: {
    primary: {
      main: '#0B76C8',
    },
    secondary: {
      main: '#f1592f',
    },
    warning: {
      main: '#FFA000',
    },
    error: {
      main: '#D32F2F',
    },
    success: {
      main: '#388E3C',
    },
    background: {
      default: '#F1F4FB',
      paper: '#ffffff',
    },
    action: {
      active: '#577592',
      selected: '#E4ECFF',
      disabled: '#B3B5B3',
      disabledBackground: '#f2f2f2',
    },
    text: {
      primary: '#0C2E50',
      secondary: '#818481',
    },
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            backgroundColor: 'var(--mui-palette-action-disabledBackground)',
          },
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          '&::placeholder': {
            opacity: 1,
            color: 'rgb(var(--mui-palette-text-secondaryChannel))',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
      },
    },
    MuiSelect: {
      defaultProps: {
        fullWidth: true,
        size: 'small',
      },
    },
    MuiIconButton: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'capitalize',
          '&.Mui-disabled': {
            color: '#9FA6AD',
          },
          '&.MuiButton-contained.Mui-disabled': {
            backgroundColor: '#F0F4F8',
          },
          '&.MuiButton-outlined:not(.MuiButton-outlinedError):not(.Mui-disabled)': {
            color: 'rgb(var(--mui-palette-text-primaryChannel))',
          },
          '&.weekly-compare.Mui-disabled': {
            color: '#FFFFFF',
            border: 0,
            '.MuiButton-icon': {
              margin: 0,
            },
          },
          '&.weekly-compare.MuiButton-outlined:not(.MuiButton-outlinedError):not(.Mui-disabled)': {
            border: 0,
            color: '#FFFFFF',
            '.MuiButton-icon': {
              margin: 0,
            },
          },
          '&.weekly.MuiButton-contained.Mui-disabled': {
            backgroundColor: '#F0F4F8',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'capitalize',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgb(var(--mui-palette-primary-mainChannel))',
            color: 'rgb(var(--mui-palette-primary-contrastTextChannel))',
            '&:hover': {
              backgroundColor: 'rgb(var(--mui-palette-primary-mainChannel))',
            },
            '& > .MuiListItemIcon-root': {
              color: 'rgb(var(--mui-palette-primary-contrastTextChannel))',
            },
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'var(--mui-palette-action-selected)',
            '&:hover': {
              backgroundColor: 'var(--mui-palette-action-selected)',
            },
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          backgroundColor: '#F1F4FB',
          '&:hover': {
            backgroundColor: '#103A64',
            color: '#FFFFFF',
            '& .MuiTypography-root': { color: '#FFFFFF' },
            '& .MuiSvgIcon-root': { color: '#FFFFFF' },
            '& .MuiIconButton-root': { color: '#FFFFFF' },
            '& button': { color: '#FFFFFF' },
            '& label': { color: '#FFFFFF' },
          },
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          '&.Mui-active': {
            color: '#0E94FA',
            fontWeight: 'bold',
          },
        },
      },
    },
  },
})

export default theme
