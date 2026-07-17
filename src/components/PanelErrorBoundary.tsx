import { Alert, Box, Typography } from "@mui/material";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface PanelErrorBoundaryProps {
  children: ReactNode;
  title?: string;
}

interface PanelErrorBoundaryState {
  error: Error | null;
}

export class PanelErrorBoundary extends Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Panel failed to render:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 3, width: "100%" }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {this.props.title ?? "This panel failed to render."}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
            {this.state.error.message}
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}
