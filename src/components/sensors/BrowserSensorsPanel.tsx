import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isMobileBrowserDevice } from "../../lib/platform";
import { useBrowserSensors } from "../../lib/sensors/browser";
import { useBrowserSensorOutput } from "../../lib/sensors/osc";
import { useAppStore } from "../../store/useAppStore";
import { SensorAxisMappingEditor } from "./SensorAxisMappingEditor";
import { SensorCard } from "./SensorCard";

const ORIENTATION_SENSOR_ID = "device_orientation";
const MOTION_SENSOR_ID = "device_motion";

export function BrowserSensorsPanel() {
  const { t } = useTranslation();
  const mobileBrowser = isMobileBrowserDevice();
  const performerIo = useAppStore((state) => state.performerIo);
  const sensorMappings = useAppStore((state) => state.sensorMappings);
  const {
    support,
    permission,
    requestPermission,
    orientation,
    motion,
    active,
  } = useBrowserSensors(mobileBrowser);

  const browserReadings = useMemo(
    () => [
      { sensorId: ORIENTATION_SENSOR_ID, axis: "alpha", value: orientation.alpha },
      { sensorId: ORIENTATION_SENSOR_ID, axis: "beta", value: orientation.beta },
      { sensorId: ORIENTATION_SENSOR_ID, axis: "gamma", value: orientation.gamma },
      {
        sensorId: ORIENTATION_SENSOR_ID,
        axis: "absolute",
        value: orientation.absolute ? 1 : 0,
      },
      { sensorId: MOTION_SENSOR_ID, axis: "acceleration_x", value: motion.acceleration.x },
      { sensorId: MOTION_SENSOR_ID, axis: "acceleration_y", value: motion.acceleration.y },
      { sensorId: MOTION_SENSOR_ID, axis: "acceleration_z", value: motion.acceleration.z },
      {
        sensorId: MOTION_SENSOR_ID,
        axis: "gravity_x",
        value: motion.accelerationIncludingGravity.x,
      },
      {
        sensorId: MOTION_SENSOR_ID,
        axis: "gravity_y",
        value: motion.accelerationIncludingGravity.y,
      },
      {
        sensorId: MOTION_SENSOR_ID,
        axis: "gravity_z",
        value: motion.accelerationIncludingGravity.z,
      },
      { sensorId: MOTION_SENSOR_ID, axis: "rotation_alpha", value: motion.rotationRate.alpha },
      { sensorId: MOTION_SENSOR_ID, axis: "rotation_beta", value: motion.rotationRate.beta },
      { sensorId: MOTION_SENSOR_ID, axis: "rotation_gamma", value: motion.rotationRate.gamma },
    ],
    [motion, orientation],
  );

  useBrowserSensorOutput(active, performerIo, sensorMappings, browserReadings);

  const requiresGesturePermission =
    (typeof DeviceOrientationEvent !== "undefined" &&
      "requestPermission" in DeviceOrientationEvent) ||
    (typeof DeviceMotionEvent !== "undefined" &&
      "requestPermission" in DeviceMotionEvent);

  const needsPermission =
    permission === "unknown" ||
    permission === "denied" ||
    (requiresGesturePermission && permission !== "granted");

  if (!mobileBrowser) {
    return (
      <Stack spacing={3} sx={{ maxWidth: 720 }}>
        <Alert severity="info">{t("sensors.mobileOnlyHint")}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {t("sensors.browserWebApisIntro")}
        </Typography>
      </Box>

      {needsPermission ? (
        <Alert
          severity={permission === "denied" ? "warning" : "info"}
          action={
            <Button color="inherit" size="small" onClick={() => void requestPermission()}>
              {t("common.enable")}
            </Button>
          }
        >
          {permission === "denied"
            ? t("sensors.permissionDenied")
            : t("sensors.browserIntro")}
        </Alert>
      ) : null}

      {!support.orientation && !support.motion ? (
        <Alert severity="info">{t("sensors.noBrowserSensors")}</Alert>
      ) : null}

      {support.orientation ? (
        <SensorCard
          title={t("sensors.deviceOrientation")}
          description={t("sensors.deviceOrientationDescription")}
        >
          <SensorAxisMappingEditor
            sensorId={ORIENTATION_SENSOR_ID}
            axis="alpha"
            value={orientation.alpha}
            unit="°"
          />
          <SensorAxisMappingEditor
            sensorId={ORIENTATION_SENSOR_ID}
            axis="beta"
            value={orientation.beta}
            unit="°"
          />
          <SensorAxisMappingEditor
            sensorId={ORIENTATION_SENSOR_ID}
            axis="gamma"
            value={orientation.gamma}
            unit="°"
          />
          <SensorAxisMappingEditor
            sensorId={ORIENTATION_SENSOR_ID}
            axis="absolute"
            value={orientation.absolute ? 1 : 0}
          />
        </SensorCard>
      ) : null}

      {support.motion ? (
        <SensorCard
          title={t("sensors.deviceMotion")}
          description={t("sensors.deviceMotionDescription")}
        >
          <Typography variant="caption" color="text.secondary">
            {t("sensors.acceleration")}
          </Typography>
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="acceleration_x"
            value={motion.acceleration.x}
          />
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="acceleration_y"
            value={motion.acceleration.y}
          />
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="acceleration_z"
            value={motion.acceleration.z}
          />
          <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
            {t("sensors.includingGravity")}
          </Typography>
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="gravity_x"
            value={motion.accelerationIncludingGravity.x}
          />
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="gravity_y"
            value={motion.accelerationIncludingGravity.y}
          />
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="gravity_z"
            value={motion.accelerationIncludingGravity.z}
          />
          <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
            {t("sensors.rotationRate")}
          </Typography>
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="rotation_alpha"
            value={motion.rotationRate.alpha}
          />
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="rotation_beta"
            value={motion.rotationRate.beta}
          />
          <SensorAxisMappingEditor
            sensorId={MOTION_SENSOR_ID}
            axis="rotation_gamma"
            value={motion.rotationRate.gamma}
          />
        </SensorCard>
      ) : null}

      {active ? (
        <Typography variant="caption" color="text.secondary">
          {t("sensors.liveUpdatingBrowser")}
        </Typography>
      ) : null}
    </Stack>
  );
}
