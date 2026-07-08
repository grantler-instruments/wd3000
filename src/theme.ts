import { darkTheme } from "@grantler-instruments/mui-theme";
import { createTheme } from "@mui/material/styles";

export const settingsTheme = darkTheme;

export const playTheme = createTheme(darkTheme, {
  typography: {
    subtitle2: {
      fontSize: "1rem",
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        size: "large",
      },
      styleOverrides: {
        root: {
          minHeight: 72,
          fontSize: "1.125rem",
          borderRadius: 12,
          textTransform: "none",
        },
        contained: {
          boxShadow: "none",
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          padding: "24px 0",
        },
        rail: {
          height: 10,
          borderRadius: 5,
          opacity: 0.35,
        },
        track: {
          height: 10,
          borderRadius: 5,
        },
        thumb: {
          width: 32,
          height: 32,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});
