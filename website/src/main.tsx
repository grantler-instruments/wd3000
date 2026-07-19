import { CssBaseline, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WebsiteApp } from "./WebsiteApp";
import { websiteTheme } from "./theme";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={websiteTheme}>
      <CssBaseline />
      <BrowserRouter basename={basename}>
        <WebsiteApp />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
