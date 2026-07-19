import BugReportIcon from "@mui/icons-material/BugReport";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatShortcutKey, isMobileBrowserDevice, isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import type { DebuggerSubView, PerformerSubView } from "../types";
import { GrantlerLogo } from "./GrantlerLogo";

const PERFORMER_ITEMS: { value: PerformerSubView; labelKey: string }[] = [
  { value: "ui", labelKey: "home.ui" },
  { value: "sensors", labelKey: "home.sensors" },
  { value: "mediapipe", labelKey: "home.mediapipe" },
];

const NATIVE_ONLY_DEBUGGER = new Set<DebuggerSubView>(["midi", "osc", "tuio", "artnet"]);

const DEBUGGER_ITEMS: { value: DebuggerSubView; labelKey: string }[] = [
  { value: "midi", labelKey: "protocols.midi" },
  { value: "osc", labelKey: "protocols.osc" },
  { value: "tuio", labelKey: "protocols.tuio" },
  { value: "artnet", labelKey: "protocols.artnet" },
  { value: "mqtt", labelKey: "protocols.mqtt" },
];

function HomeSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        {icon}
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

function HomeNavGrid({
  columns,
  children,
}: {
  columns: { xs?: number; sm?: number };
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: `repeat(${columns.xs ?? columns.sm ?? 1}, minmax(0, 1fr))`,
          sm: `repeat(${columns.sm ?? columns.xs ?? 1}, minmax(0, 1fr))`,
        },
        gap: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

function HomeNavButton({
  label,
  onClick,
  disabled = false,
  disabledTooltip,
  infoTooltip,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
  infoTooltip?: string;
}) {
  const button = (
    <Button
      variant="outlined"
      onClick={onClick}
      disabled={disabled}
      fullWidth
      sx={{
        minWidth: 0,
        px: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {infoTooltip ? (
        <Tooltip title={infoTooltip}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              ml: 0.75,
              verticalAlign: "middle",
              pointerEvents: "auto",
            }}
            onClick={(event) => event.stopPropagation()}
            aria-label={infoTooltip}
          >
            <InfoOutlinedIcon fontSize="small" color="action" />
          </Box>
        </Tooltip>
      ) : null}
    </Button>
  );

  if (!disabled || !disabledTooltip) {
    return button;
  }

  return (
    <Tooltip title={disabledTooltip}>
      <Box component="span" sx={{ display: "block", width: "100%" }}>
        {button}
      </Box>
    </Tooltip>
  );
}

export function HomePage({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t } = useTranslation();
  const setActiveView = useAppStore((state) => state.setActiveView);
  const nativeApp = isNativeApp();
  const sensorsMobileOnlyHint =
    !nativeApp && !isMobileBrowserDevice() ? t("sensors.mobileOnlyHint") : undefined;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        overflow: "auto",
      }}
    >
      <Stack
        spacing={5}
        sx={{
          width: "100%",
          maxWidth: 720,
          alignItems: "center",
        }}
      >
        <GrantlerLogo height={56} />

        <Stack spacing={4} sx={{ width: "100%" }}>
          <HomeSection
            icon={<DashboardIcon fontSize="small" color="action" />}
            title={t("home.performer")}
          >
            <HomeNavGrid columns={{ xs: 1, sm: 3 }}>
              {PERFORMER_ITEMS.map((item) => (
                <HomeNavButton
                  key={item.value}
                  label={t(item.labelKey)}
                  onClick={() => setActiveView("performer", item.value)}
                  infoTooltip={item.value === "sensors" ? sensorsMobileOnlyHint : undefined}
                />
              ))}
            </HomeNavGrid>
          </HomeSection>

          <HomeSection
            icon={<BugReportIcon fontSize="small" color="action" />}
            title={t("home.debugger")}
          >
            <HomeNavGrid columns={{ xs: 1, sm: 5 }}>
              {DEBUGGER_ITEMS.map((item) => {
                const nativeOnly = !nativeApp && NATIVE_ONLY_DEBUGGER.has(item.value);
                return (
                  <HomeNavButton
                    key={item.value}
                    label={t(item.labelKey)}
                    onClick={() => setActiveView("debugger", item.value)}
                    disabled={nativeOnly}
                    disabledTooltip={
                      nativeOnly
                        ? t("monitor.nativeOnly", {
                            protocol: t(item.labelKey),
                          })
                        : undefined
                    }
                  />
                );
              })}
            </HomeNavGrid>
          </HomeSection>

          <HomeSection
            icon={<SettingsIcon fontSize="small" color="action" />}
            title={t("home.settings")}
          >
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={onOpenSettings}
              aria-label={`${t("home.settings")} (${formatShortcutKey(",")})`}
              sx={{ minWidth: 160 }}
            >
              {t("home.settings")} ({formatShortcutKey(",")})
            </Button>
          </HomeSection>
        </Stack>
      </Stack>
    </Box>
  );
}
