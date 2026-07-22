import { darkTheme } from "@grantler-instruments/mui-theme";
import { createTheme } from "@mui/material/styles";

/** Disable mobile/browser auto-capitalization and CSS uppercasing on inputs. */
const textInputDefaults = {
  MuiTextField: {
    defaultProps: {
      slotProps: {
        htmlInput: {
          autoCapitalize: "off",
          autoCorrect: "off",
          spellCheck: false,
        },
      },
    },
  },
  MuiInputBase: {
    styleOverrides: {
      input: {
        textTransform: "none" as const,
      },
    },
  },
};

export const settingsTheme = createTheme(darkTheme, {
  components: {
    ...textInputDefaults,
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
        label: {
          textTransform: "none",
        },
      },
    },
  },
});

export const playTheme = createTheme(darkTheme, {
  typography: {
    subtitle2: {
      fontSize: "1rem",
      fontWeight: 600,
    },
  },
  components: {
    ...textInputDefaults,
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
