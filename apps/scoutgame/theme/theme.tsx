'use client';

import { createTheme, responsiveFontSizes } from '@mui/material';
import { Inter } from 'next/font/google';

import {
  backgroundColorDarkMode,
  backgroundLightColorDarkMode,
  brandColor,
  disabledTextColorDarkMode,
  inputBackgroundDarkMode,
  inputBorderDarkMode,
  primaryTextColorDarkMode,
  purpleDisabled,
  secondaryText,
  secondaryLightText,
  blackText
} from './colors';

const interFont = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const themeOptions: Parameters<typeof createTheme>[0] = {
  typography: {
    fontFamily: interFont.style.fontFamily,
    button: {
      fontWeight: 600,
      fontSize: '1rem'
    }
  },
  cssVariables: true,
  defaultColorScheme: 'dark',
  colorSchemes: {
    light: {
      // light mode is the same as dark mode
      palette: {
        background: {
          default: backgroundColorDarkMode,
          paper: backgroundLightColorDarkMode
        },
        text: {
          disabled: disabledTextColorDarkMode,
          primary: primaryTextColorDarkMode,
          secondary: secondaryText
        },
        primary: {
          main: brandColor,
          dark: purpleDisabled
        },
        secondary: {
          main: secondaryText,
          light: secondaryLightText
        },
        inputBackground: {
          main: inputBackgroundDarkMode
        },
        black: {
          main: blackText
        }
      }
    },
    dark: {
      // palette for dark mode
      palette: {
        background: {
          default: backgroundColorDarkMode,
          paper: backgroundLightColorDarkMode
        },
        text: {
          primary: primaryTextColorDarkMode,
          secondary: secondaryText,
          disabled: disabledTextColorDarkMode
          // black: blackText
        },
        primary: {
          main: brandColor,
          dark: purpleDisabled
        },
        secondary: {
          main: secondaryText,
          light: secondaryLightText
        },
        inputBackground: {
          main: inputBackgroundDarkMode
        },
        black: {
          main: blackText
        }
      }
    }
  },
  components: {
    MuiPopover: {
      defaultProps: {
        disableRestoreFocus: true
      }
    },
    MuiFormLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          marginBottom: 5
        })
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState?.variant === 'rounded' && {
            borderRadius: 10
          }),
          fontWeight: 500
        })
      }
    },
    MuiAutocomplete: {
      defaultProps: {
        blurOnSelect: 'touch'
      },
      styleOverrides: {
        popper: {
          zIndex: '1050'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.default,
          boxShadow: 'none',
          paddingTop: 1,
          paddingBottom: 1
        })
      }
    },
    MuiPaper: {
      styleOverrides: {
        // Disable the lightening of the background when elevation is applied
        // source: https://mui.com/material-ui/react-paper/
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true
      }
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: brandColor
        }
      }
    },
    MuiButtonGroup: {
      defaultProps: {
        disableRipple: true,
        disableElevation: true
      },
      styleOverrides: {
        groupedContained: {
          '&:not(:last-child)': {
            borderRightColor: 'rgba(0, 0, 0 / 0.2)'
          }
        }
      }
    },
    MuiButton: {
      defaultProps: {
        variant: 'contained',
        disableElevation: true
      },
      variants: [
        {
          props: { variant: 'gradient' },
          style: ({ theme }) => ({
            background: 'linear-gradient(90deg, #69DDFF 0%,#A06CD5 100%)',
            borderRadius: '20px',
            paddingTop: 2,
            paddingBottom: 2,
            paddingRight: 1,
            paddingLeft: 1,
            fontSize: '0.9rem',
            fontWeight: '500'
            // '&:hover': {
            //   backgroundColor: 'darkpurple'
            // }
          })
        }
      ],
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          fontSize: '1rem',
          textTransform: 'none',
          paddingTop: '14px',
          paddingBottom: '14px'
        }
      }
    },
    MuiMenuItem: {
      defaultProps: {
        dense: true
      }
    },
    MuiTypography: {
      defaultProps: {
        color: 'text.primary'
      }
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
        enterDelay: 1000,
        placement: 'top'
      }
    },
    MuiCard: {
      defaultProps: {
        variant: 'outlined'
      },
      styleOverrides: {
        root: ({ theme }) => ({
          boxShadow: theme.shadows[2]
        })
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          '&:last-child': {
            paddingBottom: 16
          }
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          // this makes the text look lighter
          MozOsxFontSmoothing: 'none'
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          fontSize: 'inherit',
          minWidth: '30px !important'
        }
      }
    },
    MuiInput: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          transform: 'scale(1, 1)'
        }
      }
    },
    MuiOutlinedInput: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: inputBackgroundDarkMode,
          ...theme.applyStyles('dark', {
            '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
              borderColor: inputBorderDarkMode
            }
          })
        }),
        notchedOutline: ({ theme }) => ({
          ...theme.applyStyles('dark', {
            borderColor: inputBorderDarkMode
          })
        })
      }
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 0
        }
      }
    },
    MuiSelect: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 0,
          textTransform: 'none'
        }
      }
    },
    MuiLink: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.main,
          '&:hover': {
            color: theme.palette.primary.dark
          },
          fontFamily: interFont.style.fontFamily
        })
      },
      defaultProps: {
        underline: 'none'
      }
    }
  }
};

const createdTheme = createTheme(themeOptions);

export default responsiveFontSizes(createdTheme) as typeof createdTheme;
