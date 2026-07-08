import { Alert } from "@mui/material";
import { isNativeApp } from "../lib/platform";

interface NativeOnlyAlertProps {
  protocol: string;
}

export function NativeOnlyAlert({ protocol }: NativeOnlyAlertProps) {
  if (isNativeApp()) {
    return null;
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      {protocol} is only available in the desktop and mobile apps.
    </Alert>
  );
}
