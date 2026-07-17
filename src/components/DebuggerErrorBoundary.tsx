import { Alert, Box, Typography } from "@mui/material";
import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "../i18n";

interface DebuggerErrorBoundaryProps {
  children: ReactNode;
}

interface DebuggerErrorBoundaryState {
  error: Error | null;
}

export class DebuggerErrorBoundary extends Component<
  DebuggerErrorBoundaryProps,
  DebuggerErrorBoundaryState
> {
  state: DebuggerErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Debugger failed to render:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {i18n.t("monitor.debuggerFailed")}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {this.state.error.message}
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}
