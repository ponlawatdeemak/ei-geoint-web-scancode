'use client'
import { createTheme, responsiveFontSizes } from '@mui/material/styles'
declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: true // removes default breakpoints if you don't want them
    sm: true
    md: true
    lg: true
    xl: true
    '2k': true
    '4k': true
  }
}

let theme = createTheme({
  cssVariables: true,
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2k': 2160,
      '4k': 3840,
    },
  },
  typography: {
    fontFamily: 'var(--font)',
    htmlFontSize: 16,
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

const isSafari = navigator?.userAgent?.includes('Safari') && !navigator?.userAgent?.includes('Chrome')

theme = createTheme(theme, {
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        svg: {
          [theme.breakpoints.up('2k')]: {
            fontSize: isSafari ? '0.8rem !important' : '1.5rem',
          },
          //   [theme.breakpoints.up('4k')]: {
          //     fontSize: '1.5rem !important',
          //   },
        },
        html: {
          [theme.breakpoints.up('2k')]: {
            fontSize: '150%',
          },
          [theme.breakpoints.up('4k')]: {
            fontSize: '200%',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          [theme.breakpoints.up('2k')]: {
            height: '1.5rem',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 4, // Mobile default
          [theme.breakpoints.up('2k')]: {
            borderRadius: 6, // Desktop expansion
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          [theme.breakpoints.up('2k')]: {
            minWidth: 96,
            padding: '9px 24px',
          },
        },
        startIcon: {
          [theme.breakpoints.up('2k')]: {
            '& > *:nth-of-type(1)': {
              fontSize: '1.5rem !important',
            },
          },
        },
      },
    },
    MuiDialogPaper: {
      styleOverrides: {
        root: {
          [theme.breakpoints.up('2k')]: {
            maxWidth: '1024px',
          },
        },
        paper: {
          [theme.breakpoints.up('2k')]: {
            maxWidth: '1024px',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          [theme.breakpoints.up('2k')]: {
            padding: '24px 36px',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          [theme.breakpoints.up('2k')]: {
            padding: 12,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          [theme.breakpoints.up('2k')]: {
            padding: '9px 24px',
          },
        },
      },
    },
    MuiDateCalendar: {
      styleOverrides: {
        root: {
          [theme.breakpoints.up('2k')]: {
            width: '15rem',
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '.MuiInputAdornment-root': {
            maxHeight: '1em !important',
          },
        },
      },
    },
  },
})

export default responsiveFontSizes(theme)
