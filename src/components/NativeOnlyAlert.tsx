import { Alert } from "@mui/material";
import { useTranslation } from "react-i18next";
import { canUseEnttecPro } from "../lib/enttec-pro";
import { isNativeApp } from "../lib/platform";
import { canUseDeemex } from "../lib/send-deemex-dmx";

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

  if (protocol === "artnet" && (canUseEnttecPro() || canUseDeemex())) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {t("monitor.artNetBrowserHint")}
      </Alert>
    );
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      {t("monitor.nativeOnly", { protocol: t(`protocols.${protocol}`) })}
    </Alert>
  );
}
