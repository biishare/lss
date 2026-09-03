"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: {
      main: "#185c54",
      dark: "#124a44",
      light: "#e9f6f3",
    },
    secondary: {
      main: "#2867d8",
    },
    background: {
      default: "#f4f7f8",
      paper: "#ffffff",
    },
    error: {
      main: "#be123c",
    },
    warning: {
      main: "#92400e",
    },
    success: {
      main: "#047857",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, Helvetica, sans-serif',
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 44,
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        fullWidth: true,
        maxWidth: "sm",
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        fullWidth: true,
      },
    },
  },
});

export default theme;
