import { Alert } from "@mui/material";
import { useTranslation } from "react-i18next";
import { isNativeApp } from "../lib/platform";

interface NativeOnlyAlertProps {
  protocol: "midi" | "osc" | "mqtt" | "tuio" | "artnet";
}

export function NativeOnlyAlert({ protocol }: NativeOnlyAlertProps) {
  const { t } = useTranslation();

  if (isNativeApp()) {
    return null;
  }

  if (protocol === "mqtt") {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {t("monitor.mqttBrowserHint")}
      </Alert>
    );
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      {t("monitor.nativeOnly", { protocol: t(`protocols.${protocol}`) })}
    </Alert>
  );
}
