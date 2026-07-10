import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useBrowserSensors } from "../../lib/sensors/browser";
import { useBrowserSensorOutput } from "../../lib/sensors/osc";
import { useAppStore } from "../../store/useAppStore";
import { SensorAxisMappingEditor } from "./SensorAxisMappingEditor";
import { SensorCard } from "./SensorCard";

const ORIENTATION_SENSOR_ID = "device_orientation";
const MOTION_SENSOR_ID = "device_motion";

export function BrowserSensorsPanel() {
  const performerIo = useAppStore((state) => state.performerIo);
  const sensorMappings = useAppStore((state) => state.sensorMappings);
  const {
    support,
    permission,
    requestPermission,
    orientation,
    motion,
    active,
  } = useBrowserSensors(true);

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

  const needsPermission =
    permission === "unknown" ||
    permission === "denied" ||
    (typeof DeviceOrientationEvent !== "undefined" &&
      "requestPermission" in DeviceOrientationEvent &&
      permission !== "granted");

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Uses Web APIs available in the current browser. On phones and tablets this
          typically includes device orientation and motion; on desktop browsers support
          varies.
        </Typography>
      </Box>

      {needsPermission ? (
        <Alert
          severity={permission === "denied" ? "warning" : "info"}
          action={
            <Button color="inherit" size="small" onClick={() => void requestPermission()}>
              Enable
            </Button>
          }
        >
          {permission === "denied"
            ? "Sensor permission was denied. Enable it in browser settings to continue."
            : "This browser may require permission before motion and orientation sensors work."}
        </Alert>
      ) : null}

      {!support.orientation && !support.motion ? (
        <Alert severity="info">
          No motion or orientation APIs are available in this browser.
        </Alert>
      ) : null}

      {support.orientation ? (
        <SensorCard
          title="Device orientation"
          description="Alpha, beta, and gamma angles relative to the device frame."
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
          title="Device motion"
          description="Linear acceleration and rotation rate from the device IMU."
        >
          <Typography variant="caption" color="text.secondary">
            Acceleration (m/s²)
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
            Including gravity (m/s²)
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
            Rotation rate (°/s)
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
          Live readings are updating from the browser.
        </Typography>
      ) : null}
    </Stack>
  );
}
