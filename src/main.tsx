import { CssBaseline, GlobalStyles, ThemeProvider } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import { settingsTheme } from "./theme";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={settingsTheme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          html: { height: "100%", width: "100%" },
          body: { height: "100%", width: "100%", margin: 0, overflow: "hidden" },
          "#root": { height: "100%", width: "100%" },
          "input, textarea": { textTransform: "none" },
        }}
      />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
