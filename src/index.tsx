import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { createTheme, ThemeProvider, responsiveFontSizes } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// 커스텀 테마 생성
let theme = createTheme({
  palette: {
    primary: {
      main: '#3B4BDD',
      light: '#4E5DE5',
      dark: '#2C3AB8',
      contrastText: '#fff',
    },
    secondary: {
      main: '#21D07B',
      light: '#45E697',
      dark: '#18A862',
      contrastText: '#fff',
    },
    error: {
      main: '#FF5B5B',
    },
    warning: {
      main: '#FFB954',
    },
    info: {
      main: '#2196F3',
    },
    success: {
      main: '#21D07B',
    },
    background: {
      default: '#f9fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#6c757d',
    },
  },
  typography: {
    fontFamily: '"Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          textTransform: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          borderRadius: '8px',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
        elevation2: {
          boxShadow: '0 1px 5px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
        },
        elevation3: {
          boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
        },
        elevation4: {
          boxShadow: '0 8px 10px rgba(0,0,0,0.1), 0 3px 5px rgba(0,0,0,0.07)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3B4BDD',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5f7fa',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: '#495057',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(59, 75, 221, 0.04)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
  },
});

// 반응형 폰트 사이즈 적용
theme = responsiveFontSizes(theme);

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
); 